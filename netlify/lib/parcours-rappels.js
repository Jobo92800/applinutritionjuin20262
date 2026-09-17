/*
  Rappel aux clientes silencieuses.

  Une fois par jour (appelé par scheduled-push à l'heure choisie), on cherche
  les clientes qui ont un parcours en cours, qui l'ont déjà ouvert ici, et
  qui n'y ont pas touché depuis SILENCE_JOURS. Chacune reçoit une notification
  avec le titre de l'étape qui l'attend — au plus une fois par semaine.

  Ce qu'on ne rappelle jamais :
  - une cliente qui n'a jamais ouvert son parcours dans cette application
    (les comptes importés de Mon Parcours, tant qu'elles écoutent là-bas) ;
  - une cliente suspendue, ou qui a tout terminé ;
  - une cliente déjà rappelée dans la semaine.
*/
import { db, CURES, etapesDeLaCure, notifierCliente, journaliser } from './parcours-core.js';

export const SILENCE_JOURS = 7;
export const HEURE_RAPPEL = 18;   // heure de Paris

export async function rappelsParcours(maintenant = new Date()) {
  const depuis = new Date(maintenant.getTime() - SILENCE_JOURS * 86400000).toISOString();
  const bilan = { examinees: 0, rappelees: 0, detail: [] };

  const profils = await db.lire(
    'profiles',
    'select=id,name,subscription_tier,parcours_statut,parcours_debloque_manuel&parcours_statut=eq.actif&limit=2000'
  );
  const clientes = profils.filter((p) => CURES[p.subscription_tier]);
  if (!clientes.length) return bilan;

  // Trois lectures groupées plutôt qu'une par cliente.
  const progressions = await db.lire('parcours_progression', 'select=user_id,podcast_id,terminee,updated_at');
  const journalRecent = await db.lire(
    'parcours_acces_log',
    `select=user_id,action,created_at&created_at=gte.${depuis}&action=in.(ouverture,rappel-parcours)`
  );
  const dejaOuvert = new Set(
    (await db.lire('parcours_acces_log', 'select=user_id&action=eq.ouverture&limit=10000')).map((l) => l.user_id)
  );
  const abonnes = new Set((await db.lire('push_subscriptions', 'select=user_id')).map((s) => s.user_id));

  const parCliente = {};
  for (const p of progressions) (parCliente[p.user_id] ||= []).push(p);
  const actifsRecemment = new Set(journalRecent.filter((l) => l.action === 'ouverture').map((l) => l.user_id));
  const rappelesRecemment = new Set(journalRecent.filter((l) => l.action === 'rappel-parcours').map((l) => l.user_id));
  const etapesParCure = {};

  for (const c of clientes) {
    bilan.examinees++;
    if (!abonnes.has(c.id) || !dejaOuvert.has(c.id)) continue;
    if (actifsRecemment.has(c.id) || rappelesRecemment.has(c.id)) continue;

    const siennes = parCliente[c.id] || [];
    if (siennes.some((p) => String(p.updated_at || '') >= depuis)) continue;

    etapesParCure[c.subscription_tier] ||= await etapesDeLaCure(c.subscription_tier);
    const etapes = etapesParCure[c.subscription_tier];
    const terminees = new Set(siennes.filter((p) => p.terminee).map((p) => p.podcast_id));
    let dispo = etapes.findIndex((e) => !terminees.has(e.id));
    if (dispo === -1) continue;                       // tout est terminé
    dispo = Math.max(dispo, Math.min(c.parcours_debloque_manuel || 0, etapes.length - 1));
    const etape = etapes[dispo];
    const minutes = etape.duration ? ` (${Math.max(1, Math.round(etape.duration / 60))} min)` : '';

    const r = await notifierCliente(c.id, {
      title: 'Votre parcours vous attend',
      body: `L'étape ${dispo + 1}, « ${etape.title} »${minutes}, est prête. Quelques minutes pour reprendre le fil.`,
    });
    if (r.sent > 0) {
      bilan.rappelees++;
      bilan.detail.push({ userId: c.id, etape: dispo + 1 });
      await journaliser('rappel-parcours', { userId: c.id, detail: `étape ${dispo + 1}` });
    }
  }
  return bilan;
}

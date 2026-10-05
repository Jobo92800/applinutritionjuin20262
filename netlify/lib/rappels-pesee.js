/*
  Le rappel du jour de pesée.

  « Choisissez un jour fixe hebdomadaire pour vous peser, le matin à jeun » :
  c'est la première consigne de l'introduction, le rituel autour duquel toute
  la méthode s'organise — et c'était le seul que l'application ne soutenait
  pas. Elle le demande maintenant (Compte), et le rappelle ce matin-là.

  Ce qu'on ne rappelle jamais :
  - une cliente qui n'a pas choisi de jour : elle n'a rien demandé ;
  - une cliente qui s'est **déjà pesée aujourd'hui** — le rappel arriverait
    après coup, et donnerait le sentiment de ne pas être suivie ;
  - une cliente suspendue, ou qui n'est pas abonnée aux notifications ;
  - une cliente déjà rappelée dans les six derniers jours, quoi qu'il arrive.
*/
import { db, notifierCliente, journaliser } from './parcours-core.js';

/** 8 h, heure de Paris : au lever, avant le petit-déjeuner. */
export const HEURE_PESEE = 8;

/** Au-delà, on ne redemande pas : un rappel par semaine, pas plus. */
export const SILENCE_JOURS = 6;

const jour = (d) => new Date(d).toISOString().slice(0, 10);

/**
 * `jourIso` : 1 = lundi … 7 = dimanche. `dateDuJour` : la date à Paris.
 * Les deux sont passés par l'appelant, qui seul connaît l'heure de Paris.
 */
export async function rappelsPesee(jourIso, dateDuJour, maintenant = new Date()) {
  const bilan = { examinees: 0, rappelees: 0, detail: [] };
  if (!jourIso) return bilan;

  const profils = await db.lire(
    'profiles',
    `select=id,name,jour_pesee,parcours_statut&jour_pesee=eq.${jourIso}&limit=2000`
  );
  const clientes = profils.filter((p) => p.parcours_statut !== 'suspendu');
  if (!clientes.length) return bilan;

  const ids = clientes.map((p) => p.id);
  const abonnes = new Set(
    (await db.lire('push_subscriptions', `select=user_id&user_id=in.(${ids.join(',')})`)).map((s) => s.user_id)
  );

  // Les pesées du jour : celles qui l'ont déjà fait n'ont rien à recevoir.
  const dejaPesees = new Set(
    (await db.lire('weight_entries', `select=user_id&user_id=in.(${ids.join(',')})&date=eq.${dateDuJour}`))
      .map((w) => w.user_id)
  );

  const depuis = new Date(maintenant.getTime() - SILENCE_JOURS * 86400000).toISOString();
  const dejaRappelees = new Set(
    (await db.lire(
      'parcours_acces_log',
      `select=user_id&action=eq.rappel-pesee&created_at=gte.${depuis}&user_id=in.(${ids.join(',')})`
    )).map((l) => l.user_id)
  );

  for (const c of clientes) {
    bilan.examinees++;
    if (!abonnes.has(c.id)) continue;
    if (dejaPesees.has(c.id)) continue;
    if (dejaRappelees.has(c.id)) continue;

    const r = await notifierCliente(c.id, {
      title: 'C’est votre jour de pesée',
      body: 'Ce matin, à jeun, avant le petit-déjeuner. Quelques secondes, et votre courbe reste juste.',
      url: '/?page=progress',
      tag: 'pesee',
    });
    if (r.sent > 0) {
      bilan.rappelees++;
      bilan.detail.push({ userId: c.id });
      await journaliser('rappel-pesee', { userId: c.id, detail: jour(maintenant) });
    }
  }
  return bilan;
}

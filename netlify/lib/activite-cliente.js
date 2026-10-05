/*
  Ce que la cliente fait dans son application, pour la thérapeute.

  La V2 lit déjà le BioPortrait et les séances — mais elle ne sait rien de ce
  qui se passe entre deux rendez-vous. Une thérapeute accueille sa cliente
  pour la séance 6 sans savoir qu'elle a arrêté le parcours à l'étape 2 ou
  qu'elle ne s'est pas pesée depuis trois semaines. Ce module répond à ça, en
  lecture seule, et seulement sur ce qui change une consultation :

    - est-elle revenue dans l'application, et quand ;
    - où elle en est du parcours, et depuis quand elle n'a plus écouté ;
    - ses pesées à elle (celles du centre, la V2 les a déjà) ;
    - ses objectifs de la semaine ;
    - a-t-elle planifié ses repas.

  Ce qui n'y est PAS, volontairement : ses messages — ils ont leur écran — et
  ses photos de repas, qui ne regardent qu'elle.
*/
import { db, CURES, etapesDeLaCure, indexDisponible } from './parcours-core.js';

/** Les quatre objectifs quotidiens, tels que l'application les propose. */
export const OBJECTIFS_QUOTIDIENS = ['supplements', 'water', 'podcast', 'homecooking'];

const jour = (d) => new Date(d).toISOString().slice(0, 10);

/** Le lundi de la semaine d'une date, au format AAAA-MM-JJ. */
export function lundiDe(date = new Date()) {
  const d = new Date(date);
  const decalage = (d.getDay() + 6) % 7;        // 0 = lundi
  d.setDate(d.getDate() - decalage);
  return jour(d);
}

/**
 * Les jours où les quatre objectifs sont cochés, sur les `fenetre` derniers
 * jours. On ne recalcule pas la série complète — l'algorithme vit côté
 * application — mais « 5 jours parfaits sur les 7 derniers » dit la même
 * chose à une thérapeute, et se calcule ici sans rien dupliquer.
 */
export function joursParfaits(progressions, fenetre = 7, aujourdhui = new Date()) {
  const depuis = new Date(aujourdhui);
  depuis.setDate(depuis.getDate() - (fenetre - 1));
  const limiteBasse = jour(depuis), limiteHaute = jour(aujourdhui);

  let compte = 0;
  for (const p of progressions) {
    for (let i = 0; i < 7; i++) {
      const d = new Date(p.week_start);
      d.setDate(d.getDate() + i);
      const cle = jour(d);
      if (cle < limiteBasse || cle > limiteHaute) continue;
      if (OBJECTIFS_QUOTIDIENS.every((g) => p.goals?.[g]?.completed?.[i] === true)) compte++;
    }
  }
  return compte;
}

/** Combien de cases cochées cette semaine, sur les 28 possibles (4 × 7). */
export function casesSemaine(progression) {
  if (!progression) return { cochees: 0, total: OBJECTIFS_QUOTIDIENS.length * 7 };
  let cochees = 0;
  for (const g of OBJECTIFS_QUOTIDIENS) {
    const fait = progression.goals?.[g]?.completed || [];
    cochees += fait.filter(Boolean).length;
  }
  return { cochees, total: OBJECTIFS_QUOTIDIENS.length * 7 };
}

const ilYACombienDeJours = (iso, maintenant) =>
  iso ? Math.floor((maintenant - new Date(iso)) / 86400000) : null;

/**
 * Tout ce que la thérapeute peut voir d'une cliente, par son adresse email.
 * Renvoie null quand aucun compte ne porte cette adresse — c'est le cas
 * normal d'une cliente qui n'a pas encore d'accès.
 */
export async function activiteCliente(email, maintenant = new Date()) {
  const propre = String(email || '').trim().toLowerCase();
  if (!propre) return null;

  const profil = await db.un(
    'profiles',
    `select=id,name,email,subscription_tier,parcours_statut,parcours_debloque_manuel,created_at&email=eq.${encodeURIComponent(propre)}`
  );
  if (!profil) return null;

  const cure = profil.subscription_tier;
  const [avancement, journal, pesees, semaines, repas] = await Promise.all([
    db.lire('parcours_progression', `select=podcast_id,terminee,taux,updated_at&user_id=eq.${profil.id}`),
    db.lire('parcours_acces_log', `select=action,created_at&user_id=eq.${profil.id}&action=in.(ouverture,rappel-parcours)&order=created_at.desc&limit=50`),
    db.lire('weight_entries', `select=weight,date&user_id=eq.${profil.id}&order=date.asc`),
    db.lire('weekly_progress', `select=week_start,goals&user_id=eq.${profil.id}&order=week_start.desc&limit=8`),
    db.lire('meal_plans', `select=date,meals&user_id=eq.${profil.id}&date=gte.${lundiDe(maintenant)}&limit=14`),
  ]);

  /* --- Le parcours ------------------------------------------------------- */
  let parcours = null;
  if (CURES[cure]) {
    const etapes = await etapesDeLaCure(cure);
    const terminees = new Set(avancement.filter((p) => p.terminee).map((p) => p.podcast_id));
    const dispo = indexDisponible(etapes, terminees, profil.parcours_debloque_manuel);
    const courante = etapes[dispo];
    const sienne = avancement.find((p) => p.podcast_id === courante?.id);
    const derniereEcoute = avancement.map((p) => p.updated_at).filter(Boolean).sort().pop() || null;
    parcours = {
      cure: CURES[cure],
      terminees: terminees.size,
      total: etapes.length,
      etapeEnCours: dispo + 1,
      titreEnCours: courante?.title || null,
      tauxEnCours: Math.round(Number(sienne?.taux || 0) * 100),
      derniereEcoute,
      joursDepuisEcoute: ilYACombienDeJours(derniereEcoute, maintenant),
    };
  }

  /* --- Les pesées qu'elle a saisies elle-même ---------------------------- */
  const premiere = pesees[0] || null;
  const derniere = pesees[pesees.length - 1] || null;
  const poids = {
    nombre: pesees.length,
    premier: premiere ? Number(premiere.weight) : null,
    premierLe: premiere?.date || null,
    dernier: derniere ? Number(derniere.weight) : null,
    dernierLe: derniere?.date || null,
    ecart: premiere && derniere ? Math.round((derniere.weight - premiere.weight) * 10) / 10 : null,
    joursDepuis: ilYACombienDeJours(derniere?.date, maintenant),
  };

  /* --- Les objectifs de la semaine --------------------------------------- */
  const lundi = lundiDe(maintenant);
  const objectifs = {
    ...casesSemaine(semaines.find((s) => s.week_start === lundi)),
    joursParfaits7: joursParfaits(semaines, 7, maintenant),
  };

  /* --- Les repas planifiés cette semaine --------------------------------- */
  const repasPlanifies = repas.reduce(
    (n, p) => n + Object.values(p.meals || {}).filter(Boolean).length, 0
  );

  const ouvertures = journal.filter((l) => l.action === 'ouverture');
  const derniereOuverture = ouvertures[0]?.created_at || null;

  return {
    prenom: profil.name,
    email: profil.email,
    statut: profil.parcours_statut,
    compteCreeLe: profil.created_at,
    /** Fausse tant que la cliente n'a jamais ouvert son parcours ici. */
    jamaisVenue: ouvertures.length === 0,
    derniereOuverture,
    joursDepuisOuverture: ilYACombienDeJours(derniereOuverture, maintenant),
    parcours,
    poids,
    objectifs,
    repas: { planifiesCetteSemaine: repasPlanifies, joursPlanifies: repas.length },
  };
}

/*
  Composer une semaine de repas en un geste.

  Remplir vingt et une cases à la main, personne ne le fait deux semaines de
  suite — le tableau de bord affiche « 0 repas planifiés » et la liste de
  courses reste vide. Cette proposition met un plat dans chaque case encore
  libre ; la cliente ajuste ensuite, case par case, comme avant.

  Trois principes :

  - **On ne remplace jamais rien.** Ce qu'elle a déjà posé reste intact.
  - **Ses préférences alimentaires ne se négocient pas.** La consigne de la
    semaine, elle, s'assouplit si elle ne laisse plus assez de choix : mieux
    vaut une semaine composée qu'une semaine vide.
  - **On évite les répétitions** tant qu'il reste des recettes non servies.
  - **Chaque chose à sa place.** Une case n'accueille qu'une recette de sa
    catégorie : un dessert va au dessert, une entrée à l'entrée. Quand rien
    ne convient, la case reste vide — avant, un dernier filet de sécurité
    lâchait la catégorie et pouvait poser un dessert en plat principal, ce
    qui est pire qu'une case vide.

  Règle pure — elle ne connaît que des objets, pas React ni Supabase —, donc
  vérifiée telle quelle par le banc d'essai. L'extension `.ts` de l'import est
  là pour que Node sache la résoudre ; Vite s'en accommode.
*/

import { cibleDuRepas, PART_DU_REPAS } from './cibleRepas.ts';

export interface RecetteCandidate {
  id: string;
  categories?: string[];
  dietaryPreferences?: string[];
  nutrition?: { calories?: number };
}

export interface Creneau {
  /** Jour au format AAAA-MM-JJ. */
  date: string;
  /** Le repas, tel que le calendrier le nomme : « déjeuner », « dîner »… */
  repas: string;
  /** Le sous-repas : « principal », « plat »… */
  sousRepas: string;
  /**
   * Les catégories acceptables pour cette case, de la plus précise à la plus
   * large : une case « plat » du déjeuner accepte « Déjeuner » comme
   * « Plat principal », selon la façon dont la recette a été rangée.
   */
  categories: string[];
}

export interface FiltresConsigne {
  preferences?: string[];
  categories?: string[];
  caloriesMax?: number;
}

export interface Proposition {
  /** Clé `date|repas_sousRepas`, telle que le calendrier la range. */
  cle: string;
  date: string;
  mealKey: string;
  recetteId: string;
}

const aLUneDesCategories = (r: RecetteCandidate, cats: string[]) =>
  cats.some((c) => (r.categories || []).includes(c));
const respecteSesPreferences = (r: RecetteCandidate, prefs: string[]) =>
  prefs.every((p) => (r.dietaryPreferences || []).includes(p));

function respecteLaConsigne(r: RecetteCandidate, f: FiltresConsigne): boolean {
  const prefs = f.preferences || [];
  if (prefs.length && !prefs.every((p) => (r.dietaryPreferences || []).includes(p))) return false;
  const cats = f.categories || [];
  if (cats.length && !cats.some((c) => (r.categories || []).includes(c))) return false;
  if (f.caloriesMax != null && (r.nutrition?.calories || 0) > f.caloriesMax) return false;
  return true;
}

/**
 * La proposition pour une semaine.
 *
 * `creneaux` ne contient que les cases **libres** — c'est à l'appelant de ne
 * pas proposer ce qui est déjà posé. Rend une entrée par case remplie ; une
 * case pour laquelle rien ne convient est simplement absente.
 */
export function composerLaSemaine({
  creneaux,
  recettes,
  caloriesJournee,
  preferences = [],
  consigne = {},
  dejaServies = [],
}: {
  creneaux: Creneau[];
  recettes: RecetteCandidate[];
  caloriesJournee: number;
  preferences?: string[];
  consigne?: FiltresConsigne;
  dejaServies?: string[];
}): Proposition[] {
  const servies = new Set(dejaServies);
  const propositions: Proposition[] = [];

  for (const creneau of creneaux) {
    const cible = cibleDuRepas(caloriesJournee, creneau.categories, creneau.categories[0]);

    /*
      Deux cercles, du plus exigeant au plus large. La consigne de la semaine
      s'assouplit si elle ne laisse plus assez de choix ; la catégorie de la
      case et ses préférences alimentaires, jamais.
    */
    const cercles = [
      (r: RecetteCandidate) =>
        aLUneDesCategories(r, creneau.categories) && respecteSesPreferences(r, preferences) && respecteLaConsigne(r, consigne),
      (r: RecetteCandidate) =>
        aLUneDesCategories(r, creneau.categories) && respecteSesPreferences(r, preferences),
    ];

    let choisie: RecetteCandidate | null = null;
    for (const cercle of cercles) {
      const candidates = recettes.filter(cercle);
      if (!candidates.length) continue;

      // On sert d'abord ce qui n'a pas encore été servi cette semaine.
      const fraiches = candidates.filter((r) => !servies.has(r.id));
      choisie = meilleure(fraiches.length ? fraiches : candidates, cible);
      break;
    }

    if (!choisie) continue;
    servies.add(choisie.id);
    const mealKey = `${creneau.repas}_${creneau.sousRepas}`;
    propositions.push({
      cle: `${creneau.date}|${mealKey}`,
      date: creneau.date,
      mealKey,
      recetteId: choisie.id,
    });
  }

  return propositions;
}

/** La plus proche de la cible ; à égalité, la plus légère. */
function meilleure(candidates: RecetteCandidate[], cible: number): RecetteCandidate {
  return candidates.reduce((best, r) => {
    const kcal = r.nutrition?.calories || 0;
    const kcalBest = best.nutrition?.calories || 0;
    const ecart = Math.abs(kcal - cible);
    const ecartBest = Math.abs(kcalBest - cible);
    if (ecart < ecartBest) return r;
    if (ecart === ecartBest && kcal < kcalBest) return r;
    return best;
  });
}

/** Les parts connues, pour que l'appelant sache quels repas se composent. */
export const REPAS_COMPOSABLES = Object.keys(PART_DU_REPAS);

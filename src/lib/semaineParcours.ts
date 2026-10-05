/*
  « La semaine en cours » — ce que l'étape du moment demande à table.

  Deux écrans en ont besoin : le parcours, qui propose les recettes sous le
  lecteur, et la page Recettes, qui s'ouvre sur la sélection de la semaine.
  On lit donc l'état du parcours une fois, on le garde quelques minutes, et
  on partage le résultat.

  Rien de tout cela n'est obligatoire : une étape sans consigne ne change
  strictement rien à l'application.
*/
import { parcoursApi, FiltresRecettes, EtapeParcours } from './parcoursApi';
import { idAppareil } from './parcoursEcoute';
import { Recipe } from '../types';

export interface SemaineParcours {
  numero: number;
  titre: string;
  consigne: string;
  filtres: FiltresRecettes;
}

/** La semaine portée par une étape déjà chargée, ou null si elle ne dit rien. */
export function depuisEtape(etape?: EtapeParcours | null): SemaineParcours | null {
  if (!etape?.titre || !etape.consigne?.trim()) return null;
  return {
    numero: etape.numero,
    titre: etape.titre,
    consigne: etape.consigne.trim(),
    filtres: etape.filtres || {},
  };
}

const CACHE_MS = 5 * 60 * 1000;
let cache: { promesse: Promise<SemaineParcours | null>; a: number } | null = null;

/** L'étape du moment, si elle porte une consigne alimentaire. Sinon null. */
export async function semaineEnCours(): Promise<SemaineParcours | null> {
  if (cache && Date.now() - cache.a < CACHE_MS) return cache.promesse;
  const promesse = (async () => {
    const etat = await parcoursApi.etat(idAppareil());
    return depuisEtape(etat.etapes[etat.disponible]);
  })();
  cache = { promesse, a: Date.now() };
  promesse.catch(() => { cache = null; });
  return promesse;
}

/** À appeler quand une étape vient d'être validée : la semaine a changé. */
export function oublierLaSemaine() {
  cache = null;
}

/**
 * Une recette respecte la consigne quand elle satisfait **tous** les critères
 * présents. Un filtre vide laisse tout passer : c'est voulu, une étape qui ne
 * demande rien de particulier n'a pas à restreindre la cuisine.
 */
export function respecteLaConsigne(recette: Recipe, filtres: FiltresRecettes): boolean {
  const prefs = filtres.preferences || [];
  if (prefs.length && !prefs.every((p) => (recette.dietaryPreferences || []).includes(p))) return false;

  const cats = filtres.categories || [];
  if (cats.length && !cats.some((c) => (recette.categories || []).includes(c))) return false;

  if (filtres.caloriesMax != null && (recette.nutrition?.calories || 0) > filtres.caloriesMax) return false;

  return true;
}

/** Vrai si le filtre demande vraiment quelque chose. */
export function filtreUtile(filtres: FiltresRecettes): boolean {
  return !!(filtres.preferences?.length || filtres.categories?.length || filtres.caloriesMax);
}

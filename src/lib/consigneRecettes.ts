/*
  La règle : une recette respecte-t-elle la consigne de la semaine ?

  Volontairement sans aucun import — c'est une règle métier pure, que le banc
  d'essai peut donc exécuter tel quel, et qui ne dépend ni de React ni de
  Supabase.
*/

/** Quelles recettes respectent la consigne. Toutes les clés sont facultatives. */
export interface FiltresRecettes {
  preferences?: string[];
  categories?: string[];
  caloriesMax?: number;
}

/** Le strict nécessaire pour trancher : le reste de la recette ne nous regarde pas. */
interface RecetteJugeable {
  dietaryPreferences?: string[];
  categories?: string[];
  nutrition?: { calories?: number };
}

/**
 * Une recette convient quand elle satisfait **tous** les critères présents :
 * toutes les préférences exigées, au moins une des catégories, et le plafond
 * calorique. Un filtre vide laisse tout passer — une étape qui ne demande
 * rien de particulier n'a pas à restreindre la cuisine.
 */
export function respecteLaConsigne(recette: RecetteJugeable, filtres: FiltresRecettes): boolean {
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

/*
  Retrouver la recette derrière une case du planning.

  Quand la cliente pose une **version** d'une recette (« version 1 500 kcal »),
  le planning n'enregistre pas l'identifiant de la recette mais
  `recetteId_variant_versionId`. Deux conséquences qui n'avaient pas été vues :

  - la liste de courses cherchait `recettes.find(r => r.id === valeur)` : avec
    un suffixe, elle ne trouvait rien et **passait le repas en silence**. Les
    ingrédients de tous les repas posés en version n'apparaissaient donc
    jamais dans la liste de courses ;
  - le planning, lui, découpait sur `_` au lieu de `_variant_` : un nom de
    version contenant un tiret bas renvoyait à la version de base.

  Ce module est la seule lecture de ces clés. Règle pure, sans React ni
  Supabase : le banc d'essai l'exécute telle quelle.
*/

const SEPARATEUR = '_variant_';

export interface IngredientPlanifie {
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

export interface VariantePlanifiable {
  id?: string;
  name?: string;
  ingredients?: IngredientPlanifie[];
}

export interface RecettePlanifiable {
  id: string;
  ingredients?: IngredientPlanifie[];
  variants?: VariantePlanifiable[];
}

/** `recetteId_variant_X` -> les deux morceaux. Sans suffixe, `variante` est null. */
export function decomposer(valeur: string): { recetteId: string; varianteId: string | null } {
  const coupe = valeur.indexOf(SEPARATEUR);
  if (coupe === -1) return { recetteId: valeur, varianteId: null };
  return {
    recetteId: valeur.slice(0, coupe),
    varianteId: valeur.slice(coupe + SEPARATEUR.length) || null,
  };
}

/** La clé à enregistrer dans le planning pour cette recette et cette version. */
export function composerCle(recetteId: string, variante?: VariantePlanifiable | null): string {
  if (!variante) return recetteId;
  return `${recetteId}${SEPARATEUR}${variante.id || variante.name || '0'}`;
}

/**
 * La recette et, le cas échéant, la version posée. `null` si la recette a
 * disparu du catalogue — une version introuvable, elle, retombe sur la
 * recette de base plutôt que de faire disparaître le repas.
 */
export function resoudreRepas<R extends RecettePlanifiable>(
  valeur: string,
  recettes: R[],
): { recette: R; variante: NonNullable<R['variants']>[number] | null } | null {
  const { recetteId, varianteId } = decomposer(valeur);
  const recette = recettes.find((r) => r.id === recetteId);
  if (!recette) return null;
  if (!varianteId) return { recette, variante: null };

  const versions = (recette.variants || []) as NonNullable<R['variants']>;
  let variante = versions.find((v) => v.id === varianteId) || versions.find((v) => v.name === varianteId);

  // Compatibilité : les premières versions étaient repérées par leur rang.
  if (!variante) {
    const rang = Number.parseInt(varianteId, 10);
    if (Number.isInteger(rang) && rang >= 0 && rang < versions.length) variante = versions[rang];
  }

  return { recette, variante: variante || null };
}

/**
 * Les ingrédients à acheter pour cette case du planning : ceux de la version
 * posée quand elle en a, sinon ceux de la recette de base.
 */
export function ingredientsDuRepas(valeur: string, recettes: RecettePlanifiable[]): IngredientPlanifie[] {
  const trouve = resoudreRepas(valeur, recettes);
  if (!trouve) return [];
  const { recette, variante } = trouve;
  const propres = variante?.ingredients;
  return propres && propres.length ? propres : recette.ingredients || [];
}

export interface RepasPlanifies {
  /** Les cases du jour : `petit-déjeuner_principal`, `déjeuner_plat`… */
  meals: Record<string, string | undefined | null>;
}

export interface LigneDeCourses {
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

/**
 * Les ingrédients de plusieurs journées, additionnés.
 *
 * Deux lignes se confondent quand elles portent le même nom **et** la même
 * unité : « Tomates, 200 g » deux fois donne « Tomates, 400 g ».
 */
export function listeDeCourses(
  journees: RepasPlanifies[],
  recettes: RecettePlanifiable[],
): LigneDeCourses[] {
  const parCle = new Map<string, LigneDeCourses>();

  for (const journee of journees) {
    for (const posee of Object.values(journee.meals || {})) {
      if (!posee) continue;
      for (const ing of ingredientsDuRepas(String(posee), recettes)) {
        const cle = `${ing.name}-${ing.unit}`;
        const deja = parCle.get(cle);
        if (deja) deja.quantity += ing.quantity;
        else parCle.set(cle, { name: ing.name, quantity: ing.quantity, unit: ing.unit, category: ing.category });
      }
    }
  }

  return [...parCle.values()];
}

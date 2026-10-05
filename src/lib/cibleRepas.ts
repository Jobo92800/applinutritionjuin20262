/*
  Quelle version d'une recette correspond aux besoins de la cliente.

  L'application calcule déjà ses besoins de la journée, et chaque recette a
  jusqu'à trois versions par niveau calorique — mais c'est elle qui devine
  laquelle prendre. Ce module fait le rapprochement : il répartit la journée
  entre les repas, puis choisit la version la plus proche.

  Volontairement sans aucun import : c'est une règle de calcul pure, que le
  banc d'essai exécute telle quelle.
*/

/**
 * La part de la journée que prend chaque repas.
 *
 * Répartition classique d'une rééducation alimentaire : le déjeuner porte le
 * plus, le petit-déjeuner structure la matinée, la collation reste un
 * complément. Les parts font 100 % sans la collation, qui vient en plus —
 * une journée avec collation dépasse donc un peu, c'est voulu.
 */
export const PART_DU_REPAS: Record<string, number> = {
  'Petit-déjeuner': 0.3,
  'Déjeuner': 0.4,
  'Dîner': 0.3,
  'Collation': 0.12,
};

/** Quand une recette ne dit pas à quel repas elle va, on la juge sur un déjeuner. */
const PART_PAR_DEFAUT = PART_DU_REPAS['Déjeuner'];

/**
 * La cible calorique d'un repas.
 *
 * `repas` est le moment visé quand on le connaît (depuis le calendrier) ;
 * sinon on le déduit des catégories de la recette, en prenant le repas le
 * plus « lourd » qu'elle revendique — une recette qui va au déjeuner comme
 * au dîner se juge sur le déjeuner.
 */
export function cibleDuRepas(
  caloriesJournee: number,
  categories: string[] = [],
  repas?: string,
): number {
  if (repas && PART_DU_REPAS[repas] != null) {
    return Math.round(caloriesJournee * PART_DU_REPAS[repas]);
  }
  const parts = categories.map((c) => PART_DU_REPAS[c]).filter((p): p is number => p != null);
  const part = parts.length ? Math.max(...parts) : PART_PAR_DEFAUT;
  return Math.round(caloriesJournee * part);
}

export interface VersionRecette {
  /** `null` pour la version de base. */
  id: string | null;
  nom: string;
  calories: number;
}

/**
 * La version la plus proche de la cible. À égalité de distance, on garde la
 * plus légère — mieux vaut proposer un peu moins que d'inviter au dépassement.
 *
 * Rend `null` quand aucune version n'est exploitable (recette sans calories) :
 * l'écran garde alors son comportement d'avant, c'est-à-dire la version de base.
 */
export function versionLaPlusProche(versions: VersionRecette[], cible: number): VersionRecette | null {
  const utilisables = versions.filter((v) => v.calories > 0);
  if (!utilisables.length || cible <= 0) return null;

  return utilisables.reduce((meilleure, v) => {
    const ecart = Math.abs(v.calories - cible);
    const ecartMeilleure = Math.abs(meilleure.calories - cible);
    if (ecart < ecartMeilleure) return v;
    if (ecart === ecartMeilleure && v.calories < meilleure.calories) return v;
    return meilleure;
  });
}

/**
 * Faut-il vraiment signaler un choix ? Quand toutes les versions sont à peu
 * près équivalentes, en désigner une n'apprend rien. On ne le fait que si
 * l'écart entre la plus légère et la plus lourde dépasse ce seuil.
 */
export const ECART_SIGNIFICATIF = 0.12;

export function choixUtile(versions: VersionRecette[]): boolean {
  const kcal = versions.map((v) => v.calories).filter((c) => c > 0);
  if (kcal.length < 2) return false;
  const min = Math.min(...kcal), max = Math.max(...kcal);
  return (max - min) / max >= ECART_SIGNIFICATIF;
}

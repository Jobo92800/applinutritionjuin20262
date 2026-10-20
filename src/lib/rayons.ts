/*
  Ranger la liste de courses par rayon — sans rien perdre en route.

  L'écran n'affichait que les douze rayons qu'il connaît : tout article
  rangé ailleurs restait invisible, alors qu'il comptait toujours dans
  « 3 / 15 articles cochés ». La cliente ne pouvait donc jamais atteindre
  15/15, et retrouvait dans son export `.txt` des articles qu'elle n'avait
  jamais vus à l'écran.

  Deux cas tombaient dans ce trou :

  - les ingrédients de recettes rangés dans un rayon qui n'existe pas (il y
    en a 77 en production) ;
  - les articles qu'elle ajoute elle-même : le formulaire proposait
    `autres` par défaut, et `autres` ne faisait pas partie des douze — un
    article ajouté sans toucher au menu déroulant disparaissait aussitôt.

  La règle ci-dessous garantit l'inverse : la somme des rayons rendus vaut
  toujours le nombre d'articles reçus.

  Règle pure, sans React : le banc d'essai l'exécute telle quelle.
*/

/** Le rayon qui rattrape tout le reste. Il vient toujours en dernier. */
export const RAYON_AUTRES = 'autres';

export interface ArticleRange {
  category?: string | null;
}

export interface RayonRange<T> {
  cle: string;
  articles: T[];
}

/**
 * Les articles rangés par rayon, dans l'ordre des rayons connus, les
 * inconnus regroupés sous `autres` à la fin. Les rayons vides sont omis.
 *
 * `clesConnues` ne contient pas `autres` : il est ajouté d'office.
 */
export function rangerParRayon<T extends ArticleRange>(
  articles: T[],
  clesConnues: string[],
): RayonRange<T>[] {
  const connues = new Set(clesConnues.filter((c) => c !== RAYON_AUTRES));
  const parRayon = new Map<string, T[]>();

  for (const article of articles) {
    const cle = article.category && connues.has(article.category) ? article.category : RAYON_AUTRES;
    const deja = parRayon.get(cle);
    if (deja) deja.push(article);
    else parRayon.set(cle, [article]);
  }

  const range: RayonRange<T>[] = [];
  for (const cle of clesConnues) {
    if (cle === RAYON_AUTRES) continue;
    const trouves = parRayon.get(cle);
    if (trouves?.length) range.push({ cle, articles: trouves });
  }
  const restants = parRayon.get(RAYON_AUTRES);
  if (restants?.length) range.push({ cle: RAYON_AUTRES, articles: restants });

  return range;
}

/**
 * Ce qu'on lit sous le nom d'un rayon.
 *
 * Replié, un rayon ne montre plus ses articles : la ligne doit donc dire
 * d'un coup d'œil s'il reste quelque chose à y prendre. On reprend la
 * formulation de l'en-tête de la page — « 3 / 22 » — plutôt que d'inventer
 * une seconde manière de compter.
 */
export function resumeDuRayon(articles: { checked?: boolean }[]): string {
  const total = articles.length;
  const coches = articles.filter((a) => a.checked).length;
  if (!coches) return `${total} article${total > 1 ? 's' : ''}`;
  if (coches === total) return 'Tout est coché';
  return `${coches} / ${total} cochés`;
}

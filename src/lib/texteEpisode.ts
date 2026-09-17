/*
  Mise en forme du texte d'un épisode.

  Les descriptions sont saisies dans l'admin en texte brut, avec des lignes
  vides entre les paragraphes. On les découpe ici pour l'affichage, et on aère
  les paragraphes trop longs à la fin d'une phrase, pour que rien ne dépasse
  une dizaine de lignes sur un téléphone.

  Deux touches de mise en forme sont reconnues si on veut s'en servir plus
  tard dans l'admin : `**en gras**` et les lignes commençant par « - » qui
  deviennent une liste.
*/

export const LONGUEUR_CONFORTABLE = 280;

export type Bloc =
  | { type: 'paragraphe'; texte: string }
  | { type: 'liste'; elements: string[] };

/** Découpe un texte en blocs (paragraphes et listes), en aérant ce qui est trop long. */
export function blocs(texte: string): Bloc[] {
  const resultat: Bloc[] = [];
  const morceaux = texte.replace(/\r/g, '').split(/\n\s*\n/);
  for (const morceau of morceaux) {
    const lignes = morceau.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lignes.length) continue;
    const puces = lignes.filter((l) => /^[-•]\s+/.test(l));
    if (puces.length === lignes.length) {
      resultat.push({ type: 'liste', elements: lignes.map((l) => l.replace(/^[-•]\s+/, '')) });
      continue;
    }
    for (const p of aerer(lignes.join(' '))) resultat.push({ type: 'paragraphe', texte: p });
  }
  return resultat;
}

/** Coupe un long paragraphe en plusieurs, uniquement entre deux phrases. */
export function aerer(paragraphe: string, max = LONGUEUR_CONFORTABLE): string[] {
  if (paragraphe.length <= max) return [paragraphe];
  const phrases = paragraphe.match(/[^.!?]+(?:[.!?]+["»)]?|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [paragraphe];
  if (phrases.length < 2) return [paragraphe];

  // On vise des morceaux de taille comparable plutôt qu'un dernier bout orphelin.
  const parts = Math.ceil(paragraphe.length / max);
  const cible = paragraphe.length / parts;
  const groupes: string[] = [];
  let courant = '';
  for (const phrase of phrases) {
    const candidat = courant ? `${courant} ${phrase}` : phrase;
    // On coupe avant cette phrase seulement si le morceau en cours est déjà
    // plus proche de la taille visée que ne le serait le morceau allongé.
    const couper = courant && groupes.length < parts - 1
      && Math.abs(courant.length - cible) < Math.abs(candidat.length - cible);
    if (couper) {
      groupes.push(courant);
      courant = phrase;
    } else {
      courant = candidat;
    }
  }
  if (courant) groupes.push(courant);
  return groupes;
}

/** Segments d'une ligne : texte normal ou en gras (`**…**`). */
export function segments(texte: string): { gras: boolean; texte: string }[] {
  return texte
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((s) => (s.startsWith('**') && s.endsWith('**') ? { gras: true, texte: s.slice(2, -2) } : { gras: false, texte: s }));
}

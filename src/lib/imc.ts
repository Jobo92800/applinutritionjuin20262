/*
  L'IMC, ou rien.

  Les deux écrans calculaient l'IMC avec une taille de 1,70 m quand le profil
  n'en portait pas, puis affichaient la catégorie — « Poids normal »,
  « Surpoids » — comme un fait établi. Pour une cliente de 1,55 m, 60 kg,
  cela donnait 20,8 « Poids normal » là où son IMC réel est 25,0 « Surpoids ».

  Une mesure fausse est pire qu'une mesure absente : sans sa taille, on
  n'annonce rien et on l'invite à la renseigner.
*/

/** L'IMC, ou `null` si la taille n'est pas connue. */
export function imc(poidsKg: number, tailleCm?: number | null): number | null {
  if (!tailleCm || tailleCm <= 0 || !poidsKg || poidsKg <= 0) return null;
  const m = tailleCm / 100;
  return Number((poidsKg / (m * m)).toFixed(1));
}

/** « 24,3 » — à la française. */
export function imcAffiche(valeur: number | null): string {
  return valeur == null ? '—' : valeur.toFixed(1).replace('.', ',');
}

/** La catégorie de l'OMS, ou rien à dire. */
export function categorieImc(valeur: number | null): { texte: string; couleur: string } | null {
  if (valeur == null) return null;
  if (valeur < 18.5) return { texte: 'Insuffisance pondérale', couleur: 'text-mab-terrain-2-texte' };
  if (valeur < 25) return { texte: 'Poids normal', couleur: 'text-mab-succes' };
  if (valeur < 30) return { texte: 'Surpoids', couleur: 'text-mab-aqua-texte' };
  return { texte: 'Obésité', couleur: 'text-mab-erreur' };
}

/** Ce qu'on dit à la place, quand la taille manque. */
export const SANS_TAILLE = 'Renseignez votre taille dans votre profil pour voir votre IMC.';

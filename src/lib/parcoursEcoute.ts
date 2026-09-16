/*
  Utilitaires du lecteur du parcours, portés de « Mon Parcours ».

  La couverture d'écoute est un bitset : un bit par seconde du fichier, coché
  quand la seconde a été traversée. Le navigateur l'envoie au serveur, qui
  compte — jamais le verdict.
*/

const CLE_APPAREIL = 'mbp_appareil';

/** Identifiant de cet appareil, tiré une fois et retenu dans le navigateur. */
export function idAppareil(): string {
  try {
    let id = localStorage.getItem(CLE_APPAREIL);
    if (!id) {
      id = 'a' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem(CLE_APPAREIL, id);
    }
    return id;
  } catch {
    return 'sans-stockage';
  }
}

export function empaqueter(bits: Uint8Array): string {
  const octets = new Uint8Array(Math.ceil(bits.length / 8));
  for (let i = 0; i < bits.length; i++) if (bits[i]) octets[i >> 3] |= 128 >> (i & 7);
  let s = '';
  for (const o of octets) s += String.fromCharCode(o);
  return btoa(s);
}

export function depaqueter(base64: string | undefined, n: number): Uint8Array {
  const bits = new Uint8Array(n);
  if (!base64) return bits;
  let bin: string;
  try { bin = atob(base64); } catch { return bits; }
  for (let i = 0; i < n; i++) {
    const o = bin.charCodeAt(i >> 3) || 0;
    if (o & (128 >> (i & 7))) bits[i] = 1;
  }
  return bits;
}

export function tauxLocal(bits: Uint8Array | null): number {
  if (!bits || !bits.length) return 0;
  let n = 0;
  for (const b of bits) if (b) n++;
  return n / bits.length;
}

export function mmss(secondes: number): string {
  const s = Math.max(0, Math.floor(secondes || 0));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function minutes(secondes: number | null | undefined): string {
  if (!secondes) return '';
  return `${Math.max(1, Math.round(secondes / 60))} min`;
}

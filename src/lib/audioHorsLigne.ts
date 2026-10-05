/*
  Garder un épisode pour l'écouter sans réseau.

  Les clientes écoutent en voiture, en marchant, dans le métro — et le fichier
  vit dans un bucket privé, servi par une adresse signée valable deux heures.
  Mettre l'adresse en cache ne servirait donc à rien : c'est le **fichier**
  qu'on garde, dans IndexedDB, et on le relit par une adresse locale.

  Ce qui est volontairement simple :
  - un seul magasin, une entrée par étape (`numero`), le son et sa durée ;
  - rien ne se télécharge tout seul — c'est elle qui décide, étape par étape ;
  - tout échec est silencieux côté appel : sans stockage disponible (navigation
    privée, quota plein), l'application se comporte comme avant.
*/

const BASE = 'mbp-parcours';
const MAGASIN = 'episodes';
const VERSION = 1;

export interface EpisodeHorsLigne {
  numero: number;
  titre: string;
  dureeSec: number | null;
  octets: number;
  gardeLe: string;
}

interface Enregistrement extends EpisodeHorsLigne {
  son: Blob;
}

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((resoudre, rejeter) => {
    if (typeof indexedDB === 'undefined') { rejeter(new Error('indexedDB indisponible')); return; }
    const demande = indexedDB.open(BASE, VERSION);
    demande.onupgradeneeded = () => {
      const base = demande.result;
      if (!base.objectStoreNames.contains(MAGASIN)) base.createObjectStore(MAGASIN, { keyPath: 'numero' });
    };
    demande.onsuccess = () => resoudre(demande.result);
    demande.onerror = () => rejeter(demande.error);
  });
}

function transaction<T>(mode: IDBTransactionMode, action: (m: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return ouvrir().then(
    (base) =>
      new Promise<T>((resoudre, rejeter) => {
        const t = base.transaction(MAGASIN, mode);
        const demande = action(t.objectStore(MAGASIN));
        demande.onsuccess = () => resoudre(demande.result);
        demande.onerror = () => rejeter(demande.error);
        t.oncomplete = () => base.close();
      })
  );
}

/** Le son gardé pour cette étape, ou null. Ne lève jamais. */
export async function sonGarde(numero: number): Promise<Blob | null> {
  try {
    const e = await transaction<Enregistrement | undefined>('readonly', (m) => m.get(numero));
    return e?.son ?? null;
  } catch {
    return null;
  }
}

/** Ce qui est gardé, sans les sons eux-mêmes. Ne lève jamais. */
export async function episodesGardes(): Promise<EpisodeHorsLigne[]> {
  try {
    const tout = await transaction<Enregistrement[]>('readonly', (m) => m.getAll());
    return tout
      .map(({ numero, titre, dureeSec, octets, gardeLe }) => ({ numero, titre, dureeSec, octets, gardeLe }))
      .sort((a, b) => a.numero - b.numero);
  } catch {
    return [];
  }
}

/**
 * Télécharge le son et le garde. Rend le nombre d'octets gardés.
 *
 * `surProgression` reçoit une fraction entre 0 et 1 quand le serveur annonce
 * la taille ; sinon elle n'est jamais appelée et l'écran montre une attente
 * indéterminée.
 */
export async function garder(
  numero: number,
  titre: string,
  dureeSec: number | null,
  url: string,
  surProgression?: (part: number) => void,
): Promise<number> {
  const reponse = await fetch(url);
  if (!reponse.ok) throw new Error(`téléchargement refusé : ${reponse.status}`);

  const total = Number(reponse.headers.get('content-length') || 0);
  let son: Blob;

  if (reponse.body && total > 0 && surProgression) {
    const lecteur = reponse.body.getReader();
    const morceaux: Uint8Array[] = [];
    let recus = 0;
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      if (value) { morceaux.push(value); recus += value.length; surProgression(Math.min(1, recus / total)); }
    }
    son = new Blob(morceaux as BlobPart[], { type: reponse.headers.get('content-type') || 'audio/mpeg' });
  } else {
    son = await reponse.blob();
  }

  await transaction('readwrite', (m) =>
    m.put({ numero, titre, dureeSec, octets: son.size, gardeLe: new Date().toISOString(), son } as Enregistrement)
  );

  /*
    Demander au navigateur de ne pas effacer ce qu'on vient de garder. Un refus
    n'est pas un échec : le son reste là, simplement effaçable si l'appareil
    manque de place.
  */
  try { await navigator.storage?.persist?.(); } catch { /* sans importance */ }

  return son.size;
}

/** Oublie un épisode. Ne lève jamais. */
export async function oublier(numero: number): Promise<void> {
  try {
    await transaction('readwrite', (m) => m.delete(numero));
  } catch { /* rien à faire de plus */ }
}

/** Le stockage local est-il seulement utilisable ici ? */
export function stockageDisponible(): boolean {
  return typeof indexedDB !== 'undefined';
}

/** « 7,2 Mo ». */
export function enMo(octets: number): string {
  return `${(octets / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
}

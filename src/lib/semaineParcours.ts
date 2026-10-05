/*
  « La semaine en cours » — ce que l'étape du moment demande à table.

  Deux écrans en ont besoin : le parcours, qui propose les recettes sous le
  lecteur, et la page Recettes, qui s'ouvre sur la sélection de la semaine.
  On lit donc l'état du parcours une fois, on le garde quelques minutes, et
  on partage le résultat.

  Rien de tout cela n'est obligatoire : une étape sans consigne ne change
  strictement rien à l'application.
*/
import { parcoursApi, EtapeParcours } from './parcoursApi';
import { idAppareil } from './parcoursEcoute';
import { FiltresRecettes } from './consigneRecettes';

export { respecteLaConsigne, filtreUtile } from './consigneRecettes';
export type { FiltresRecettes } from './consigneRecettes';

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

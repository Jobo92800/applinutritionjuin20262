/*
  Appels aux fonctions Netlify du parcours audio.

  Le navigateur ne parle jamais directement aux tables du parcours : il envoie
  son jeton Supabase, et c'est le serveur qui décide (déblocage, adresses
  signées, comptage). Même principe que `webpush.ts` pour les notifications.
*/
import { supabase } from './supabase';

export class ParcoursApiError extends Error {
  code: string;
  statut: number;
  constructor(code: string, statut: number) {
    super(code);
    this.code = code;
    this.statut = statut;
  }
}

async function jeton(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function appeler<T>(route: string, corps: Record<string, unknown>): Promise<T> {
  const acces = await jeton();
  const reponse = await fetch(`/api/${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(acces ? { Authorization: `Bearer ${acces}` } : {}),
    },
    body: JSON.stringify(corps),
  });
  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok) throw new ParcoursApiError(donnees.erreur || 'erreur', reponse.status);
  return donnees as T;
}

/* ---------------------------------------------------------- Côté cliente --- */

export interface EtapeParcours {
  numero: number;
  terminee: boolean;
  accessible: boolean;
  // Présents seulement quand l'étape est accessible.
  id?: string;
  titre?: string;
  description?: string;
  pointsCles?: string[];
  defis?: string[];
  supportPdf?: string | null;
  boutons?: { text: string; url: string; enabled: boolean }[];
  vignette?: string | null;
  dureeSec?: number | null;
  position?: number;
  taux?: number;
  couverture?: string;
}

export interface EtatParcours {
  cliente: { prenom: string; cure: string; premiereFois: boolean };
  etapes: EtapeParcours[];
  total: number;
  terminees: number;
  disponible: number;
  seuil: number;
}

export const parcoursApi = {
  etat: (appareil: string) => appeler<EtatParcours>('parcours', { appareil }),
  audio: (numero: number, appareil: string) =>
    appeler<{ url: string; expireDans: number; dureeSec: number | null }>('audio', { numero, appareil }),
  progression: (charge: { numero: number; appareil: string; couverture: string; position: number; duree: number }) =>
    appeler<{ taux: number; terminee: boolean; deja?: boolean }>('progression', charge),
};

/* ---------------------------------------------------- Côté administration --- */

export type Cure = '3_month' | '6_month';

export interface ClienteParcours {
  id: string;
  prenom: string;
  email: string;
  cure: Cure;
  cureNom: string;
  statut: 'actif' | 'suspendu';
  terminees: number;
  total: number;
  appareils: number;
  appareilsMax: number;
}

export const adminParcoursApi = {
  liste: () => appeler<{ clientes: ClienteParcours[] }>('admin-parcours', { action: 'liste' }),
  creer: (c: { prenom: string; nom?: string; email: string; parcours: Cure; motDePasse?: string }) =>
    appeler<{ cliente: { id: string }; invitation: { envoye: boolean; motDePasseDefini?: boolean }; existante?: boolean }>(
      'admin-parcours', { action: 'creer', ...c }
    ),
  modifier: (id: string, champs: { statut?: 'actif' | 'suspendu'; cure?: Cure; reinitialiserAppareils?: boolean }) =>
    appeler<object>('admin-parcours', { action: 'modifier', id, ...champs }),
  validerEtape: (id: string) => appeler<{ numero: number }>('admin-parcours', { action: 'valider-etape', id }),
  renvoyerInvitation: (id: string) => appeler<object>('admin-parcours', { action: 'renvoyer-invitation', id }),
  urlEnvoi: (chemin: string) => appeler<{ url: string; chemin: string }>('admin-parcours', { action: 'url-envoi', chemin }),
  etapeMaj: (id: string, champs: { fichier?: string; dureeSec?: number; actif?: boolean }) =>
    appeler<object>('admin-parcours', { action: 'etape-maj', id, ...champs }),
  ecouter: (id: string) => appeler<{ url: string; titre: string }>('admin-parcours', { action: 'ecouter', id }),
  importerClientes: () =>
    appeler<{ crees: number; completes: number; progressions: number; ignores: { email: string; raison: string }[]; echecs: { email: string; raison: string }[]; hachages: boolean }>(
      'admin-parcours', { action: 'importer-clientes' }
    ),
  migrerAudio: () =>
    appeler<{ copies: number; ignores: number; echecs: { id: string; titre: string; raison: string }[] }>('admin-parcours', { action: 'migrer-audio' }),
};

/*
  « Mon profil » : le BioPortrait et les mesures relevées au centre, lus par
  le serveur dans la base de l'application thérapeute. Le navigateur envoie
  sa session, rien d'autre.
*/
import { supabase } from './supabase';
import { ParcoursApiError } from './parcoursApi';

export interface AxeDecrit {
  code: string;
  nom: string;
  signature: string;
  texte: string;
  impacts: string[];
  pourcentage: number;
}

export interface Jauge {
  code: string;
  nom: string;
  pourcentage: number;
  dominant: boolean;
  present: boolean;
}

export interface BilanProfil {
  id: string;
  date: string;
  profil: AxeDecrit;
  terrain: AxeDecrit;
  synthese: string;
  jauges: { profils: Jauge[]; terrains: Jauge[] };
  aussiPresents: { nom: string; pourcentage: number }[];
  inbody: { libelle: string; valeur: string }[];
  complement: { nom: string; raison: string } | null;
  texteLibre: string;
  /** Le PDF du BioPortrait existe pour ce bilan. */
  document: boolean;
}

export type Mensuration = { date: string } & Record<string, number | string | null>;

export interface ProfilCliente {
  cliente: { prenom: string; civilite: string } | null;
  bilans: BilanProfil[];
  mensurations: Mensuration[];
  seuil?: number;
}

async function jeton(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function lire(requete = ''): Promise<Response> {
  const acces = await jeton();
  return fetch(`/api/profil${requete}`, {
    headers: acces ? { Authorization: `Bearer ${acces}` } : {},
  });
}

export const profilApi = {
  async etat(): Promise<ProfilCliente> {
    const r = await lire();
    const donnees = await r.json().catch(() => ({}));
    if (!r.ok) throw new ParcoursApiError(donnees.erreur || 'erreur', r.status);
    return donnees as ProfilCliente;
  },

  /** Le PDF d'un bilan, en adresse locale (blob) à ouvrir dans un nouvel onglet. */
  async document(bilanId: string): Promise<string> {
    const r = await lire(`?document=${encodeURIComponent(bilanId)}`);
    if (!r.ok) {
      const donnees = await r.json().catch(() => ({}));
      throw new ParcoursApiError(donnees.erreur || 'erreur', r.status);
    }
    return URL.createObjectURL(await r.blob());
  },
};

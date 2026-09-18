/*
  « Mon profil » : le BioPortrait de la cliente, lu dans la base de
  l'application thérapeute.

  GET /api/profil                      -> { cliente, bilans[], mensurations[], seuil }
                                          ou { cliente: null } quand aucune fiche ne porte cet email
  GET /api/profil?document=<bilanId>   -> le PDF du BioPortrait de ce bilan

  La session nutrition suffit : on prend l'email du compte, jamais un
  identifiant passé par le client. Un bilan qui n'est pas à elle ne se
  sert pas, même avec son identifiant.
*/
import { json, configManquante, utilisateurDuJeton, jetonDeRequete, ipDe, tropDAppels, journaliser } from '../lib/parcours-core.js';
import { v2Active, profilCliente, documentBilan } from '../lib/v2-core.js';

export default async (req) => {
  if (req.method !== 'GET') return json(405, { erreur: 'Méthode non autorisée.' });
  const manque = configManquante();
  if (manque) return manque;
  if (!v2Active()) return json(503, { erreur: 'profil-indisponible' });

  const compte = await utilisateurDuJeton(jetonDeRequete(req));
  if (!compte?.email) return json(401, { erreur: 'Session expirée. Reconnectez-vous.' });
  if (await tropDAppels(ipDe(req), 'profil', 30, 60)) return json(429, { erreur: 'Trop de demandes. Réessayez dans une minute.' });

  const url = new URL(req.url);
  const document = url.searchParams.get('document');

  try {
    if (document) {
      const pdf = await documentBilan(compte.email, document);
      if (!pdf) return json(404, { erreur: 'document-absent' });
      return new Response(Buffer.from(pdf.base64, 'base64'), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="BioPortrait_${String(pdf.date || '').slice(0, 10)}.pdf"`,
          'Cache-Control': 'private, no-store',
        },
      });
    }
    const profil = await profilCliente(compte.email);
    await journaliser('profil', { userId: compte.id, ip: ipDe(req), detail: profil ? `${profil.bilans.length} bilan(s)` : 'sans fiche' });
    return json(200, profil || { cliente: null, bilans: [], mensurations: [] });
  } catch (e) {
    console.error('profil :', e.message);
    return json(502, { erreur: 'profil-indisponible' });
  }
};

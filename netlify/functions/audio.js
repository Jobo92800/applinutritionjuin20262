/*
  Adresse de lecture temporaire d'une étape.
  POST { numero, appareil } -> { url, expireDans, dureeSec }

  Le serveur vérifie que l'étape est débloquée avant de signer quoi que ce
  soit. Une étape verrouillée renvoie 403 et laisse une trace dans le journal.
  L'adresse signée expire au bout de deux heures : rien ne reste accessible
  durablement, et le bucket lui-même est privé.
*/
import {
  json, configManquante, corpsJson, db, profilParSession, etapesDeLaCure,
  indexDisponible, urlSignee, journaliser, ipDe,
} from '../lib/parcours-core.js';

const DUREE_LIEN = 7200;

export default async (req) => {
  if (req.method !== 'POST') return json(405, { erreur: 'Méthode non autorisée.' });
  const manque = configManquante();
  if (manque) return manque;

  const corps = await corpsJson(req);
  if (!corps) return json(400, { erreur: 'Requête invalide.' });

  const numero = Number(corps.numero);
  if (!Number.isInteger(numero) || numero < 1) return json(400, { erreur: 'Étape inconnue.' });

  try {
    const { profil, cure, erreur, statut } = await profilParSession(req, corps.appareil);
    if (erreur) return json(statut, { erreur });

    const etapes = await etapesDeLaCure(cure);
    const index = numero - 1;
    if (index >= etapes.length) return json(404, { erreur: 'Étape inconnue.' });

    const avancement = await db.lire(
      'parcours_progression',
      `select=podcast_id,terminee&user_id=eq.${profil.id}`
    );
    const terminees = new Set(avancement.filter((p) => p.terminee).map((p) => p.podcast_id));
    const dispo = indexDisponible(etapes, terminees, profil.parcours_debloque_manuel);

    if (index > dispo) {
      await journaliser('etape-verrouillee', {
        userId: profil.id, ip: ipDe(req), detail: `demande ${numero}, dispo ${dispo + 1}`,
      });
      return json(403, { erreur: 'etape-verrouillee' });
    }

    const etape = etapes[index];
    if (!etape.fichier) return json(503, { erreur: 'audio-absent' });

    // La fiche récapitulative de la cure, signée elle aussi : elle vit dans le
    // même bucket privé. Une fiche manquante n'empêche pas l'écoute.
    const cheminFiche = etape.fiches && etape.fiches[cure];
    let fichePdf = null;
    if (cheminFiche) {
      try { fichePdf = await urlSignee(cheminFiche, DUREE_LIEN); } catch (e) { console.error('fiche :', e.message); }
    }

    return json(200, {
      url: await urlSignee(etape.fichier, DUREE_LIEN),
      expireDans: DUREE_LIEN,
      dureeSec: etape.duration || null,
      fichePdf,
    });
  } catch (e) {
    console.error('audio :', e.message);
    return json(500, { erreur: 'Service momentanément indisponible.' });
  }
};

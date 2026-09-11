/*
  Enregistrement de la progression d'écoute.
  POST { numero, appareil, couverture, position, duree, acces? } -> { taux, terminee }

  Point important : le navigateur envoie le bitset des secondes écoutées, jamais
  le verdict. C'est le serveur qui compte les bits et décide si l'étape est
  validée. Une requête forgée annonçant « terminée » n'a donc aucun effet.

  La durée de référence est `podcasts.duration`, lue dans le fichier au dépôt.
  Tant qu'elle est inconnue (0), on retient celle du navigateur et on la fige.

  `acces` : sendBeacon ne permet pas de poser un en-tête, le jeton peut donc
  arriver dans le corps pour l'envoi à la fermeture de la page.
*/
import {
  json, configManquante, corpsJson, db, profilParSession, etapesDeLaCure,
  tauxCouverture, SEUIL,
} from '../lib/parcours-core.js';

export default async (req) => {
  if (req.method !== 'POST') return json(405, { erreur: 'Méthode non autorisée.' });
  const manque = configManquante();
  if (manque) return manque;

  const corps = await corpsJson(req);
  if (!corps) return json(400, { erreur: 'Requête invalide.' });

  const numero = Number(corps.numero);
  const couverture = typeof corps.couverture === 'string' ? corps.couverture.slice(0, 8000) : '';
  const position = Math.max(0, Math.floor(Number(corps.position) || 0));
  const dureeClient = Math.floor(Number(corps.duree) || 0);

  if (!Number.isInteger(numero) || numero < 1) return json(400, { erreur: 'Étape inconnue.' });

  try {
    const { profil, cure, erreur, statut } = await profilParSession(req, corps.appareil, corps.acces);
    if (erreur) return json(statut, { erreur });

    const etapes = await etapesDeLaCure(cure);
    const etape = etapes[numero - 1];
    if (!etape) return json(404, { erreur: 'Étape inconnue.' });

    // Durée de référence : celle de la base, sinon celle annoncée à la première écoute.
    let duree = etape.duration || 0;
    if (!duree && dureeClient > 30 && dureeClient < 36000) {
      duree = dureeClient;
      await db.majSur('podcasts', `id=eq.${etape.id}`, { duration: duree });
    }
    if (!duree) return json(202, { taux: 0, terminee: false, note: 'duree-inconnue' });

    const existant = await db.un(
      'parcours_progression',
      `select=terminee&user_id=eq.${profil.id}&podcast_id=eq.${etape.id}`
    );
    if (existant?.terminee) {
      return json(200, { taux: 1, terminee: true, deja: true });
    }

    const taux = tauxCouverture(couverture, duree);
    const terminee = taux >= SEUIL;
    const maintenant = new Date().toISOString();

    await db.fusionner(
      'parcours_progression',
      {
        user_id: profil.id,
        podcast_id: etape.id,
        // Une fois l'étape validée, le détail seconde par seconde ne sert plus.
        couverture: terminee ? '' : couverture,
        position_sec: Math.min(position, duree),
        taux: Number(taux.toFixed(3)),
        terminee,
        terminee_le: terminee ? maintenant : null,
        updated_at: maintenant,
      },
      'user_id,podcast_id'
    );

    return json(200, { taux: Number(taux.toFixed(3)), terminee, seuil: SEUIL });
  } catch (e) {
    console.error('progression :', e.message);
    return json(500, { erreur: 'Service momentanément indisponible.' });
  }
};

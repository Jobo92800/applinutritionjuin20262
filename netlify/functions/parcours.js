/*
  État du parcours de la cliente connectée.
  POST { appareil } avec Authorization: Bearer <jeton Supabase> -> les étapes.

  Les titres des étapes verrouillées ne sont jamais envoyés au navigateur :
  ce qui n'est pas encore débloqué n'existe pas côté client.
*/
import {
  json, configManquante, corpsJson, db, profilParSession, etapesDeLaCure,
  indexDisponible, journaliser, ipDe, SEUIL, CURES,
} from '../lib/parcours-core.js';

export default async (req) => {
  if (req.method !== 'POST') return json(405, { erreur: 'Méthode non autorisée.' });
  const manque = configManquante();
  if (manque) return manque;

  const corps = (await corpsJson(req)) || {};

  try {
    const { profil, cure, erreur, statut } = await profilParSession(req, corps.appareil);
    if (erreur) {
      if (erreur !== 'session-expiree') await journaliser(erreur, { ip: ipDe(req) });
      return json(statut, { erreur });
    }

    const etapes = await etapesDeLaCure(cure);
    if (!etapes.length) return json(503, { erreur: 'parcours-vide' });

    const avancement = await db.lire(
      'parcours_progression',
      `select=podcast_id,position_sec,taux,terminee,couverture&user_id=eq.${profil.id}`
    );
    const parEtape = Object.fromEntries(avancement.map((p) => [p.podcast_id, p]));
    const terminees = new Set(avancement.filter((p) => p.terminee).map((p) => p.podcast_id));
    const dispo = indexDisponible(etapes, terminees, profil.parcours_debloque_manuel);

    const liste = etapes.map((e, i) => {
      const p = parEtape[e.id] || {};
      const base = {
        numero: i + 1,
        terminee: !!p.terminee,
        accessible: i <= dispo,
      };
      if (i > dispo) return base;              // étape verrouillée : rien de plus
      return {
        ...base,
        id: e.id,
        titre: e.title,
        description: e.description || '',
        pointsCles: e.key_points || [],
        defis: e.week_challenges || [],
        supportPdf: e.support_pdf_url || null,
        boutons: [e.cta_button, e.cta_button2].filter((b) => b && b.enabled),
        vignette: e.thumbnail || null,
        dureeSec: e.duration || null,
        position: p.position_sec || 0,
        taux: Number(p.taux || 0),
        // Bitset des secondes déjà écoutées : permet de reprendre le décompte
        // sur un autre appareil sans repartir de zéro.
        couverture: p.terminee ? '' : (p.couverture || ''),
      };
    });

    await journaliser('ouverture', { userId: profil.id, ip: ipDe(req) });

    return json(200, {
      cliente: { prenom: profil.name, cure: CURES[cure], premiereFois: avancement.length === 0 },
      etapes: liste,
      total: etapes.length,
      terminees: liste.filter((e) => e.terminee).length,
      disponible: dispo,
      seuil: SEUIL,
    });
  } catch (e) {
    console.error('parcours :', e.message);
    return json(500, { erreur: 'Service momentanément indisponible.' });
  }
};

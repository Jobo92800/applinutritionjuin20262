// Envoi des notifications push (Web Push standard, sans service tiers).
//
// Sécurité :
//   - Envoi à TOUS les abonnés : réservé aux comptes administrateurs.
//   - Envoi à soi-même : autorisé pour tout utilisateur connecté
//     (sert à confirmer l'activation des notifications).
//
// On interroge Supabase via son API REST (fetch) plutôt qu'avec le client JS :
// ce dernier initialise un client temps-réel qui exige des WebSockets natifs,
// absents de l'environnement Node 20 de Netlify (échec au démarrage).
import webpush from 'web-push';

// Clé publique VAPID (publique par nature, identique à celle du client).
const VAPID_PUBLIC_KEY =
  'BEPFLGt8dxvt2kJhNi6sPlBKV_ajUjBMMS2v1AcHDdVsssXP5YytuEx3aISQG8I0gSR_qS2ItWlXPxf_f3WdLis';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const CONTACT_EMAIL = process.env.VAPID_CONTACT_EMAIL || 'contact@mabeautyplus.fr';

const json = (status, payload) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** Appel à l'API Supabase au nom de l'utilisateur (les règles RLS s'appliquent). */
async function supabaseFetch(path, token, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return response;
}

export default async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Méthode non autorisée' });
  }

  // L'authentification est vérifiée en premier : un appelant anonyme ne doit rien
  // apprendre de la configuration du serveur.
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return json(401, { error: 'Authentification requise.' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json(500, { error: 'Configuration Supabase manquante côté serveur.' });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Requête invalide.' });
  }

  const title = (body.title || '').trim();
  const message = (body.body || '').trim();
  const url = (body.url || '/').trim();
  const targetUserId = body.userId;

  if (!title || !message) {
    return json(400, { error: 'Le titre et le message sont obligatoires.' });
  }

  // 1. Identifier l'appelant
  const userResponse = await supabaseFetch('/auth/v1/user', token);
  if (!userResponse.ok) {
    return json(401, { error: 'Session invalide ou expirée.' });
  }
  const user = await userResponse.json();
  if (!user?.id) {
    return json(401, { error: 'Session invalide ou expirée.' });
  }

  // 2. Vérifier les droits : viser autrui exige un compte administrateur.
  const isSelfTargeted = targetUserId && targetUserId === user.id;

  if (!isSelfTargeted) {
    const profileResponse = await supabaseFetch(
      `/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role`,
      token
    );
    const profiles = profileResponse.ok ? await profileResponse.json() : [];
    if (profiles?.[0]?.role !== 'admin') {
      return json(403, { error: 'Seuls les administrateurs peuvent envoyer une notification.' });
    }
  }

  // Appelant légitime : on peut maintenant signaler un défaut de configuration.
  if (!VAPID_PRIVATE_KEY) {
    return json(500, {
      error:
        "La clé VAPID_PRIVATE_KEY n'est pas configurée sur Netlify. Ajoutez-la dans les variables d'environnement du site, puis redéployez.",
    });
  }

  // 3. Récupérer les abonnements visés
  let subscriptionsPath = '/rest/v1/push_subscriptions?select=endpoint,p256dh,auth';
  if (targetUserId) {
    subscriptionsPath += `&user_id=eq.${encodeURIComponent(targetUserId)}`;
  }

  const subsResponse = await supabaseFetch(subscriptionsPath, token);
  if (!subsResponse.ok) {
    const detail = await subsResponse.text();
    return json(500, {
      error: `Lecture des abonnés impossible (${subsResponse.status}). La table push_subscriptions existe-t-elle ? ${detail.slice(0, 200)}`,
    });
  }

  const subscriptions = await subsResponse.json();
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return json(200, { sent: 0, failed: 0, removed: 0, message: 'Aucun abonné à notifier.' });
  }

  // 4. Envoyer
  webpush.setVapidDetails(`mailto:${CONTACT_EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const payload = JSON.stringify({ title, body: message, url });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  let sent = 0;
  let failed = 0;
  const expiredEndpoints = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      sent++;
      return;
    }
    failed++;
    const statusCode = result.reason?.statusCode;
    // 404 / 410 : l'abonnement n'existe plus (app désinstallée, cache vidé).
    if (statusCode === 404 || statusCode === 410) {
      expiredEndpoints.push(subscriptions[index].endpoint);
    } else {
      console.error('Échec envoi push:', statusCode, result.reason?.body || result.reason?.message);
    }
  });

  // 5. Nettoyer les abonnements devenus invalides
  for (const endpoint of expiredEndpoints) {
    await supabaseFetch(
      `/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
      token,
      { method: 'DELETE' }
    ).catch(() => {});
  }

  return json(200, { sent, failed, removed: expiredEndpoints.length });
};

// Envoi manuel d'une notification push (déclenché depuis l'application).
//
// Sécurité :
//   - Envoi à TOUS les abonnés : réservé aux comptes administrateurs.
//   - Envoi à soi-même : autorisé pour tout utilisateur connecté
//     (sert à confirmer l'activation des notifications).
import {
  json,
  supabaseFetch,
  sendToSubscriptions,
  removeExpired,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  VAPID_PRIVATE_KEY,
} from '../lib/push-core.js';

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

  // 4. Envoyer, puis nettoyer les abonnements expirés
  const { sent, failed, expiredEndpoints } = await sendToSubscriptions(subscriptions, {
    title,
    body: message,
    url,
  });

  await removeExpired(expiredEndpoints, token);

  return json(200, { sent, failed, removed: expiredEndpoints.length });
};

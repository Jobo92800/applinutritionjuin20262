// Envoi des notifications push (Web Push standard, sans service tiers).
//
// Sécurité :
//   - Envoi à TOUS les abonnés : réservé aux comptes administrateurs.
//   - Envoi à soi-même : autorisé pour tout utilisateur connecté
//     (sert à confirmer l'activation des notifications).
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

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

export default async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Méthode non autorisée' });
  }

  if (!VAPID_PRIVATE_KEY) {
    return json(500, {
      error:
        "La clé VAPID_PRIVATE_KEY n'est pas configurée sur Netlify. Ajoutez-la dans les variables d'environnement du site.",
    });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json(500, { error: 'Configuration Supabase manquante côté serveur.' });
  }

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return json(401, { error: 'Authentification requise.' });
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

  // Client Supabase agissant au nom de l'utilisateur appelant (RLS appliquée).
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return json(401, { error: 'Session invalide ou expirée.' });
  }

  // Un utilisateur non-administrateur ne peut viser que lui-même.
  const isSelfTargeted = targetUserId && targetUserId === user.id;

  if (!isSelfTargeted) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return json(403, { error: 'Seuls les administrateurs peuvent envoyer une notification.' });
    }
  }

  let query = supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth');
  if (targetUserId) {
    query = query.eq('user_id', targetUserId);
  }

  const { data: subscriptions, error: subsError } = await query;

  if (subsError) {
    return json(500, { error: `Lecture des abonnés impossible : ${subsError.message}` });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return json(200, { sent: 0, failed: 0, removed: 0, message: 'Aucun abonné à notifier.' });
  }

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

  // Nettoyage des abonnements devenus invalides.
  if (expiredEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints);
  }

  return json(200, { sent, failed, removed: expiredEndpoints.length });
};

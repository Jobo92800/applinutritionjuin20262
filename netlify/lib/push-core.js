// Logique d'envoi partagée entre l'envoi manuel (send-push) et l'envoi
// automatique (scheduled-push).
import webpush from 'web-push';

// Clé publique VAPID (publique par nature, identique à celle du client).
export const VAPID_PUBLIC_KEY =
  'BEPFLGt8dxvt2kJhNi6sPlBKV_ajUjBMMS2v1AcHDdVsssXP5YytuEx3aISQG8I0gSR_qS2ItWlXPxf_f3WdLis';

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
export const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const CONTACT_EMAIL = process.env.VAPID_CONTACT_EMAIL || 'contact@mabeautyplus.fr';

export const json = (status, payload) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * Appel à l'API REST de Supabase.
 * On n'utilise pas @supabase/supabase-js ici : son client temps-réel exige des
 * WebSockets natifs, absents de l'environnement Node de Netlify (échec au démarrage).
 */
export async function supabaseFetch(path, token, options = {}) {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

/**
 * Envoie une notification à une liste d'abonnements.
 * Retourne le nombre d'envois réussis, échoués, et les abonnements expirés.
 */
export async function sendToSubscriptions(subscriptions, { title, body, url }) {
  webpush.setVapidDetails(`mailto:${CONTACT_EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const payload = JSON.stringify({ title, body, url: url || '/' });

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

  return { sent, failed, expiredEndpoints };
}

/** Supprime les abonnements devenus invalides. */
export async function removeExpired(endpoints, token) {
  for (const endpoint of endpoints) {
    await supabaseFetch(
      `/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
      token,
      { method: 'DELETE' }
    ).catch(() => {});
  }
}

/**
 * Date et heure courantes à Paris (gère automatiquement l'heure d'été).
 * Les tâches planifiées Netlify s'exécutent en UTC.
 */
export function parisNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type)?.value;
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: parseInt(get('hour'), 10),
    dayOfWeek: weekdays[get('weekday')],
  };
}

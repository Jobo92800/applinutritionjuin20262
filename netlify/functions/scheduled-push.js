// Envoi automatique des notifications programmées.
//
// Cette fonction s'exécute toutes les heures (déclenchée par Netlify, elle n'est
// pas appelable depuis l'extérieur). Elle lit les programmations dues à l'heure
// de Paris et les envoie à tous les abonnés.
import {
  json,
  supabaseFetch,
  sendToSubscriptions,
  parisNow,
  SUPABASE_URL,
  VAPID_PRIVATE_KEY,
} from '../lib/push-core.js';

// Clé de service : nécessaire car aucune session utilisateur n'existe ici.
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Requête Supabase avec les droits de service (contourne les règles RLS). */
const serviceFetch = (path, options = {}) =>
  supabaseFetch(path, SERVICE_KEY, {
    ...options,
    headers: { apikey: SERVICE_KEY, ...(options.headers || {}) },
  });

export default async () => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('scheduled-push: SUPABASE_SERVICE_ROLE_KEY manquante.');
    return json(500, { error: 'SUPABASE_SERVICE_ROLE_KEY non configurée.' });
  }
  if (!VAPID_PRIVATE_KEY) {
    console.error('scheduled-push: VAPID_PRIVATE_KEY manquante.');
    return json(500, { error: 'VAPID_PRIVATE_KEY non configurée.' });
  }

  const { date, hour, dayOfWeek } = parisNow();

  // 1. Programmations actives pour cette heure
  const schedulesResponse = await serviceFetch(
    `/rest/v1/scheduled_notifications?select=*&active=eq.true&hour=eq.${hour}`
  );

  if (!schedulesResponse.ok) {
    const detail = await schedulesResponse.text();
    console.error('scheduled-push: lecture des programmations impossible', detail);
    return json(500, { error: 'Lecture des programmations impossible.' });
  }

  const schedules = await schedulesResponse.json();

  // 2. Filtrer : bon jour, et pas déjà envoyé aujourd'hui (anti-doublon)
  const due = (Array.isArray(schedules) ? schedules : []).filter((s) => {
    const dayMatches = s.day_of_week === null || s.day_of_week === dayOfWeek;
    const notSentToday = s.last_sent_on !== date;
    return dayMatches && notSentToday;
  });

  if (due.length === 0) {
    return json(200, { checked: schedules.length, sentSchedules: 0 });
  }

  // 3. Récupérer les abonnés une seule fois
  const subsResponse = await serviceFetch(
    '/rest/v1/push_subscriptions?select=endpoint,p256dh,auth'
  );
  if (!subsResponse.ok) {
    console.error('scheduled-push: lecture des abonnés impossible');
    return json(500, { error: 'Lecture des abonnés impossible.' });
  }
  const subscriptions = await subsResponse.json();

  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    // Aucun abonné : on marque quand même comme traité pour ne pas réessayer
    // toutes les heures suivantes de la journée.
    for (const schedule of due) {
      await serviceFetch(`/rest/v1/scheduled_notifications?id=eq.${schedule.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ last_sent_on: date, updated_at: new Date().toISOString() }),
      }).catch(() => {});
    }
    return json(200, { checked: schedules.length, sentSchedules: 0, subscribers: 0 });
  }

  // 4. Envoyer chaque programmation due
  let totalSent = 0;
  const allExpired = new Set();

  for (const schedule of due) {
    const { sent, expiredEndpoints } = await sendToSubscriptions(subscriptions, {
      title: schedule.title,
      body: schedule.body,
      url: schedule.url || '/',
    });
    totalSent += sent;
    expiredEndpoints.forEach((e) => allExpired.add(e));

    // Marquer comme envoyée (empêche un second envoi le même jour)
    await serviceFetch(`/rest/v1/scheduled_notifications?id=eq.${schedule.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ last_sent_on: date, updated_at: new Date().toISOString() }),
    }).catch(() => {});
  }

  // 5. Nettoyer les abonnements expirés
  for (const endpoint of allExpired) {
    await serviceFetch(
      `/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
      { method: 'DELETE' }
    ).catch(() => {});
  }

  console.log(
    `scheduled-push: ${due.length} programmation(s), ${totalSent} envoi(s), ${allExpired.size} abonnement(s) expiré(s).`
  );

  return json(200, {
    checked: schedules.length,
    sentSchedules: due.length,
    sent: totalSent,
    removed: allExpired.size,
  });
};

// Exécution toutes les heures (à la minute 0, en UTC).
export const config = {
  schedule: '@hourly',
};

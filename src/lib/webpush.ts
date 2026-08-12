// Notifications push auto-hébergées (Web Push standard, sans service tiers).
//
// La clé publique VAPID est publique par nature : elle est transmise aux
// navigateurs pour créer l'abonnement. La clé privée correspondante reste
// côté serveur (variable Netlify VAPID_PRIVATE_KEY).
import { supabase } from './supabase';

export const VAPID_PUBLIC_KEY =
  'BEPFLGt8dxvt2kJhNi6sPlBKV_ajUjBMMS2v1AcHDdVsssXP5YytuEx3aISQG8I0gSR_qS2ItWlXPxf_f3WdLis';

/** Empêche toute opération de bloquer l'interface indéfiniment. */
export function withTimeout<T>(promise: Promise<T>, ms: number, message = 'Délai dépassé'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Sur iPhone/iPad, les notifications push ne fonctionnent QUE si l'application
 * a été ajoutée à l'écran d'accueil (limitation d'Apple).
 */
export function iosNeedsInstall(): boolean {
  return isIOS() && !isStandalone();
}

export function permissionState(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/** Convertit la clé VAPID (base64url) au format attendu par le navigateur. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error("Ce navigateur ne gère pas les notifications.");
  }
  // `ready` n'aboutit jamais si aucun service worker n'est enregistré
  // (cas du serveur de développement) : on borne l'attente.
  return withTimeout(
    navigator.serviceWorker.ready,
    10000,
    "L'application n'est pas encore prête. Rechargez la page et réessayez."
  );
}

/** Extrait les clés d'un abonnement navigateur au format attendu par le serveur. */
function serializeSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON() as { endpoint?: string; keys?: Record<string, string> };
  return {
    endpoint: subscription.endpoint,
    p256dh: json.keys?.p256dh || '',
    auth: json.keys?.auth || '',
  };
}

/** L'appareil est-il déjà abonné (côté navigateur ET enregistré en base) ? */
export async function isSubscribed(): Promise<boolean> {
  try {
    if (!isPushSupported() || Notification.permission !== 'granted') return false;
    const registration = await getRegistration();
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;

    const { data } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', subscription.endpoint)
      .maybeSingle();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Demande l'autorisation, abonne l'appareil et enregistre l'abonnement en base.
 * Retourne true uniquement si tout a réussi.
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) {
    throw new Error('Ce navigateur ne gère pas les notifications.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return false;
  }

  const registration = await getRegistration();

  // Réutilise l'abonnement existant s'il y en a un, sinon en crée un.
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }

  const payload = serializeSubscription(subscription);
  if (!payload.p256dh || !payload.auth) {
    throw new Error("L'abonnement du navigateur est incomplet.");
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: payload.endpoint,
      p256dh: payload.p256dh,
      auth: payload.auth,
      user_agent: navigator.userAgent.slice(0, 300),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );

  if (error) {
    throw new Error(`Enregistrement impossible : ${error.message}`);
  }

  return true;
}

/** Désabonne l'appareil et retire l'abonnement de la base. */
export async function unsubscribeFromPush(): Promise<void> {
  const registration = await getRegistration();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => {});
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
}

export interface SendPushResult {
  sent: number;
  failed: number;
  removed: number;
}

/** Envoie une notification via la fonction serveur (réservé aux administrateurs). */
export async function sendPush(params: {
  title: string;
  body: string;
  url?: string;
  userId?: string;
}): Promise<SendPushResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Session expirée : reconnectez-vous.');
  }

  const response = await fetch('/.netlify/functions/send-push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(params),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || `Échec de l'envoi (code ${response.status}).`);
  }

  return result as SendPushResult;
}

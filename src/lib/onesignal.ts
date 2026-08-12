// Intégration OneSignal (notifications push web).
//
// L'App ID n'est pas un secret : il est prévu pour figurer dans le code de la page.
// Il peut être surchargé via la variable d'environnement VITE_ONESIGNAL_APP_ID.
const APP_ID =
  import.meta.env.VITE_ONESIGNAL_APP_ID || '49f5d944-6709-48db-b546-3ca063fa748e';

const SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';

// Le service worker OneSignal vit dans son propre sous-dossier (scope dédié) pour
// cohabiter avec le service worker de la PWA (/sw.js, scope "/") sans conflit.
const SW_PATH = 'push/onesignal/OneSignalSDKWorker.js';
const SW_SCOPE = '/push/onesignal/';

let initPromise: Promise<any> | null = null;

/** Le navigateur supporte-t-il les notifications push ? */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/** L'app tourne-t-elle en mode installé (écran d'accueil) ? */
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

function loadSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${SDK_URL}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Impossible de charger le SDK OneSignal'));
    document.head.appendChild(script);
  });
}

/** Charge et initialise OneSignal (une seule fois). */
export function initOneSignal(): Promise<any> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!isPushSupported()) {
      throw new Error('Notifications non supportées par ce navigateur');
    }

    await loadSdk();

    const w = window as any;
    w.OneSignalDeferred = w.OneSignalDeferred || [];

    return new Promise((resolve, reject) => {
      w.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          await OneSignal.init({
            appId: APP_ID,
            serviceWorkerPath: SW_PATH,
            serviceWorkerParam: { scope: SW_SCOPE },
            allowLocalhostAsSecureOrigin: true,
          });
          resolve(OneSignal);
        } catch (error) {
          reject(error);
        }
      });
    });
  })();

  // En cas d'échec, autoriser une nouvelle tentative plus tard.
  initPromise.catch(() => {
    initPromise = null;
  });

  return initPromise;
}

/** L'utilisateur est-il abonné aux notifications push ? */
export async function isSubscribed(): Promise<boolean> {
  try {
    const OneSignal = await initOneSignal();
    return !!OneSignal.User?.PushSubscription?.optedIn;
  } catch {
    return false;
  }
}

/**
 * Demande l'autorisation et abonne l'utilisateur.
 * Retourne true si l'utilisateur est bien abonné à l'issue de l'opération.
 */
export async function subscribeToPush(): Promise<boolean> {
  const OneSignal = await initOneSignal();

  // Ouvre la demande d'autorisation native du navigateur.
  await OneSignal.Notifications.requestPermission();

  if (OneSignal.Notifications.permission) {
    // S'assure que l'abonnement est actif (cas d'un ancien désabonnement).
    try {
      await OneSignal.User.PushSubscription.optIn();
    } catch {
      // ignore : déjà abonné
    }
    return true;
  }

  return false;
}

/** Désabonne l'utilisateur (sans révoquer l'autorisation du navigateur). */
export async function unsubscribeFromPush(): Promise<void> {
  const OneSignal = await initOneSignal();
  await OneSignal.User.PushSubscription.optOut();
}

/** Associe l'abonnement à l'identifiant de l'utilisateur (ciblage des envois). */
export async function linkUser(userId: string, email?: string): Promise<void> {
  try {
    const OneSignal = await initOneSignal();
    await OneSignal.login(userId);
    if (email) {
      try {
        await OneSignal.User.addEmail(email);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore : le ciblage par utilisateur est optionnel
  }
}

/** État de l'autorisation du navigateur. */
export function permissionState(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

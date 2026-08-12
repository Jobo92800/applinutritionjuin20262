import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, Smartphone, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  isPushSupported,
  iosNeedsInstall,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  permissionState,
  linkUser,
  withTimeout,
} from '../lib/onesignal';

type Status = 'loading' | 'unsupported' | 'ios-install' | 'denied' | 'on' | 'off';

export default function PushNotificationSettings() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [busy, setBusy] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!isPushSupported()) {
        if (!cancelled) setStatus(iosNeedsInstall() ? 'ios-install' : 'unsupported');
        return;
      }
      if (iosNeedsInstall()) {
        if (!cancelled) setStatus('ios-install');
        return;
      }

      const permission = permissionState();

      if (permission === 'denied') {
        if (!cancelled) setStatus('denied');
        return;
      }

      // Autorisation jamais demandée : inutile de charger le SDK OneSignal,
      // on affiche directement le bouton d'activation.
      if (permission !== 'granted') {
        if (!cancelled) setStatus('off');
        return;
      }

      // Autorisation déjà accordée : on confirme l'abonnement, sans jamais
      // laisser l'interface bloquée si le SDK ne répond pas.
      try {
        const subscribed = await withTimeout(isSubscribed(), 6000);
        if (!cancelled) setStatus(subscribed ? 'on' : 'off');
      } catch {
        // L'autorisation a été accordée depuis cette page : on considère
        // les notifications actives plutôt que d'afficher un état bloqué.
        if (!cancelled) setStatus('on');
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEnable = async () => {
    setBusy(true);
    setErrorDetail(null);
    try {
      const ok = await withTimeout(subscribeToPush(), 30000);
      if (ok) {
        if (user?.id) {
          // Le ciblage est optionnel : il ne doit pas retarder la confirmation.
          withTimeout(linkUser(user.id, user.email), 8000).catch(() => {});
        }
        setStatus('on');
      } else {
        setStatus(permissionState() === 'denied' ? 'denied' : 'off');
      }
    } catch (error) {
      console.error('Erreur activation des notifications:', error);
      setStatus(permissionState() === 'denied' ? 'denied' : 'off');
      setErrorDetail(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      setStatus('off');
    } catch (error) {
      console.error('Erreur désactivation des notifications:', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-5">
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center ${
            status === 'on' ? 'bg-green-100' : 'bg-gray-100'
          }`}
        >
          {status === 'on' ? (
            <Bell className="w-6 h-6 text-green-600" />
          ) : (
            <BellOff className="w-6 h-6 text-gray-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-800">Notifications sur votre téléphone</h4>
          <p className="text-sm text-gray-600 mt-0.5">
            Recevez vos rappels et les nouveautés, même quand l'application est fermée.
          </p>

          {/* État + action */}
          <div className="mt-4">
            {status === 'loading' && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Vérification…
              </div>
            )}

            {status === 'off' && (
              <div className="space-y-3">
                <button
                  onClick={handleEnable}
                  disabled={busy}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-60"
                >
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bell className="w-5 h-5" />}
                  {busy ? 'Activation en cours…' : 'Activer les notifications'}
                </button>

                {errorDetail && (
                  <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                    <p className="text-sm text-red-800">
                      L'activation a échoué. Vérifiez votre connexion et réessayez.
                    </p>
                    <p className="text-xs text-red-500 mt-1 break-words">Détail : {errorDetail}</p>
                  </div>
                )}
              </div>
            )}

            {status === 'on' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">Notifications activées</span>
                </div>
                <button
                  onClick={handleDisable}
                  disabled={busy}
                  className="text-sm text-gray-500 hover:text-gray-700 underline disabled:opacity-60"
                >
                  Désactiver les notifications
                </button>
              </div>
            )}

            {status === 'ios-install' && (
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Sur iPhone, installez d'abord l'application sur votre écran d'accueil
                  (bouton <strong>Partager</strong> puis <strong>« Sur l'écran d'accueil »</strong>).
                  Ouvrez ensuite l'application depuis cette icône pour activer les notifications.
                </p>
              </div>
            )}

            {status === 'denied' && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Les notifications sont bloquées pour ce site. Pour les réactiver, autorisez
                  les notifications dans les réglages de votre navigateur, puis revenez sur cette page.
                </p>
              </div>
            )}

            {status === 'unsupported' && (
              <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <AlertCircle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600">
                  Votre navigateur ne permet pas les notifications. Essayez avec Chrome, Edge ou Safari.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Download, X, Share, Plus, Smartphone } from 'lucide-react';

const DISMISS_KEY = 'pwa_install_dismissed';

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(
    typeof window !== 'undefined' ? (window as any).__deferredInstallPrompt || null : null
  );
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true);

  useEffect(() => {
    const onInstallable = () => setDeferred((window as any).__deferredInstallPrompt || null);
    const onInstalled = () => setDismissed(true);
    const onBeforeInstall = (e: any) => {
      e.preventDefault();
      (window as any).__deferredInstallPrompt = e;
      setDeferred(e);
    };

    window.addEventListener('pwa:installable', onInstallable);
    window.addEventListener('pwa:installed', onInstalled);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    return () => {
      window.removeEventListener('pwa:installable', onInstallable);
      window.removeEventListener('pwa:installed', onInstalled);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  // Ne rien afficher si déjà installée, déjà refusée, ou si aucune méthode d'install dispo.
  if (isStandalone || dismissed) return null;
  const canInstall = !!deferred || isIOS;
  if (!canInstall) return null;

  const handleInstall = async () => {
    if (deferred) {
      // Android / Chrome : installation native directe
      deferred.prompt();
      try {
        await deferred.userChoice;
      } catch {
        // ignore
      }
      (window as any).__deferredInstallPrompt = null;
      setDeferred(null);
    } else if (isIOS) {
      // iPhone : Safari n'autorise pas l'install auto -> on montre les étapes
      setShowIosHelp(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* Bannière d'installation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 flex-shrink-0 bg-green-100 rounded-xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-green-600" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 leading-tight">
                Installez l'application
              </p>
              <p className="text-sm text-gray-500 leading-snug mt-0.5">
                Accès direct depuis votre écran d'accueil.
              </p>
            </div>

            <button
              onClick={handleDismiss}
              aria-label="Fermer"
              className="flex-shrink-0 -mt-1 -mr-1 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleInstall}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl font-semibold text-base hover:bg-green-700 transition-colors shadow-sm"
          >
            <Download className="w-5 h-5" />
            Installer l'application
          </button>
        </div>
      </div>

      {/* Étapes d'installation pour iPhone (iOS Safari) */}
      {showIosHelp && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowIosHelp(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Installer sur iPhone</h2>
              <button
                onClick={() => setShowIosHelp(false)}
                aria-label="Fermer"
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 mb-5">
              En 3 étapes simples, dans Safari :
            </p>

            <ol className="space-y-4">
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 flex-shrink-0 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">
                  1
                </span>
                <span className="text-gray-700 flex items-center gap-2 flex-wrap">
                  Appuyez sur le bouton Partager
                  <Share className="w-5 h-5 text-blue-600 inline" />
                  en bas de l'écran.
                </span>
              </li>
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 flex-shrink-0 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">
                  2
                </span>
                <span className="text-gray-700 flex items-center gap-2 flex-wrap">
                  Choisissez « Sur l'écran d'accueil »
                  <Plus className="w-5 h-5 text-gray-700 inline" />
                </span>
              </li>
              <li className="flex items-center gap-4">
                <span className="w-8 h-8 flex-shrink-0 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">
                  3
                </span>
                <span className="text-gray-700">
                  Appuyez sur « Ajouter » en haut à droite.
                </span>
              </li>
            </ol>

            <button
              onClick={() => setShowIosHelp(false)}
              className="mt-6 w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}

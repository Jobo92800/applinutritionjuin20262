import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

// Fréquence de vérification d'une nouvelle version pour les sessions ouvertes
// longtemps (l'application est aussi vérifiée à chaque ouverture).
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // 1 heure

export default function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // Aucun service worker n'est généré par le serveur de développement.
    if (!import.meta.env.PROD) return;

    // Y avait-il déjà un service worker aux commandes ? Si non, il s'agit de la
    // toute première installation : ce n'est pas une mise à jour.
    const premiereInstallation = !navigator.serviceWorker.controller;

    // Le nouveau service worker vient de prendre la main : le code affiché à
    // l'écran est encore l'ancien, on invite donc à recharger — sans jamais
    // recharger d'autorité, ce qui interromprait une saisie en cours.
    const onControllerChange = () => {
      if (!premiereInstallation) setNeedRefresh(true);
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    let timer: ReturnType<typeof setInterval> | undefined;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Vérifie régulièrement l'arrivée d'une nouvelle version pour les
        // sessions restées ouvertes longtemps.
        timer = setInterval(() => {
          registration.update().catch(() => {});
        }, UPDATE_CHECK_INTERVAL);
      })
      .catch((error) => {
        console.error("Enregistrement du service worker impossible :", error);
      });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      if (timer) clearInterval(timer);
    };
  }, []);

  // Le nouveau service worker est déjà actif : un simple rechargement suffit à
  // charger le nouveau code (aucune attente possible, donc aucun blocage).
  const handleUpdate = () => {
    setUpdating(true);
    window.location.reload();
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] p-3 sm:p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 flex items-center gap-3">
        <div className="w-11 h-11 flex-shrink-0 bg-green-100 rounded-xl flex items-center justify-center">
          <RefreshCw className={`w-5 h-5 text-green-600 ${updating ? 'animate-spin' : ''}`} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 leading-tight">
            Une nouvelle version est disponible
          </p>
          <p className="text-sm text-gray-500 leading-snug mt-0.5">
            Actualisez pour profiter des dernières améliorations.
          </p>
        </div>

        <button
          onClick={handleUpdate}
          disabled={updating}
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-green-600 text-white rounded-xl font-semibold text-sm sm:text-base hover:bg-green-700 transition-colors disabled:opacity-60"
        >
          {updating ? 'Mise à jour…' : 'Actualiser'}
        </button>

        <button
          onClick={() => setNeedRefresh(false)}
          aria-label="Plus tard"
          className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

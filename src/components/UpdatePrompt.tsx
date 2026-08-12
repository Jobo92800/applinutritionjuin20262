import { useState, useEffect, useRef } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';

// Fréquence de vérification d'une nouvelle version pour les sessions ouvertes
// longtemps (l'application est aussi vérifiée à chaque ouverture).
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // 1 heure

export default function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updating, setUpdating] = useState(false);
  const updateRef = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        setInterval(() => {
          registration.update().catch(() => {});
        }, UPDATE_CHECK_INTERVAL);
      },
    });

    updateRef.current = update;
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);

    // Filet de sécurité : si l'activation n'entraîne aucun rechargement
    // (par exemple s'il n'y a plus de version en attente), on recharge nous-mêmes
    // pour ne pas laisser le bouton bloqué sur « Mise à jour… ».
    const fallback = setTimeout(() => window.location.reload(), 3000);

    try {
      // Active la nouvelle version puis recharge la page.
      await updateRef.current?.(true);
    } catch {
      clearTimeout(fallback);
      window.location.reload();
    }
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

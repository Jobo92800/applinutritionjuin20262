import { useData } from '../contexts/DataContext';

/**
 * Fenêtre de félicitations affichée dès qu'un ou plusieurs badges sont débloqués.
 */
export default function BadgeCelebration() {
  const { newBadges, clearNewBadges } = useData();

  if (newBadges.length === 0) return null;

  const pluriel = newBadges.length > 1;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"
      onClick={clearNewBadges}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-5 text-center">
          <div className="text-5xl mb-1">🎉</div>
          <h2 className="text-xl font-bold text-white">
            {pluriel ? 'Nouveaux badges débloqués !' : 'Nouveau badge débloqué !'}
          </h2>
        </div>

        <div className="p-6 space-y-3">
          {newBadges.map((badge) => (
            <div
              key={badge.id}
              className={`p-4 rounded-xl border-2 border-current border-opacity-30 ${badge.color}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{badge.icon}</span>
                <div className="min-w-0">
                  <h3 className="font-bold">{badge.name}</h3>
                  <p className="text-sm opacity-75">{badge.description}</p>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={clearNewBadges}
            className="w-full mt-2 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
          >
            Continuer
          </button>
        </div>
      </div>
    </div>
  );
}

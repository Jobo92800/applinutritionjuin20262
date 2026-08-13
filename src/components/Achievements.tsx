import { Flame, Trophy, Lock, Award } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

/** Message d'encouragement adapté à la série en cours. */
function streakMessage(current: number, todayDone: boolean): string {
  if (current === 0) {
    return "Cochez tous vos objectifs du jour pour lancer votre série !";
  }
  if (!todayDone) {
    return "Validez vos objectifs d'aujourd'hui pour poursuivre votre série.";
  }
  if (current < 3) return 'Bien joué, continuez comme ça !';
  if (current < 7) return 'Belle régularité, la semaine est à portée !';
  if (current < 30) return 'Impressionnant, votre habitude s\'installe !';
  return 'Exceptionnel ! Vous êtes un modèle de régularité.';
}

export default function Achievements() {
  const { user } = useAuth();
  const { badges, getUserBadges, getStreaks } = useData();

  if (!user) return null;

  const earned = getUserBadges(user.id);
  const earnedIds = new Set(earned.map((badge) => badge.id));
  const streaks = getStreaks(user.id);

  return (
    <div className="space-y-6">
      {/* Séries */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <Flame className="w-6 h-6 text-orange-500 mr-3" />
          Ma série
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div
            className={`rounded-xl p-5 text-center ${
              streaks.current > 0 ? 'bg-orange-50 border border-orange-100' : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <div className="text-4xl mb-1">{streaks.current > 0 ? '🔥' : '🌱'}</div>
            <div className="text-3xl font-bold text-gray-800">{streaks.current}</div>
            <div className="text-sm text-gray-500 font-medium">
              jour{streaks.current > 1 ? 's' : ''} d'affilée
            </div>
          </div>

          <div className="rounded-xl p-5 text-center bg-amber-50 border border-amber-100">
            <div className="text-4xl mb-1">🏆</div>
            <div className="text-3xl font-bold text-gray-800">{streaks.best}</div>
            <div className="text-sm text-gray-500 font-medium">meilleure série</div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mt-4 text-center">
          {streakMessage(streaks.current, streaks.todayDone)}
        </p>

        <p className="text-xs text-gray-400 mt-2 text-center">
          Une journée compte quand tous vos objectifs quotidiens sont cochés.
        </p>
      </div>

      {/* Badges */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <Award className="w-6 h-6 text-yellow-600 mr-3" />
            Mes badges
          </h2>
          <span className="text-sm font-medium text-gray-500">
            {earned.length} / {badges.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => {
            const obtenu = earnedIds.has(badge.id);
            return (
              <div
                key={badge.id}
                className={`p-4 rounded-xl border-2 transition-colors ${
                  obtenu
                    ? `${badge.color} border-current border-opacity-30`
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`text-2xl ${obtenu ? '' : 'grayscale opacity-50'}`}>
                    {badge.icon}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold flex items-center gap-1.5">
                      {badge.name}
                      {!obtenu && <Lock className="w-3.5 h-3.5 flex-shrink-0" />}
                    </h3>
                    <p className={`text-sm ${obtenu ? 'opacity-75' : ''}`}>{badge.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {earned.length === 0 && (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mt-4">
            <Trophy className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Aucun badge pour l'instant. Cochez vos objectifs de la semaine pour débloquer
              vos premiers trophées !
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

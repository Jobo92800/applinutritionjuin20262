// Calcul des séries (jours consécutifs) et des badges obtenus.
//
// Les données de progression sont stockées par semaine (début le lundi), avec
// pour chaque objectif un tableau de 7 booléens : index 0 = lundi … 6 = dimanche.
import { WeeklyGoal, WeeklyProgress } from '../types';

export interface Streaks {
  /** Jours parfaits consécutifs jusqu'à aujourd'hui. */
  current: number;
  /** Plus longue série jamais atteinte. */
  best: number;
  /** Aujourd'hui est-il déjà validé ? */
  todayDone: boolean;
}

/** Date (AAAA-MM-JJ) d'un jour donné d'une semaine de progression. */
export function dayDate(weekStart: string, dayIndex: number): string {
  const date = new Date(`${weekStart}T12:00:00`);
  date.setDate(date.getDate() + dayIndex);
  return toKey(date);
}

/** Clé de date locale (évite les décalages de fuseau d'une conversion UTC). */
export function toKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Ensemble des jours « parfaits » : tous les objectifs quotidiens y sont cochés.
 * Un jour sans aucun objectif quotidien défini n'est jamais considéré parfait.
 */
export function collectPerfectDays(
  weeklyProgress: WeeklyProgress[],
  weeklyGoals: WeeklyGoal[]
): Set<string> {
  const dailyGoals = weeklyGoals.filter((goal) => goal.type === 'daily');
  const perfectDays = new Set<string>();

  if (dailyGoals.length === 0) return perfectDays;

  weeklyProgress.forEach((progress) => {
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const allDone = dailyGoals.every(
        (goal) => progress.goals?.[goal.id]?.completed?.[dayIndex] === true
      );
      if (allDone) perfectDays.add(dayDate(progress.weekStart, dayIndex));
    }
  });

  return perfectDays;
}

/**
 * Série en cours et meilleure série.
 * Une journée entamée mais pas encore validée n'interrompt pas la série :
 * on repart alors de la veille.
 */
export function computeStreaks(
  weeklyProgress: WeeklyProgress[],
  weeklyGoals: WeeklyGoal[],
  today: Date = new Date()
): Streaks {
  const perfectDays = collectPerfectDays(weeklyProgress, weeklyGoals);
  const todayKey = toKey(today);
  const todayDone = perfectDays.has(todayKey);

  // Série actuelle
  let current = 0;
  const cursor = new Date(today);
  if (!todayDone) cursor.setDate(cursor.getDate() - 1);
  while (perfectDays.has(toKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Meilleure série : plus longue suite de dates consécutives
  const sorted = Array.from(perfectDays).sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;

  sorted.forEach((key) => {
    if (previous && isNextDay(previous, key)) {
      run++;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    previous = key;
  });

  return { current, best: Math.max(best, current), todayDone };
}

function isNextDay(previousKey: string, key: string): boolean {
  const previous = new Date(`${previousKey}T12:00:00`);
  previous.setDate(previous.getDate() + 1);
  return toKey(previous) === key;
}

/** Un objectif quotidien a-t-il été tenu les 7 jours d'une semaine ? */
function fullWeek(progress: WeeklyProgress, goalId: string): boolean {
  const completed = progress.goals?.[goalId]?.completed;
  return Array.isArray(completed) && completed.length >= 7 && completed.slice(0, 7).every(Boolean);
}

/**
 * Identifiants des badges mérités d'après l'historique complet.
 * Un badge obtenu reste acquis définitivement.
 */
export function computeEarnedBadgeIds(
  weeklyProgress: WeeklyProgress[],
  weeklyGoals: WeeklyGoal[],
  streaks: Streaks
): string[] {
  const earned = new Set<string>();
  const dailyGoals = weeklyGoals.filter((goal) => goal.type === 'daily');
  const weekGoals = weeklyGoals.filter((goal) => goal.type === 'weekly');

  weeklyProgress.forEach((progress) => {
    // Semaine parfaite : tous les objectifs quotidiens 7/7 et les hebdomadaires validés
    const everyDailyComplete =
      dailyGoals.length > 0 && dailyGoals.every((goal) => fullWeek(progress, goal.id));
    const everyWeeklyComplete = weekGoals.every(
      (goal) => progress.goals?.[goal.id]?.weeklyCompleted === true
    );
    if (everyDailyComplete && everyWeeklyComplete) earned.add('perfect_week');

    if (fullWeek(progress, 'water')) earned.add('hydration_master');
    if (fullWeek(progress, 'supplements')) earned.add('supplement_champion');
    if (fullWeek(progress, 'homecooking')) earned.add('chef_at_home');
    if (progress.goals?.['podcast']?.weeklyCompleted === true) earned.add('podcast_listener');
  });

  if (streaks.best >= 7) earned.add('streak_7');
  if (streaks.best >= 30) earned.add('streak_30');

  return Array.from(earned);
}

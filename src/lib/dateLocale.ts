/*
  La date du jour, telle que la cliente la vit.

  `new Date().toISOString().split('T')[0]` donne la date **UTC**. À Paris,
  entre minuit et 2 h du matin (1 h en hiver), cette date est celle de la
  veille : une pesée saisie à 0 h 30 était enregistrée au jour précédent, et
  un repas posé dans le planning à la même heure changeait de case.

  Le serveur, lui, a toujours raisonné en heure de Paris (`parisNow`). Ces
  deux fonctions mettent le navigateur d'accord avec lui : elles lisent la
  date **locale** de l'appareil, sans jamais passer par UTC.
*/

/** « 2026-10-15 » pour cette date, dans le fuseau de l'appareil. */
export function isoLocal(date: Date): string {
  const mois = `${date.getMonth() + 1}`.padStart(2, '0');
  const jour = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}

/** La date d'aujourd'hui. */
export function aujourdhuiIso(): string {
  return isoLocal(new Date());
}

/**
 * Le lundi de la semaine qui contient cette date.
 *
 * `getDay()` compte à partir de dimanche = 0 : un dimanche doit donc revenir
 * de six jours, pas avancer d'un. C'est la correction que le planning des
 * repas n'avait pas, là où le tableau de bord, la liste de courses et le
 * suivi hebdomadaire l'avaient déjà.
 */
export function lundiDeLaSemaine(date: Date = new Date()): Date {
  const d = new Date(date);
  const jour = d.getDay();
  d.setDate(d.getDate() - (jour === 0 ? 6 : jour - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

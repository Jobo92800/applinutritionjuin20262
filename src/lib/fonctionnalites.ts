/*
  Ce qui est ouvert aux clientes, et ce qui attend son heure.

  Une fonctionnalité qu'on décide de ne pas montrer ne se supprime pas : on
  la met en sommeil. Le code reste là, entretenu, compilé et vérifié ; seul
  l'accès disparaît. Le jour où elle revient, c'est un `true` à écrire ici,
  et rien d'autre.

  Chaque interrupteur doit couvrir **tous** les chemins d'accès — le menu,
  l'adresse `?page=…`, la page d'aide. Une porte dérobée oubliée, et la
  cliente tombe sur un écran dont on lui a dit qu'il n'existait pas.
*/

/**
 * L'analyse calorique d'une photo d'assiette.
 *
 * Mise en sommeil le 23 octobre 2026, à la demande de Jonathan : la
 * fonctionnalité existe et fonctionne, mais elle n'est pas prête à être
 * mise entre les mains des clientes. Pour la rouvrir : passer à `true`,
 * et remettre sa section dans `docs/guide-cliente/guide.html`.
 */
export const ANALYSE_PHOTO = false;

/**
 * La fenêtre de félicitations quand un badge se débloque.
 *
 * Fermée le 23 octobre 2026, à la demande de Jonathan : elle s'ouvrait
 * par-dessus l'écran en cours et il fallait la congédier pour continuer.
 *
 * **Les badges, eux, continuent de se gagner** : ils sont enregistrés
 * comme avant et s'affichent dans « Mes badges », sur la page Suivi. Seule
 * l'interruption disparaît — on félicite là où elle regarde, pas en lui
 * coupant la route.
 */
export const CELEBRATION_BADGES = false;

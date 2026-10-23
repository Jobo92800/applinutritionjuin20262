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

/**
 * Le bouton « Composer ma semaine », sur le calendrier des repas.
 *
 * Fermé le 23 octobre 2026, à la demande de Jonathan : le catalogue est
 * encore trop mince pour que la composition soit bonne. Avec quarante-trois
 * recettes, et très peu d'entrées et de desserts, elle laisse des cases
 * vides et répète les mêmes plats — proposer cela, c'est se présenter sous
 * son plus mauvais jour.
 *
 * La règle qui compose (`lib/composerSemaine`) reste écrite et vérifiée par
 * le banc d'essai : elle attend simplement d'avoir de quoi travailler.
 * À rouvrir quand les recettes auront été étoffées.
 */
export const COMPOSER_LA_SEMAINE = false;

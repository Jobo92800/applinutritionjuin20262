-- ===========================================================================
--  Les recettes de la semaine — proposition de consignes
--  Supabase « MB Nutrition » → SQL Editor → Run.
--
--  À N'EXÉCUTER QU'APRÈS avoir lancé la migration
--  `20261005000000_recettes_de_la_semaine.sql` (colonnes `consigne` et
--  `filtres` sur `podcasts`).
--
--  Ce ne sont que des PROPOSITIONS, écrites à partir de tes propres textes
--  d'épisodes. Relis-les : c'est ta méthode, pas la mienne. Tout se modifie
--  ensuite dans Administration → Podcasts → modifier un épisode, bloc
--  « Les recettes de cette semaine ». Une étape sans consigne n'affiche
--  rien de particulier à la cliente — on peut donc n'en garder qu'une partie.
--
--  Je m'arrête à la Semaine 5 : au-delà, tes épisodes expliquent des
--  mécanismes (microbiote, glycémie, hormones) plutôt qu'ils ne donnent une
--  règle à table. Une consigne n'y aurait pas de sens, et ce serait à toi de
--  l'écrire si tu en vois une.
-- ===========================================================================

begin;

-- --- Les deux introductions ------------------------------------------------
--  L'épisode annonce la journée détox du lendemain.
update podcasts set
  consigne = 'Demain, c''est votre journée détox : une pause digestive de 24 h. '
          || 'Ces recettes légères vous aideront à la préparer en douceur.',
  filtres  = '{"preferences":["Sans féculent"],"caloriesMax":400}'::jsonb
 where title ilike 'I%roduction%Bienvenue dans votre transformation%';

-- --- Semaine 1 — Phase d'attaque -------------------------------------------
--  « Vous retirez les féculents le midi et le soir » : la règle la plus nette
--  de toute la cure, et le filtre la traduit exactement.
update podcasts set
  consigne = 'Cette semaine, vous retirez les féculents le midi et le soir. '
          || 'Légumes à volonté, protéines maigres et bonnes graisses.',
  filtres  = '{"preferences":["Sans féculent"],"categories":["Déjeuner","Dîner","Plat principal"]}'::jsonb
 where title ilike 'Semaine 1 %Phase d%attaque%';

-- --- Semaine 2 — Réintégrer avec intelligence ------------------------------
--  Les féculents reviennent, mais au déjeuner seulement. Le filtre ne sait
--  pas dire « au déjeuner oui, au dîner non » : la phrase porte la nuance, et
--  le filtre se contente d'ouvrir le déjeuner. Le dîner reste à la main de la
--  cliente, qui vient de passer une semaine à le composer sans féculent.
update podcasts set
  consigne = 'Les féculents reviennent, au déjeuner uniquement et à indice '
          || 'glycémique bas. Le soir, on reste sur légumes et protéines.',
  filtres  = '{"categories":["Déjeuner","Plat principal"]}'::jsonb
 where title ilike 'Semaine 2 %Réintégrer%';

-- --- Semaine 3 — Les féculents le soir -------------------------------------
update podcasts set
  consigne = 'Les féculents à IG bas peuvent revenir le soir, en petite '
          || 'quantité. Observez comment vous dormez et comment vous digérez.',
  filtres  = '{"categories":["Dîner","Plat principal"]}'::jsonb
 where title ilike 'Semaine 3 %féculents le soir%';

-- --- Semaine 4 — L'équilibre à vie -----------------------------------------
--  Plus de retrait : on compose. Pas de filtre de préférence, juste les repas.
update podcasts set
  consigne = 'Plus rien n''est retiré : on compose. Cette semaine, visez une '
          || 'assiette complète à chaque repas, du matin au soir.',
  filtres  = '{"categories":["Petit-déjeuner","Déjeuner","Dîner"]}'::jsonb
 where title ilike 'Semaine 4 %équilibre à vie%';

-- --- Semaine 5 — Gérer les écarts ------------------------------------------
update podcasts set
  consigne = 'La semaine des écarts assumés. Gardez sous la main une recette '
          || 'de repas simple pour reprendre le fil juste après.',
  filtres  = '{"categories":["Déjeuner","Dîner","Plat principal"],"caloriesMax":450}'::jsonb
 where title ilike 'Semaine 5 %écarts%';

-- --- Ce qui a été écrit ----------------------------------------------------
select display_order as "n°", title as "épisode", consigne,
       filtres ->> 'preferences' as "préférences exigées",
       filtres ->> 'categories'  as "catégories",
       filtres ->> 'caloriesMax' as "plafond kcal"
  from podcasts
 where consigne is not null and consigne <> ''
 order by display_order;

commit;

-- ===========================================================================
--  Attendu : 8 lignes (les deux introductions et les semaines 1 à 5).
--
--  Pour effacer une consigne depuis le SQL plutôt que depuis l'admin :
--    update podcasts set consigne = null, filtres = '{}'::jsonb
--     where title ilike 'Semaine 5 %';
-- ===========================================================================

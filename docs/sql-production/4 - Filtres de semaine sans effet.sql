-- ===========================================================================
--  Les filtres de semaine qui ne filtrent rien — Supabase « MB Nutrition »
--  Éditeur SQL du projet → coller tout le fichier → Run.
--
--  POURQUOI
--  Trois étapes du parcours (semaines 2, 3 et 4) portent un filtre de
--  recettes composé UNIQUEMENT de catégories de repas : « Déjeuner »,
--  « Dîner », « Plat principal ». Or presque toutes les recettes du
--  catalogue portent l'une de ces étiquettes. Le filtre laisse donc passer
--  41 recettes sur 43 — autrement dit il ne trie rien, et la cliente lisait
--  « Voir les 41 recettes de la semaine » alors qu'il y en a 43 en tout.
--  Présenter le catalogue entier comme une sélection, c'est promettre un tri
--  qui n'a pas eu lieu.
--
--  Ce n'est pas une erreur de saisie : la règle de ces semaines ne SE TRADUIT
--  PAS en filtre. « Les féculents au déjeuner mais pas au dîner » suppose de
--  connaître le moment du repas, ce qu'un filtre de recettes ignore. La
--  phrase, elle, le dit très bien.
--
--  CE QUE LE SCRIPT FAIT
--  Il vide le filtre de ces étapes-là, et **garde leur consigne**. Côté
--  application, la carte affiche alors la consigne seule, sous le titre
--  « Votre consigne de la semaine » au lieu de proposer une fausse sélection.
--
--  Le critère est la forme du filtre, pas le titre de l'épisode : un filtre
--  qui ne demande QUE des catégories ne trie pas. Les autres sont intacts —
--  la semaine 1 exige « Sans féculent », la semaine 5 plafonne les calories,
--  l'introduction fait les deux.
--
--  SANS RISQUE et REJOUABLE : en transaction, et une fois les filtres vidés
--  le relancer ne change plus rien.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. L'état avant : quels filtres ne demandent que des catégories
-- ---------------------------------------------------------------------------
create temporary table _avant_filtres as
select count(*) as filtres_sans_effet
  from podcasts
 where filtres ? 'categories'
   and not (filtres ? 'preferences')
   and (filtres -> 'caloriesMax') is null;

-- Pour mémoire, ce qui va être vidé.
select display_order as "n°", title as "épisode",
       filtres ->> 'categories' as "catégories qui ne trient rien"
  from podcasts
 where filtres ? 'categories'
   and not (filtres ? 'preferences')
   and (filtres -> 'caloriesMax') is null
 order by display_order;

-- ---------------------------------------------------------------------------
-- 1. Vider ces filtres — en gardant la consigne, qui elle vaut quelque chose
-- ---------------------------------------------------------------------------
update podcasts
   set filtres = '{}'::jsonb
 where filtres ? 'categories'
   and not (filtres ? 'preferences')
   and (filtres -> 'caloriesMax') is null;

-- ---------------------------------------------------------------------------
-- 2. Vérification : « après » doit afficher 0, et les consignes rester là
-- ---------------------------------------------------------------------------
select
  a.filtres_sans_effet as "filtres sans effet — avant",
  (select count(*) from podcasts
    where filtres ? 'categories'
      and not (filtres ? 'preferences')
      and (filtres -> 'caloriesMax') is null)        as "filtres sans effet — après",
  (select count(*) from podcasts
    where consigne is not null and consigne <> '')   as "consignes encore en place"
from _avant_filtres a;

commit;

-- ===========================================================================
--  Attendu avant : 3 filtres sans effet (semaines 2, 3 et 4).
--  Attendu après : 0 — et 8 consignes toujours en place.
--
--  Les filtres qui restent, et qui eux trient vraiment :
--    introduction  préférence « Sans féculent » + plafond 400 kcal
--    semaine 1     préférence « Sans féculent »
--    semaine 5     plafond 450 kcal
--
--  Pour en remettre un depuis l'application : Administration → Podcasts →
--  modifier l'épisode → « Les recettes de cette semaine ». L'écran affiche
--  en direct combien de recettes le filtre retient : s'il en garde presque
--  autant que le catalogue, c'est qu'il ne trie pas.
-- ===========================================================================

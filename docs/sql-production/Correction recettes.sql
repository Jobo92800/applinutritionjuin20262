-- ===========================================================================
--  Correction des recettes — Supabase « MB Nutrition » (epokhtkwibgabwvobusl)
--  Éditeur SQL du projet → coller tout le fichier → Run.
--
--  Ce script ne répare que ce qui est FAUX SANS DISCUSSION. Tout ce qui
--  demande ton avis — les valeurs nutritionnelles qui ne tombent pas juste,
--  l'étiquette « Sans gluten » sur les recettes à la sauce soja — est dans le
--  document « Recettes - ce qui reste a decider.md », pas ici.
--
--  Ce qu'il corrige, sur les 43 recettes en ligne. Les points 1, 2 et 6
--  étaient ceux du premier script : tu l'as déjà lancé, ils sont à zéro, et
--  les relancer ne fait rien. Les points 3 à 5, 7 et 8 sont nouveaux.
--
--   1. (déjà fait) 77 ingrédients rangés dans un rayon qui n'existe pas
--      (« autres », « légumes ») : ils disparaissaient de la liste de courses.
--   2. (déjà fait) 4 unités au pluriel (« feuilles », « brins »).
--   3. 34 noms d'ingrédient avec une espace en trop (« Roquette  »,
--      « Avocat  »…) : même effet, deux lignes au lieu d'une.
--   4. 6 noms de variante avec une espace en trop (« Calories : faibles  »).
--   5. 7 variantes dont le « targetCalories » ne correspond pas à leurs
--      propres calories — dont un 28 au lieu de 280.
--   6. (déjà fait) 9 recettes marquées « Végétalien », qui n'est pas un
--      filtre de l'application — c'est « Végan ».
--   7. Bibimbap : 178 g de glucides au lieu de 17 (ses deux variantes disent 17).
--   8. La recette de test « sfdgsdfg », visible par les clientes.
--
--  SANS RISQUE et REJOUABLE : il ne touche que ce qui est faux, laisse tout
--  le reste intact, et le relancer ne change plus rien. Il ne modifie ni les
--  quantités, ni les étapes, ni les photos, ni aucune autre valeur
--  nutritionnelle que le 178 du Bibimbap.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. L'état avant correction, gardé pour le rapport final
--
--    On compte les ingrédients de la recette ET ceux de chaque variante :
--    une variante fautive casse la liste de courses tout autant.
-- ---------------------------------------------------------------------------
create or replace view _mab_tous_les_ingredients as
  select r.id, r.title, i as ingredient
    from recipes r, jsonb_array_elements(r.ingredients) i
  union all
  select r.id, r.title, vi
    from recipes r,
         jsonb_array_elements(r.variants) v,
         jsonb_array_elements(v->'ingredients') vi;

create temporary table _avant as
select
  (select count(*) from _mab_tous_les_ingredients
    where ingredient->>'category' not in (
      'fruits-legumes','boucherie-charcuterie','poisson','produits-laitiers',
      'epicerie-salee','epicerie-sucree','boisson','surgeles',
      'boulangerie-patisserie','bio-dietetique','condiments-assaisonnements',
      'complements-alimentaires'))                                  as rayons_fautifs,
  (select count(*) from _mab_tous_les_ingredients
    where ingredient->>'unit' not in
      ('g','ml','pièce','gousse','feuille','brin'))                 as unites_fautives,
  (select count(*) from _mab_tous_les_ingredients
    where ingredient->>'name' <> btrim(ingredient->>'name'))        as noms_avec_espace,
  (select count(*) from recipes r, jsonb_array_elements(r.variants) v
    where v->>'name' <> btrim(v->>'name'))                          as variantes_avec_espace,
  (select count(*) from recipes r, jsonb_array_elements(r.variants) v
    where v->'targetCalories' is distinct from v->'nutrition'->'calories')
                                                                    as target_calories_faux,
  (select count(*) from recipes
    where 'Végétalien' = any(dietary_preferences))                  as recettes_vegetalien,
  (select count(*) from recipes where title = 'sfdgsdfg')           as recettes_de_test;

-- ---------------------------------------------------------------------------
-- 1. Un ingrédient corrigé : son rayon, son unité, son nom
--
--    Rayon — on ne touche QUE ceux qui sont hors des douze rayons de
--    l'application. Les herbes et aromates vont en « condiments », parce que
--    c'est là qu'ils sont dans les recettes déjà justes (coriandre 6 fois,
--    gingembre 5 fois, persil 3 fois) ; tout le reste — légumes, fruits, ail,
--    jus de citron — va en « fruits et légumes ».
--
--    Unité — le pluriel passe au singulier.
--    Nom — on retire les espaces de début et de fin, rien d'autre.
-- ---------------------------------------------------------------------------
create or replace function _mab_corriger_ingredient(i jsonb)
returns jsonb language sql immutable as $$
  select i
    || jsonb_build_object('name', btrim(i->>'name'))
    || jsonb_build_object('category',
         case
           when i->>'category' in (
             'fruits-legumes','boucherie-charcuterie','poisson','produits-laitiers',
             'epicerie-salee','epicerie-sucree','boisson','surgeles',
             'boulangerie-patisserie','bio-dietetique','condiments-assaisonnements',
             'complements-alimentaires')
             then i->>'category'
           when btrim(i->>'name') in (
             'Basilic','Persil','Menthe','Coriandre','Gingembre',
             'Thym','Romarin','Ciboulette','Aneth','Estragon')
             then 'condiments-assaisonnements'
           else 'fruits-legumes'
         end)
    || jsonb_build_object('unit',
         case btrim(i->>'unit')
           when 'feuilles' then 'feuille'
           when 'brins'    then 'brin'
           when 'gousses'  then 'gousse'
           when 'pièces'   then 'pièce'
           else btrim(i->>'unit')
         end);
$$;

-- ---------------------------------------------------------------------------
-- 2. Appliquer aux ingrédients de la recette ET à ceux de chaque variante,
--    et au passage remettre d'aplomb le nom et le targetCalories des
--    variantes. L'ordre est préservé (with ordinality).
-- ---------------------------------------------------------------------------
update recipes r set
  ingredients = coalesce((
    select jsonb_agg(_mab_corriger_ingredient(e) order by ord)
    from jsonb_array_elements(r.ingredients) with ordinality t(e, ord)
  ), '[]'::jsonb),

  variants = coalesce((
    select jsonb_agg(
             v
             || jsonb_build_object('name', btrim(v->>'name'))
             || jsonb_build_object('targetCalories', v->'nutrition'->'calories')
             || jsonb_build_object('ingredients', coalesce((
                  select jsonb_agg(_mab_corriger_ingredient(vi) order by vord)
                  from jsonb_array_elements(v->'ingredients') with ordinality tv(vi, vord)
                ), '[]'::jsonb))
             order by vrang)
    from jsonb_array_elements(r.variants) with ordinality tvv(v, vrang)
  ), '[]'::jsonb);

-- ---------------------------------------------------------------------------
-- 3. « Végétalien » n'existe pas dans l'application
--
--    Sept des neuf recettes portent déjà « Végan » à côté : retirer le
--    doublon suffit. Restent deux cas, traités juste après.
-- ---------------------------------------------------------------------------
update recipes
   set dietary_preferences = array_remove(dietary_preferences, 'Végétalien')
 where 'Végétalien' = any(dietary_preferences);

--  « Granola maison » : sirop d'agave, aucun produit animal → vraiment végan.
update recipes
   set dietary_preferences = array_append(dietary_preferences, 'Végan')
 where title = 'Granola maison'
   and not ('Végan' = any(dietary_preferences));

--  « Porridge à l'Ananas » contient du MIEL, « Poisson Grillé Sauce
--  Cacahuète » contient du poisson : ni l'un ni l'autre n'est végan. Pour eux,
--  retirer l'étiquette fautive suffisait — c'est fait ci-dessus.

-- ---------------------------------------------------------------------------
-- 4. Bibimbap : 178 g de glucides pour 430 kcal est impossible
--
--    (27 g de lipides + 28 g de protéines + 178 g de glucides = 1 067 kcal.)
--    Ses deux variantes annoncent 17 g : le 8 est une frappe en trop.
--    Avec 17 : 243 + 112 + 68 = 423 kcal, à 1,6 % des 430 annoncées.
-- ---------------------------------------------------------------------------
update recipes
   set nutrition = jsonb_set(nutrition, '{carbs}', '17'::jsonb)
 where title = 'Bibimbap au Tofu et Légumes Marinés'
   and (nutrition->>'carbs')::numeric = 178;

-- ---------------------------------------------------------------------------
-- 5. La recette de test
--
--    Titre « sfdgsdfg », description « sgsfdgdsgsdg », aucune catégorie,
--    aucun ingrédient, aucune étape, 0 kcal, créée le 15 juin 2026. Elle
--    s'affiche aujourd'hui dans la liste des recettes des clientes.
--
--    C'est la seule suppression du script. Pour la garder quand même,
--    mettre les quatre lignes suivantes en commentaire avant de lancer.
-- ---------------------------------------------------------------------------
delete from recipes
 where title = 'sfdgsdfg'
   and jsonb_array_length(coalesce(ingredients, '[]'::jsonb)) = 0
   and coalesce(array_length(steps, 1), 0) = 0;

-- ---------------------------------------------------------------------------
-- 6. Le ménage
-- ---------------------------------------------------------------------------
drop function _mab_corriger_ingredient(jsonb);

-- ---------------------------------------------------------------------------
-- 7. Vérification : toute la colonne « après » doit afficher 0
-- ---------------------------------------------------------------------------
select
  a.rayons_fautifs          as "rayons inexistants — avant",
  (select count(*) from _mab_tous_les_ingredients
    where ingredient->>'category' not in (
      'fruits-legumes','boucherie-charcuterie','poisson','produits-laitiers',
      'epicerie-salee','epicerie-sucree','boisson','surgeles',
      'boulangerie-patisserie','bio-dietetique','condiments-assaisonnements',
      'complements-alimentaires'))               as "rayons inexistants — après",

  a.unites_fautives         as "unités au pluriel — avant",
  (select count(*) from _mab_tous_les_ingredients
    where ingredient->>'unit' not in
      ('g','ml','pièce','gousse','feuille','brin')) as "unités au pluriel — après",

  a.noms_avec_espace        as "noms avec espace — avant",
  (select count(*) from _mab_tous_les_ingredients
    where ingredient->>'name' <> btrim(ingredient->>'name'))
                                                 as "noms avec espace — après",

  a.variantes_avec_espace   as "variantes avec espace — avant",
  (select count(*) from recipes r, jsonb_array_elements(r.variants) v
    where v->>'name' <> btrim(v->>'name'))       as "variantes avec espace — après",

  a.target_calories_faux    as "targetCalories faux — avant",
  (select count(*) from recipes r, jsonb_array_elements(r.variants) v
    where v->'targetCalories' is distinct from v->'nutrition'->'calories')
                                                 as "targetCalories faux — après",

  a.recettes_vegetalien     as "« Végétalien » — avant",
  (select count(*) from recipes
    where 'Végétalien' = any(dietary_preferences)) as "« Végétalien » — après",

  a.recettes_de_test        as "recette de test — avant",
  (select count(*) from recipes where title = 'sfdgsdfg') as "recette de test — après"
from _avant a;

drop view _mab_tous_les_ingredients;

commit;

-- ===========================================================================
--  Attendu avant : 0 rayons · 0 unités (déjà corrigés par le premier script)
--                  34 noms · 6 variantes · 7 targetCalories ·
--                  0 « Végétalien » (déjà corrigé) · 1 recette de test.
--  Attendu après : 0 partout.
--
--  Si une colonne « après » n'est pas à zéro, ne rien relancer d'autre et me
--  le dire : le script se rejoue sans danger.
-- ===========================================================================

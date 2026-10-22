-- ===========================================================================
--  Sauce soja → tamari — Supabase « MB Nutrition » (epokhtkwibgabwvobusl)
--  Éditeur SQL du projet → coller tout le fichier → Run.
--
--  POURQUOI
--  Cinq recettes annoncent « Sans gluten » et contiennent de la sauce soja.
--  La sauce soja classique est brassée AVEC DU BLÉ : l'étiquette est fausse,
--  et une cliente cœliaque qui filtre « Sans gluten » cuisine ces recettes en
--  confiance. Le tamari est la version sans blé, même usage, goût très proche.
--
--  CE QUE LE SCRIPT FAIT
--   1. Renomme l'ingrédient « Sauce soja salée » en
--      « Tamari (sauce soja sans gluten) », dans les recettes ET dans leurs
--      variantes. Le nom est volontairement explicite : c'est lui qui
--      s'affiche dans la liste de courses, et il doit dire quoi acheter.
--   2. Réécrit la phrase de l'étape qui cite la sauce soja, en respectant le
--      genre : « la sauce soja » → « le tamari », « de la sauce soja » →
--      « du tamari ». Le Bibimbap est traité à part : son texte contient la
--      coquille « la sauce sauce soja », corrigée au passage.
--   3. L'étiquette « Sans gluten » reste en place — elle devient vraie.
--
--  CE QU'IL NE TOUCHE PAS
--  Trois recettes parlent de soja pour autre chose — un yaourt de soja
--  (Bol de Yaourt au Muesli), des laits végétaux (Lait d'or), du tempeh
--  (Salade de Poulet Grillé). Le script ne cible QUE les recettes dont la
--  sauce soja est un ingrédient : ces trois-là ne sont jamais effleurées.
--
--  SANS RISQUE et REJOUABLE : en transaction (une erreur n'écrit rien), et
--  le relancer ne change plus rien une fois l'ingrédient renommé.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. L'état avant correction
--
--    « fautif » = un ingrédient qui porte encore « sauce soja » sans être
--    déjà le tamari. Le périmètre des 5 recettes, lui, reste reconnaissable
--    avant comme après : le nouveau nom contient toujours « sauce soja »
--    entre parenthèses.
-- ---------------------------------------------------------------------------
create temporary table _avant_tamari as
select
  (select count(*) from recipes r, jsonb_array_elements(r.ingredients) i
    where i->>'name' ilike '%sauce soja%'
      and i->>'name' not ilike 'Tamari%')                   as ingredients_sauce_soja,

  (select count(*) from recipes r,
        jsonb_array_elements(coalesce(r.variants, '[]'::jsonb)) v,
        jsonb_array_elements(coalesce(v->'ingredients', '[]'::jsonb)) vi
    where vi->>'name' ilike '%sauce soja%'
      and vi->>'name' not ilike 'Tamari%')                  as ingredients_des_variantes,

  (select count(*) from recipes r, unnest(r.steps) s
    where s ilike '%sauce soja%'
      and exists (select 1 from jsonb_array_elements(r.ingredients) i
                   where i->>'name' ilike '%sauce soja%'))  as etapes_a_reecrire,

  (select count(*) from recipes r
    where 'Sans gluten' = any(r.dietary_preferences)
      and exists (select 1 from jsonb_array_elements(r.ingredients) i
                   where i->>'name' ilike '%sauce soja%'
                     and i->>'name' not ilike 'Tamari%'))   as recettes_sans_gluten_fautives;

-- ---------------------------------------------------------------------------
-- 1. Un ingrédient renommé — et seulement celui-là
-- ---------------------------------------------------------------------------
create or replace function _mab_tamari(i jsonb)
returns jsonb language sql immutable as $$
  select case
    when i->>'name' ilike '%sauce soja%' and i->>'name' not ilike 'Tamari%'
      then i || jsonb_build_object('name', 'Tamari (sauce soja sans gluten)')
    else i
  end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Une phrase réécrite, en respectant le genre
--
--    L'ordre des règles compte : la coquille du Bibimbap d'abord, puis les
--    formes les plus longues, pour qu'une règle courte ne mange pas une
--    tournure plus précise.
-- ---------------------------------------------------------------------------
create or replace function _mab_phrase_tamari(s text)
returns text language sql immutable as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(
               regexp_replace(
                 regexp_replace(s, 'la sauce sauce soja( salée)?', 'le tamari', 'gi'),
               'de la sauce soja( salée)?', 'du tamari', 'gi'),
             'la sauce soja( salée)?', 'le tamari', 'gi'),
           'une sauce soja( salée)?', 'un tamari', 'gi'),
         'sauce soja( salée)?', 'tamari', 'gi');
$$;

-- ---------------------------------------------------------------------------
-- 3. Appliquer : ingrédients, variantes et étapes, d'un seul geste.
--    L'ordre des listes est préservé (with ordinality).
-- ---------------------------------------------------------------------------
update recipes r set
  ingredients = coalesce((
    select jsonb_agg(_mab_tamari(e) order by ord)
      from jsonb_array_elements(r.ingredients) with ordinality t(e, ord)
  ), '[]'::jsonb),

  variants = coalesce((
    select jsonb_agg(
             v || jsonb_build_object('ingredients', coalesce((
                    select jsonb_agg(_mab_tamari(vi) order by vord)
                      from jsonb_array_elements(coalesce(v->'ingredients', '[]'::jsonb))
                           with ordinality tv(vi, vord)
                  ), '[]'::jsonb))
             order by vrang)
      from jsonb_array_elements(coalesce(r.variants, '[]'::jsonb)) with ordinality tvv(v, vrang)
  ), '[]'::jsonb),

  steps = array(
    select _mab_phrase_tamari(u.s)
      from unnest(r.steps) with ordinality u(s, ord)
     order by u.ord
  )

 where exists (select 1 from jsonb_array_elements(r.ingredients) i
                where i->>'name' ilike '%sauce soja%'
                  and i->>'name' not ilike 'Tamari%');

-- ---------------------------------------------------------------------------
-- 4. Le ménage
-- ---------------------------------------------------------------------------
drop function _mab_tamari(jsonb);
drop function _mab_phrase_tamari(text);

-- ---------------------------------------------------------------------------
-- 5. Vérification : toute la colonne « après » doit afficher 0
-- ---------------------------------------------------------------------------
select
  a.ingredients_sauce_soja        as "ingrédients sauce soja — avant",
  (select count(*) from recipes r, jsonb_array_elements(r.ingredients) i
    where i->>'name' ilike '%sauce soja%'
      and i->>'name' not ilike 'Tamari%')          as "ingrédients sauce soja — après",

  a.ingredients_des_variantes     as "dans les variantes — avant",
  (select count(*) from recipes r,
        jsonb_array_elements(coalesce(r.variants, '[]'::jsonb)) v,
        jsonb_array_elements(coalesce(v->'ingredients', '[]'::jsonb)) vi
    where vi->>'name' ilike '%sauce soja%'
      and vi->>'name' not ilike 'Tamari%')         as "dans les variantes — après",

  a.etapes_a_reecrire             as "étapes à réécrire — avant",
  (select count(*) from recipes r, unnest(r.steps) s
    where s ilike '%sauce soja%'
      and exists (select 1 from jsonb_array_elements(r.ingredients) i
                   where i->>'name' ilike '%sauce soja%')) as "étapes à réécrire — après",

  a.recettes_sans_gluten_fautives as "« Sans gluten » fautif — avant",
  (select count(*) from recipes r
    where 'Sans gluten' = any(r.dietary_preferences)
      and exists (select 1 from jsonb_array_elements(r.ingredients) i
                   where i->>'name' ilike '%sauce soja%'
                     and i->>'name' not ilike 'Tamari%'))  as "« Sans gluten » fautif — après"
from _avant_tamari a;

commit;

-- ===========================================================================
--  Attendu avant : 5 ingrédients · 0 ou plus dans les variantes ·
--                  5 étapes · 5 recettes « Sans gluten » fautives.
--  Attendu après : 0 partout.
--
--  Pour relire les 5 phrases réécrites, lancer ensuite :
--
--    select r.title, s.ord as etape, s.texte
--      from recipes r, lateral unnest(r.steps) with ordinality s(texte, ord)
--     where s.texte ilike '%tamari%'
--     order by r.title, s.ord;
-- ===========================================================================

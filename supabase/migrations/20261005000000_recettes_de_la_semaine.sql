/*
  Les recettes de la semaine — relier le parcours audio à la cuisine.

  Chaque étape peut porter une consigne alimentaire (la phrase que l'épisode
  prononce : « cette semaine, pas de féculents le midi ni le soir ») et un
  filtre qui dit quelles recettes la respectent.

  Les deux sont facultatifs : une étape sans consigne n'affiche rien de plus
  qu'avant. On n'écrit donc aucune valeur ici — c'est l'admin qui les saisit.

  Forme de `filtres`, toutes les clés étant facultatives :
    {
      "preferences": ["Sans féculent"],      -- étiquettes de dietary_preferences
      "categories":  ["Déjeuner", "Dîner"],  -- catégories de recette
      "caloriesMax": 500                      -- plafond, sur la version de base
    }
  Une recette convient quand elle satisfait TOUS les critères présents.
*/

ALTER TABLE podcasts
  ADD COLUMN IF NOT EXISTS consigne text,
  ADD COLUMN IF NOT EXISTS filtres  jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN podcasts.consigne IS
  'La consigne alimentaire de la semaine, en une phrase, telle que la cliente '
  'la lit sous le lecteur et en tête des recettes. Vide = rien ne s''affiche.';
COMMENT ON COLUMN podcasts.filtres IS
  'Quelles recettes respectent la consigne : {preferences[], categories[], '
  'caloriesMax}. Toutes les clés sont facultatives, {} = aucun filtre.';

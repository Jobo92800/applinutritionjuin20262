/*
  # Ajouter le support des variantes de recettes

  1. Modifications
    - Ajouter la colonne `variants` à la table `recipes`
    - La colonne stockera un tableau JSON des variantes

  2. Structure des variantes
    - Chaque variante contient : id, nom, calories cibles, ingrédients ajustés, valeurs nutritionnelles, description des ajustements
*/

-- Ajouter la colonne variants à la table recipes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'variants'
  ) THEN
    ALTER TABLE recipes ADD COLUMN variants jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
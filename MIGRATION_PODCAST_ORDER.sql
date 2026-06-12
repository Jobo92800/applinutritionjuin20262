-- ⚠️ IMPORTANT: Exécutez ce script dans le SQL Editor de Supabase
-- Allez sur: https://supabase.com/dashboard/project/epokhtkwibgabwvobusl/sql/new
-- Copiez et collez ce contenu, puis cliquez sur "Run"

/*
  # Ajout du champ display_order pour les podcasts

  1. Changements
    - Ajoute une colonne `display_order` à la table `podcasts` pour gérer l'ordre d'affichage
    - Initialise les valeurs existantes avec l'ordre actuel basé sur created_at
    - Rend le champ non-null avec une valeur par défaut

  2. Notes
    - Les podcasts existants recevront un ordre basé sur leur date de création
    - Les nouveaux podcasts auront display_order = 0 par défaut (à mettre à jour lors de la création)
*/

-- Étape 1: Ajouter la colonne display_order
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcasts' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE podcasts ADD COLUMN display_order integer DEFAULT 0;
  END IF;
END $$;

-- Étape 2: Initialiser les valeurs pour les podcasts existants
-- Les podcasts sont numérotés dans l'ordre de leur date de création
WITH ordered_podcasts AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as order_num
  FROM podcasts
)
UPDATE podcasts
SET display_order = ordered_podcasts.order_num
FROM ordered_podcasts
WHERE podcasts.id = ordered_podcasts.id AND podcasts.display_order = 0;

-- Étape 3: Rendre la colonne non-null
ALTER TABLE podcasts ALTER COLUMN display_order SET NOT NULL;

-- Vérification: Afficher les podcasts avec leur ordre
SELECT id, title, display_order, created_at
FROM podcasts
ORDER BY display_order;

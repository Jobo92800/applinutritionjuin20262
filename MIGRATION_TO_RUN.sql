-- ⚠️ IMPORTANT: Exécutez ce script dans le SQL Editor de Supabase
-- Allez sur: https://supabase.com/dashboard/project/epokhtkwibgabwvobusl/sql/new
-- Copiez et collez ce contenu, puis cliquez sur "Run"

/*
  # Ajout de la colonne week_challenges aux podcasts

  Cette migration ajoute une colonne pour stocker les défis de la semaine
  associés à chaque podcast.
*/

-- Ajouter la colonne week_challenges si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcasts' AND column_name = 'week_challenges'
  ) THEN
    ALTER TABLE podcasts ADD COLUMN week_challenges text[];
    RAISE NOTICE 'Colonne week_challenges ajoutée avec succès';
  ELSE
    RAISE NOTICE 'La colonne week_challenges existe déjà';
  END IF;
END $$;

-- Vérification: Afficher la structure de la table podcasts
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'podcasts'
ORDER BY ordinal_position;

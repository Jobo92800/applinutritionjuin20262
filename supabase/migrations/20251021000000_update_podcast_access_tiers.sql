/*
  # Mise à jour du système d'accès aux podcasts

  1. Modifications
    - Renommer la colonne `access_tier` en `access_tiers` (pluriel)
    - Changer le type de texte simple vers un tableau de textes
    - Permettre la sélection de plusieurs niveaux d'abonnement par podcast
    - Mettre à jour les données existantes pour utiliser un tableau

  2. Migration des données
    - Convertir toutes les valeurs `access_tier` existantes en tableaux `access_tiers`
    - Exemple: 'all' devient ['all'], '3_month' devient ['3_month']

  3. Notes importantes
    - Les podcasts peuvent maintenant être accessibles à plusieurs niveaux d'abonnement
    - Un podcast avec ['1_month', '3_month', '6_month'] sera accessible à tous ces niveaux
    - Un podcast avec ['all'] reste accessible à tous
*/

-- Ajouter la nouvelle colonne access_tiers en tant que tableau
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcasts' AND column_name = 'access_tiers'
  ) THEN
    ALTER TABLE podcasts ADD COLUMN access_tiers text[] DEFAULT ARRAY['all']::text[];
  END IF;
END $$;

-- Migrer les données existantes de access_tier vers access_tiers
UPDATE podcasts
SET access_tiers = ARRAY[access_tier]::text[]
WHERE access_tiers IS NULL OR access_tiers = ARRAY['all']::text[];

-- Supprimer l'ancienne colonne access_tier si elle existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcasts' AND column_name = 'access_tier'
  ) THEN
    ALTER TABLE podcasts DROP COLUMN access_tier;
  END IF;
END $$;

-- S'assurer que access_tiers n'est jamais NULL et a toujours au moins une valeur
ALTER TABLE podcasts ALTER COLUMN access_tiers SET NOT NULL;
ALTER TABLE podcasts ALTER COLUMN access_tiers SET DEFAULT ARRAY['all']::text[];

-- Ajouter une contrainte pour vérifier que les valeurs sont valides
ALTER TABLE podcasts DROP CONSTRAINT IF EXISTS valid_access_tiers;
ALTER TABLE podcasts ADD CONSTRAINT valid_access_tiers
  CHECK (
    access_tiers <@ ARRAY['1_month', '3_month', '6_month', 'all']::text[] AND
    array_length(access_tiers, 1) > 0
  );

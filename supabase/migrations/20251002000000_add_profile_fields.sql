/*
  # Ajouter les champs de profil utilisateur pour l'onboarding

  1. Modifications à la table profiles
    - `weight_goal` (decimal) - Objectif de poids en kg
    - `height_cm` (integer) - Taille en centimètres
    - `gender` (text) - Genre (homme/femme)
    - `age` (text) - Tranche d'âge (18-30, 31-50, 51+)
    - `activity_level` (text) - Niveau d'activité (faible, moderee, elevee)
    - `metabolism` (text) - Type de métabolisme (normal, ralentissement)
    - `dietary_preferences` (jsonb) - Préférences alimentaires (array)
    - `onboarding_complete` (boolean) - Statut de l'onboarding

  2. Sécurité
    - Les colonnes sont ajoutées avec des valeurs par défaut appropriées
    - RLS reste activé sur la table profiles
*/

-- Ajouter les colonnes de profil si elles n'existent pas déjà
DO $$
BEGIN
  -- Objectif de poids
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'weight_goal'
  ) THEN
    ALTER TABLE profiles ADD COLUMN weight_goal decimal(5,2) DEFAULT NULL;
  END IF;

  -- Taille en cm
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'height_cm'
  ) THEN
    ALTER TABLE profiles ADD COLUMN height_cm integer DEFAULT NULL;
  END IF;

  -- Genre
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE profiles ADD COLUMN gender text DEFAULT NULL;
  END IF;

  -- Tranche d'âge
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'age'
  ) THEN
    ALTER TABLE profiles ADD COLUMN age text DEFAULT NULL;
  END IF;

  -- Niveau d'activité
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'activity_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN activity_level text DEFAULT NULL;
  END IF;

  -- Type de métabolisme
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'metabolism'
  ) THEN
    ALTER TABLE profiles ADD COLUMN metabolism text DEFAULT NULL;
  END IF;

  -- Préférences alimentaires (array JSON)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'dietary_preferences'
  ) THEN
    ALTER TABLE profiles ADD COLUMN dietary_preferences jsonb DEFAULT '[]';
  END IF;

  -- Statut de l'onboarding
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_complete'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_complete boolean DEFAULT false;
  END IF;
END $$;

-- Ajouter les contraintes CHECK après la création des colonnes
DO $$
BEGIN
  -- Contrainte pour gender
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_gender_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_gender_check CHECK (gender IN ('homme', 'femme'));
  END IF;

  -- Contrainte pour age
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_age_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_age_check CHECK (age IN ('18-30', '31-50', '51+'));
  END IF;

  -- Contrainte pour activity_level
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_activity_level_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_activity_level_check CHECK (activity_level IN ('faible', 'moderee', 'elevee'));
  END IF;

  -- Contrainte pour metabolism
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_metabolism_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_metabolism_check CHECK (metabolism IN ('normal', 'ralentissement'));
  END IF;
END $$;

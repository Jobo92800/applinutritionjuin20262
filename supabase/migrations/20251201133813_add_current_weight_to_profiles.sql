/*
  # Ajouter le champ current_weight à la table profiles

  1. Modifications
    - Ajouter la colonne `current_weight` (decimal) pour stocker le poids actuel de l'utilisateur
    - Cette colonne sera renseignée lors de l'onboarding et pourra être mise à jour dans le profil

  2. Notes
    - Le poids actuel peut être différent du poids initial enregistré dans weight_entries
    - Utilisé comme fallback si aucune entrée de poids n'existe encore
*/

-- Ajouter la colonne current_weight si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'current_weight'
  ) THEN
    ALTER TABLE profiles ADD COLUMN current_weight decimal(5,2) DEFAULT NULL;
  END IF;
END $$;

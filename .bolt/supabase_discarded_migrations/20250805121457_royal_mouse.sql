/*
  # Ajouter la colonne display_order aux podcasts

  1. Modifications
    - Ajouter la colonne `display_order` à la table `podcasts`
    - Définir des valeurs par défaut basées sur la date de création
    - Créer un index pour optimiser les requêtes de tri

  2. Notes
    - Les podcasts existants auront un display_order basé sur leur ordre de création
    - Les nouveaux podcasts auront display_order = 0 par défaut
*/

-- Ajouter la colonne display_order
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Mettre à jour les podcasts existants avec un ordre basé sur la date de création
UPDATE podcasts 
SET display_order = row_number() OVER (ORDER BY created_at)
WHERE display_order = 0;

-- Créer un index pour optimiser les requêtes de tri
CREATE INDEX IF NOT EXISTS idx_podcasts_display_order ON podcasts(display_order);
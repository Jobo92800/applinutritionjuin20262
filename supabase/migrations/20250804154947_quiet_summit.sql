/*
  # Ajouter un deuxième bouton Call to Action aux podcasts

  1. Nouvelle colonne
    - `cta_button2` (jsonb, nullable)
      - Stocke les informations du deuxième bouton CTA
      - Structure: { "text": "string", "url": "string", "enabled": boolean }

  2. Sécurité
    - Colonne optionnelle pour les podcasts existants
    - Compatible avec la structure existante
*/

-- Ajouter la colonne cta_button2 si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcasts' AND column_name = 'cta_button2'
  ) THEN
    ALTER TABLE podcasts ADD COLUMN cta_button2 jsonb DEFAULT NULL;
  END IF;
END $$;
/*
  # Notifications push auto-hébergées

  1. Nouvelle table
    - `push_subscriptions` : un enregistrement par appareil abonné
      - `user_id` : propriétaire de l'abonnement
      - `endpoint` : adresse unique fournie par le navigateur (clé d'unicité)
      - `p256dh` / `auth` : clés de chiffrement du navigateur
      - `user_agent` : pour reconnaître l'appareil

  2. Sécurité (RLS)
    - Chaque utilisateur gère uniquement ses propres abonnements.
    - Les administrateurs peuvent lire tous les abonnements (pour envoyer à tous)
      et supprimer les abonnements devenus invalides.
*/

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- L'utilisateur gère ses propres abonnements
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Les administrateurs peuvent lire tous les abonnements (envoi groupé)
DROP POLICY IF EXISTS "Admins read all push subscriptions" ON push_subscriptions;
CREATE POLICY "Admins read all push subscriptions"
  ON push_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Les administrateurs peuvent supprimer les abonnements expirés
DROP POLICY IF EXISTS "Admins delete push subscriptions" ON push_subscriptions;
CREATE POLICY "Admins delete push subscriptions"
  ON push_subscriptions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

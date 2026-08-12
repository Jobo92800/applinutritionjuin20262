/*
  # Notifications programmées

  1. Nouvelle table
    - `scheduled_notifications` : messages envoyés automatiquement
      - `day_of_week` : 0 = dimanche … 6 = samedi, NULL = tous les jours
      - `hour` : heure d'envoi (0-23), exprimée en **heure de Paris**
      - `last_sent_on` : date du dernier envoi (empêche les doublons)

  2. Sécurité (RLS)
    - Seuls les administrateurs peuvent consulter et gérer les programmations.
    - La tâche planifiée y accède côté serveur avec la clé de service.
*/

CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  url text DEFAULT '/',
  day_of_week smallint CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
  hour smallint NOT NULL CHECK (hour >= 0 AND hour <= 23),
  active boolean DEFAULT true,
  last_sent_on date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Seuls les administrateurs gèrent les programmations
DROP POLICY IF EXISTS "Admins manage scheduled notifications" ON scheduled_notifications;
CREATE POLICY "Admins manage scheduled notifications"
  ON scheduled_notifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

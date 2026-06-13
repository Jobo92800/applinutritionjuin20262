CREATE TABLE IF NOT EXISTS food_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  image_url text NOT NULL DEFAULT '',
  foods jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_calories integer NOT NULL DEFAULT 0,
  total_protein numeric(8,2) NOT NULL DEFAULT 0,
  total_carbs numeric(8,2) NOT NULL DEFAULT 0,
  total_fat numeric(8,2) NOT NULL DEFAULT 0,
  meal_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE food_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own food analyses" ON food_analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own food analyses" ON food_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own food analyses" ON food_analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_food_analyses_user_id ON food_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_food_analyses_created_at ON food_analyses(created_at DESC);

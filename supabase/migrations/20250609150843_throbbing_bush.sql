/*
  # Schéma complet pour l'application MAbeautyplus Nutrition

  1. Tables principales
    - `profiles` - Profils utilisateurs étendus
    - `recipes` - Recettes avec ingrédients et étapes
    - `podcasts` - Podcasts avec fichiers audio
    - `meal_plans` - Planification des repas
    - `weight_entries` - Entrées de poids et mesures
    - `shopping_items` - Liste de courses
    - `weekly_progress` - Suivi des objectifs hebdomadaires
    - `user_badges` - Badges obtenus par les utilisateurs

  2. Sécurité
    - RLS activé sur toutes les tables
    - Politiques pour l'accès utilisateur et admin

  3. Stockage
    - Bucket pour les fichiers audio des podcasts
    - Bucket pour les images des recettes
*/

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des profils utilisateurs étendus
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des recettes
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image text,
  difficulty text NOT NULL CHECK (difficulty IN ('facile', 'moyen', 'difficile')),
  prep_time integer NOT NULL,
  servings integer NOT NULL,
  category text NOT NULL,
  ingredients jsonb NOT NULL DEFAULT '[]',
  steps text[] NOT NULL DEFAULT '{}',
  nutrition jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des podcasts
CREATE TABLE IF NOT EXISTS podcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  audio_url text NOT NULL,
  duration integer NOT NULL DEFAULT 0,
  category text NOT NULL,
  thumbnail text,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des planifications de repas
CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  meals jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Table des entrées de poids
CREATE TABLE IF NOT EXISTS weight_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  weight decimal(5,2) NOT NULL,
  date date NOT NULL,
  measurements jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Table des articles de courses
CREATE TABLE IF NOT EXISTS shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  quantity decimal(8,2) NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'pièce',
  category text NOT NULL DEFAULT 'autres',
  checked boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des objectifs hebdomadaires
CREATE TABLE IF NOT EXISTS weekly_goals (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  type text NOT NULL CHECK (type IN ('daily', 'weekly')),
  icon text NOT NULL,
  color text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Table du progrès hebdomadaire
CREATE TABLE IF NOT EXISTS weekly_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  goals jsonb NOT NULL DEFAULT '{}',
  badge_earned text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Table des badges utilisateurs
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Table des favoris
CREATE TABLE IF NOT EXISTS user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Politiques pour profiles
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Politiques pour recipes
CREATE POLICY "Anyone can read recipes"
  ON recipes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage recipes"
  ON recipes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Politiques pour podcasts
CREATE POLICY "Anyone can read podcasts"
  ON podcasts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage podcasts"
  ON podcasts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Politiques pour meal_plans
CREATE POLICY "Users can manage own meal plans"
  ON meal_plans
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Politiques pour weight_entries
CREATE POLICY "Users can manage own weight entries"
  ON weight_entries
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Politiques pour shopping_items
CREATE POLICY "Users can manage own shopping items"
  ON shopping_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Politiques pour weekly_goals
CREATE POLICY "Anyone can read weekly goals"
  ON weekly_goals
  FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Admins can manage weekly goals"
  ON weekly_goals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Politiques pour weekly_progress
CREATE POLICY "Users can manage own weekly progress"
  ON weekly_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Politiques pour user_badges
CREATE POLICY "Users can read own badges"
  ON user_badges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert badges"
  ON user_badges
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Politiques pour user_favorites
CREATE POLICY "Users can manage own favorites"
  ON user_favorites
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Fonction pour créer un profil automatiquement
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement un profil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Insérer les objectifs hebdomadaires par défaut
INSERT INTO weekly_goals (id, title, description, type, icon, color) VALUES
  ('supplements', 'Compléments alimentaires', 'Ai-je bien pris mes compléments ce matin ?', 'daily', '💊', 'bg-blue-100 text-blue-800'),
  ('water', 'Hydratation', 'Ai-je bien bu mes 2 litres d''eau ?', 'daily', '💧', 'bg-cyan-100 text-cyan-800'),
  ('podcast', 'Audio de la semaine', 'Ai-je bien écouté l''audio de la semaine ?', 'weekly', '🎧', 'bg-purple-100 text-purple-800'),
  ('homecooking', 'Cuisine maison', 'Ai-je cuisiné mes repas maison ?', 'daily', '👨‍🍳', 'bg-orange-100 text-orange-800')
ON CONFLICT (id) DO NOTHING;

-- Créer les buckets de stockage
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('podcast-audio', 'podcast-audio', true),
  ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques de stockage pour les podcasts
CREATE POLICY "Admins can upload podcast audio"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'podcast-audio' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Anyone can view podcast audio"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'podcast-audio');

-- Politiques de stockage pour les images de recettes
CREATE POLICY "Admins can upload recipe images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recipe-images' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Anyone can view recipe images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'recipe-images');
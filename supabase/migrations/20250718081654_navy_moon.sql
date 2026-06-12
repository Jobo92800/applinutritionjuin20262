/*
  # Fix user registration database error

  1. New Function
    - `handle_new_user()` - Automatically creates profile when new user signs up
    - Extracts name from user metadata
    - Sets default role and subscription_tier to 'user'

  2. New Trigger
    - `on_auth_user_created` - Fires after new user insertion in auth.users
    - Automatically calls handle_new_user() function

  3. Security
    - Function runs with SECURITY DEFINER for proper permissions
*/

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, subscription_tier)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Utilisateur'), -- Extracts the 'name' from the user's metadata or default
    'user', -- Default role for new users
    'user'  -- Default subscription tier for new users
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that fires after a new user is inserted into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
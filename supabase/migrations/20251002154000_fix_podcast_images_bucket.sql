/*
  # Fix podcast images bucket

  1. Nettoyage des politiques existantes
    - Suppression des politiques en conflit sur storage.objects

  2. Recréation du bucket
    - Suppression et recréation du bucket podcast-images
    - Configuration publique avec limite de taille

  3. Sécurité
    - Politiques avec des noms uniques pour éviter les conflits
    - Accès en lecture public pour afficher les images
    - Upload/Update/Delete restreints aux utilisateurs authentifiés
*/

-- Supprimer les politiques existantes pour podcast-images
DROP POLICY IF EXISTS "Images publiques en lecture" ON storage.objects;
DROP POLICY IF EXISTS "Upload par utilisateurs authentifiés" ON storage.objects;
DROP POLICY IF EXISTS "Modification par propriétaire" ON storage.objects;
DROP POLICY IF EXISTS "Suppression par propriétaire" ON storage.objects;
DROP POLICY IF EXISTS "Podcast images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload podcast images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own podcast images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own podcast images" ON storage.objects;

-- Supprimer et recréer le bucket
DELETE FROM storage.buckets WHERE id = 'podcast-images';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'podcast-images',
  'podcast-images',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
);

-- Politique : Lecture publique des images de podcasts
CREATE POLICY "podcast_images_public_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'podcast-images');

-- Politique : Upload par utilisateurs authentifiés
CREATE POLICY "podcast_images_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'podcast-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Politique : Update par le propriétaire
CREATE POLICY "podcast_images_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'podcast-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'podcast-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Politique : Delete par le propriétaire
CREATE POLICY "podcast_images_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'podcast-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

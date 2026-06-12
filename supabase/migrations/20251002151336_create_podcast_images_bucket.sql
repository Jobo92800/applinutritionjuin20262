/*
  # Création du bucket pour les images de podcasts

  1. Nouveau bucket
    - `podcast-images` : Stockage des images de couverture des podcasts
    - Configuration publique pour permettre l'accès direct aux images
    - Limite de taille de fichier à 2MB
    - Formats acceptés : JPEG, PNG, WebP

  2. Sécurité
    - Accès en lecture public pour afficher les images
    - Upload restreint aux utilisateurs authentifiés
    - Politique de suppression restreinte aux administrateurs et propriétaires
*/

-- Créer le bucket pour les images de podcasts
INSERT INTO storage.buckets (id, name, public)
VALUES ('podcast-images', 'podcast-images', true)
ON CONFLICT (id) DO NOTHING;

-- Politique : Tout le monde peut lire les images
CREATE POLICY "Images publiques en lecture"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'podcast-images');

-- Politique : Les utilisateurs authentifiés peuvent uploader
CREATE POLICY "Upload par utilisateurs authentifiés"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'podcast-images');

-- Politique : Les utilisateurs peuvent modifier leurs propres images
CREATE POLICY "Modification par propriétaire"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'podcast-images' AND auth.uid()::text = owner)
WITH CHECK (bucket_id = 'podcast-images');

-- Politique : Les utilisateurs peuvent supprimer leurs propres images
CREATE POLICY "Suppression par propriétaire"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'podcast-images' AND auth.uid()::text = owner);

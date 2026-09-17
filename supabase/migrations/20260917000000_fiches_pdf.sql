/*
  # Fiches récapitulatives PDF, une par cure

  Les fiches existent en deux variantes (cure 3 mois, cure 6 mois) dont
  seule l'en-tête diffère. Un épisode commun aux deux cures doit donc porter
  deux fiches : `fiches` associe à chaque cure le chemin de sa fiche dans le
  bucket privé, par exemple {"3_month": "fiches/…", "6_month": "fiches/…"}.

  Le bucket privé accepte désormais les PDF. Script ré-exécutable.
*/
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS fiches jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'application/pdf']
WHERE id = 'parcours-audio';

SELECT id, allowed_mime_types FROM storage.buckets WHERE id = 'parcours-audio';

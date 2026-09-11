/*
  # Parcours audio à déblocage séquentiel

  Fusion de « Mon Parcours » (Jobo92800/Applipodcast) dans l'application
  nutrition. Ce script ne fait qu'ajouter : aucune colonne, table ou règle
  existante n'est modifiée ni supprimée. L'application en ligne continue de
  fonctionner à l'identique pendant que la branche `parcours` se construit.

  1. `podcasts` devient la table des étapes
     - `fichier` : chemin dans le bucket privé (null tant que rien n'est déposé)
     - `actif`   : une étape désactivée n'apparaît plus dans le parcours
     Les colonnes `display_order` (numéro d'étape), `access_tiers` (cure) et
     `duration` (durée réelle en secondes, lue dans le MP3 par le formulaire
     d'admin, base du seuil des 90 %) existent déjà et jouent leur rôle tel quel.

  2. `profiles` porte l'état d'accès au parcours
     - `parcours_statut`          : 'actif' ou 'suspendu' (la thérapeute peut couper)
     - `parcours_debloque_manuel` : nombre d'étapes validées à la main par le centre

  3. Trois tables nouvelles, écrites uniquement par les fonctions Netlify
     - `parcours_progression` : par cliente et par étape, les secondes réellement
       écoutées (bitset en base64), la position de reprise, le taux calculé
       côté serveur et la validation
     - `parcours_appareils`   : les appareils reconnus d'une cliente
     - `parcours_acces_log`   : ouvertures, tentatives sur étapes verrouillées,
       actions du centre — premier endroit où regarder en cas de problème

  4. Un bucket privé `parcours-audio`
     Aucune règle sur storage.objects : ni anon ni authenticated n'y lisent ni
     n'y écrivent. Le serveur signe des adresses valables 2 h. Le bucket public
     `podcast-audio` reste en place jusqu'à la bascule.

  Script ré-exécutable sans risque.
*/

-- ---------------------------------------------------------------------------
-- 1. podcasts : les colonnes du parcours
-- ---------------------------------------------------------------------------
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS fichier text;
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS actif   boolean NOT NULL DEFAULT true;

-- Ces deux-là ont été ajoutées à la main (MIGRATION_PODCAST_ORDER.sql et
-- MIGRATION_TO_RUN.sql à la racine du dépôt). On s'assure qu'elles sont là.
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS display_order   integer NOT NULL DEFAULT 0;
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS week_challenges text[];

CREATE INDEX IF NOT EXISTS podcasts_ordre_idx ON podcasts (display_order);

-- ---------------------------------------------------------------------------
-- 2. profiles : l'état d'accès au parcours
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parcours_statut text NOT NULL DEFAULT 'actif';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parcours_debloque_manuel integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_parcours_statut_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_parcours_statut_check
      CHECK (parcours_statut IN ('actif', 'suspendu'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Les tables du parcours
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parcours_progression (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  podcast_id   uuid NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  couverture   text NOT NULL DEFAULT '',            -- secondes écoutées, bitset en base64
  position_sec integer NOT NULL DEFAULT 0,           -- où reprendre
  taux         numeric(4,3) NOT NULL DEFAULT 0,      -- calculé côté serveur, jamais reçu du navigateur
  terminee     boolean NOT NULL DEFAULT false,
  terminee_le  timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, podcast_id)
);
CREATE INDEX IF NOT EXISTS parcours_progression_user_idx ON parcours_progression (user_id);

CREATE TABLE IF NOT EXISTS parcours_appareils (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  empreinte    text NOT NULL,                        -- identifiant tiré par le navigateur, retenu localement
  ua           text,
  derniere_vue timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, empreinte)
);

CREATE TABLE IF NOT EXISTS parcours_acces_log (
  id         bigserial PRIMARY KEY,
  user_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action     text NOT NULL,
  ip         text,
  detail     text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS parcours_acces_log_ip_idx ON parcours_acces_log (ip, created_at DESC);

-- RLS activé sans aucune politique : rien n'est lisible ni modifiable depuis le
-- navigateur, même avec la clé publique. Seules les fonctions Netlify, avec la
-- clé secrète, y accèdent.
ALTER TABLE parcours_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcours_appareils   ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcours_acces_log   ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. Le bucket privé
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'parcours-audio',
  'parcours-audio',
  false,
  104857600,                                        -- 100 Mo par fichier
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Vérification
-- ---------------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM podcasts)                                             AS podcasts,
  (SELECT count(*) FROM podcasts WHERE fichier IS NOT NULL)                   AS avec_audio_prive,
  (SELECT count(*) FROM parcours_progression)                                 AS progressions,
  (SELECT count(*) FROM parcours_appareils)                                   AS appareils,
  (SELECT public FROM storage.buckets WHERE id = 'parcours-audio')            AS bucket_public,
  (SELECT public FROM storage.buckets WHERE id = 'podcast-audio')             AS ancien_bucket_public;

-- File lifetime: add expiry, expired marker, and thumbnail path to images
-- Run this against your Supabase project via the SQL editor or CLI.

ALTER TABLE public.images
  ADD COLUMN IF NOT EXISTS thumbnail_path text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS expired_at timestamptz;

-- Index for efficient cleanup queries: find expired images not yet cleaned
CREATE INDEX IF NOT EXISTS idx_images_cleanup
  ON public.images (expires_at)
  WHERE expired_at IS NULL;

COMMENT ON COLUMN public.images.thumbnail_path IS
  'Path to small JPEG thumbnail in storage (thumbnails/{user_id}/{imageId}.jpg). Persists after expiry.';
COMMENT ON COLUMN public.images.expires_at IS
  'When output files and the original will be deleted. Set at processing time based on plan tier.';
COMMENT ON COLUMN public.images.expired_at IS
  'When files were actually deleted by the cleanup job. NULL while files are still live.';

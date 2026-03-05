-- Conversion feature: format conversion jobs and outputs
-- Run via Supabase SQL editor or CLI.

CREATE TABLE IF NOT EXISTS public.conversion_jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_filename text NOT NULL,
  storage_path      text NOT NULL,
  source_format     text NOT NULL,  -- 'jpg','png','pdf', etc.
  page_count        int NOT NULL DEFAULT 1,  -- >1 for PDF input
  status            text NOT NULL DEFAULT 'pending', -- pending | processing | completed | failed
  created_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz,
  expired_at        timestamptz
);

CREATE TABLE IF NOT EXISTS public.conversion_outputs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid NOT NULL REFERENCES public.conversion_jobs(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  output_format text NOT NULL,   -- 'jpg','png','tiff','webp','gif','pdf'
  page_number   int,             -- null for non-PDF input; 1-based for PDF pages
  storage_path  text NOT NULL,
  filename      text NOT NULL,
  file_size     bigint,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversion_jobs_user
  ON public.conversion_jobs(user_id);

CREATE INDEX IF NOT EXISTS idx_conversion_jobs_cleanup
  ON public.conversion_jobs(expires_at)
  WHERE expired_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversion_outputs_job
  ON public.conversion_outputs(job_id);

-- RLS
ALTER TABLE public.conversion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own conversion jobs"
  ON public.conversion_jobs FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "users own conversion outputs"
  ON public.conversion_outputs FOR ALL
  USING (user_id = auth.uid());
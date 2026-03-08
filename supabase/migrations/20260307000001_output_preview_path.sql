-- Add preview_path column to processed_outputs for display-optimized preview images
ALTER TABLE public.processed_outputs
  ADD COLUMN IF NOT EXISTS preview_path text;

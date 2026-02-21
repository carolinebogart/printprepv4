-- ============================================================
-- PrintPrep v4 — Supabase Database Setup
-- ============================================================
-- Run this entire script in the Supabase SQL Editor in one go.
-- (Dashboard → SQL Editor → New Query → paste → Run)
-- ============================================================

-- Clean slate: drop everything in reverse dependency order
DROP POLICY IF EXISTS "notes_update" ON public.user_notes;
DROP POLICY IF EXISTS "notes_insert" ON public.user_notes;
DROP POLICY IF EXISTS "notes_select" ON public.user_notes;
DROP POLICY IF EXISTS "audit_log_insert" ON public.admin_audit_log;
DROP POLICY IF EXISTS "audit_log_select" ON public.admin_audit_log;
DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;
DROP POLICY IF EXISTS "outputs_delete_own" ON public.processed_outputs;
DROP POLICY IF EXISTS "outputs_select_own" ON public.processed_outputs;
DROP POLICY IF EXISTS "images_delete_own" ON public.images;
DROP POLICY IF EXISTS "images_update_own" ON public.images;
DROP POLICY IF EXISTS "images_insert_own" ON public.images;
DROP POLICY IF EXISTS "images_select_own" ON public.images;
DROP POLICY IF EXISTS "subscriptions_update_own" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_own" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
-- Also drop old-style policies from the first version
DROP POLICY IF EXISTS "users_own_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "users_own_images" ON public.images;
DROP POLICY IF EXISTS "users_own_outputs" ON public.processed_outputs;
DROP POLICY IF EXISTS "admins_only" ON public.admin_users;
DROP POLICY IF EXISTS "admins_audit_read" ON public.admin_audit_log;
DROP POLICY IF EXISTS "admins_notes_read" ON public.user_notes;

DROP TABLE IF EXISTS public.user_notes CASCADE;
DROP TABLE IF EXISTS public.admin_audit_log CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;
DROP TABLE IF EXISTS public.processed_outputs CASCADE;
DROP TABLE IF EXISTS public.images CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;

-- Drop ALL overloads of is_admin (handles leftover signatures)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT oid::regprocedure::text AS sig
        FROM pg_proc
        WHERE proname = 'is_admin'
          AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
    END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;


-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
BEGIN
    NEW.updated_at := pg_catalog.now();
    RETURN NEW;
END;
$$;

-- Admin check function (SECURITY DEFINER bypasses RLS — avoids
-- the circular dependency of admin_users querying itself)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid() AND is_active = true
    );
END;
$$;


-- ============================================================
-- 1. SUBSCRIPTIONS
-- ============================================================
CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
    stripe_customer_id text,
    stripe_subscription_id text,
    plan_name text DEFAULT 'none',
    status text DEFAULT 'inactive',
    credits_total integer DEFAULT 0,
    credits_used integer DEFAULT 0,
    current_period_start timestamptz,
    current_period_end timestamptz,
    scheduled_plan_id text,
    scheduled_plan_name text,
    scheduled_change_date timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription ON public.subscriptions(stripe_subscription_id);

CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ============================================================
-- 2. IMAGES
-- ============================================================
CREATE TABLE public.images (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    original_filename text NOT NULL,
    storage_path text NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    aspect_ratio numeric NOT NULL,
    format text,
    orientation text,
    file_size integer,
    status text DEFAULT 'pending',
    uploaded_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_images_user_id ON public.images(user_id);

CREATE TRIGGER images_updated_at
    BEFORE UPDATE ON public.images
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ============================================================
-- 3. PROCESSED OUTPUTS
-- ============================================================
CREATE TABLE public.processed_outputs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    image_id uuid REFERENCES public.images(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id),
    ratio_key text,
    size_label text,
    filename text NOT NULL,
    storage_path text NOT NULL,
    format text,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_outputs_image_id ON public.processed_outputs(image_id);
CREATE INDEX idx_outputs_user_id ON public.processed_outputs(user_id);
CREATE INDEX idx_outputs_status ON public.processed_outputs(status);


-- ============================================================
-- 4. ADMIN USERS
-- ============================================================
CREATE TABLE public.admin_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    role text NOT NULL CHECK (role IN ('super_admin', 'support_admin', 'read_only')),
    granted_by uuid REFERENCES public.admin_users(id),
    granted_at timestamptz DEFAULT now(),
    revoked_at timestamptz,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_admin_users_user_id ON public.admin_users(user_id);


-- ============================================================
-- 5. ADMIN AUDIT LOG
-- ============================================================
CREATE TABLE public.admin_audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
    action_type text NOT NULL,
    target_user_id uuid,
    changes jsonb DEFAULT '{}',
    admin_note text,
    ip_address inet,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_log_admin ON public.admin_audit_log(admin_user_id, created_at DESC);
CREATE INDEX idx_audit_log_target ON public.admin_audit_log(target_user_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON public.admin_audit_log(action_type, created_at DESC);
CREATE INDEX idx_audit_log_created ON public.admin_audit_log(created_at DESC);


-- ============================================================
-- 6. USER NOTES
-- ============================================================
CREATE TABLE public.user_notes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    admin_user_id uuid REFERENCES public.admin_users(id),
    note_type text NOT NULL CHECK (note_type IN ('general', 'support', 'billing', 'warning', 'ban')),
    content text NOT NULL,
    is_pinned boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_user_notes_user_id ON public.user_notes(user_id);

CREATE TRIGGER user_notes_updated_at
    BEFORE UPDATE ON public.user_notes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- The service role key (used in API routes) ALWAYS bypasses RLS.
-- These policies only affect the browser client and server client
-- that carry the user's JWT.
-- ============================================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

-- SUBSCRIPTIONS: users own their row
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_insert_own" ON public.subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subscriptions_update_own" ON public.subscriptions
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- IMAGES: users own their rows
CREATE POLICY "images_select_own" ON public.images
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "images_insert_own" ON public.images
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "images_update_own" ON public.images
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "images_delete_own" ON public.images
    FOR DELETE USING (auth.uid() = user_id);

-- PROCESSED OUTPUTS: users own their rows
CREATE POLICY "outputs_select_own" ON public.processed_outputs
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "outputs_delete_own" ON public.processed_outputs
    FOR DELETE USING (auth.uid() = user_id);

-- ADMIN USERS: uses is_admin() function to avoid circular self-reference
CREATE POLICY "admin_users_select" ON public.admin_users
    FOR SELECT USING (public.is_admin());

-- ADMIN AUDIT LOG: admins can read and insert
CREATE POLICY "audit_log_select" ON public.admin_audit_log
    FOR SELECT USING (public.is_admin());
CREATE POLICY "audit_log_insert" ON public.admin_audit_log
    FOR INSERT WITH CHECK (public.is_admin());

-- USER NOTES: admins can read, insert, update
CREATE POLICY "notes_select" ON public.user_notes
    FOR SELECT USING (public.is_admin());
CREATE POLICY "notes_insert" ON public.user_notes
    FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "notes_update" ON public.user_notes
    FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ============================================================
-- STORAGE BUCKET (do this manually in the Dashboard)
-- ============================================================
-- Storage → New Bucket → Name: "printprep-images" → Private
-- Set file size limit to 50 MB
--
-- Then add storage policies (Storage → Policies → New Policy):
--
-- 1. Policy: "users_upload_own"  | Operation: INSERT
--    Expression: (auth.uid()::text = (storage.foldername(name))[1])
--
-- 2. Policy: "users_read_own"   | Operation: SELECT
--    Expression: (auth.uid()::text = (storage.foldername(name))[1])
--
-- 3. Policy: "users_delete_own" | Operation: DELETE
--    Expression: (auth.uid()::text = (storage.foldername(name))[1])
--
-- The service role key bypasses RLS, so server-side ops always work.


-- ============================================================
-- MAKE YOURSELF AN ADMIN
-- ============================================================
-- After registering, get your user ID from:
--   Dashboard → Authentication → Users → click your user → copy id
--
-- Then run:
-- INSERT INTO public.admin_users (user_id, role)
-- VALUES ('YOUR_USER_ID_HERE', 'super_admin');

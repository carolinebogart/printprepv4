# Database Schema — Full SQL DDL

## Table: `subscriptions`

```sql
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
    scheduled_change_date timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);

CREATE OR REPLACE FUNCTION public.update_subscriptions_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
BEGIN
    NEW.updated_at := pg_catalog.now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_subscriptions_updated_at();
```

**`plan_name` values:** `none` | `monthly_starter` | `monthly_professional` | `monthly_enterprise` | `yearly_starter` | `yearly_professional` | `yearly_enterprise`

**`status` values:** `active` | `cancelled` | `past_due` | `incomplete` | `paused` | `inactive`

---

## Table: `images`

```sql
CREATE TABLE public.images (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    original_filename text NOT NULL,
    original_path text NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    aspect_ratio numeric NOT NULL,
    processing_status text DEFAULT 'pending',
    uploaded_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

Orientation is derived at runtime: `width > height ? 'landscape' : 'portrait'`

**`processing_status` values:** `pending` | `processing` | `completed` | `failed`

---

## Table: `processed_outputs`

```sql
CREATE TABLE public.processed_outputs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    image_id uuid REFERENCES public.images(id) NOT NULL,
    output_size_id uuid,
    output_path text NOT NULL,
    strategy_used text NOT NULL,
    strategy_params jsonb DEFAULT '{}',
    dpi integer DEFAULT 300,
    approved boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);
```

`strategy_params` stores: crop coordinates, background color, shadow setting, size in inches.

---

## Table: `output_sizes`

```sql
CREATE TABLE public.output_sizes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    width_inches numeric NOT NULL,
    height_inches numeric NOT NULL,
    aspect_ratio numeric NOT NULL,
    is_active boolean DEFAULT true,
    user_id uuid  -- was removed in migration 20260226053743
);
```

Reference table only — no active `user_id` column.

---

## Table: `admin_users`

```sql
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
```

---

## Table: `admin_audit_log`

```sql
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

CREATE INDEX idx_audit_log_admin ON admin_audit_log(admin_user_id, created_at DESC);
CREATE INDEX idx_audit_log_target ON admin_audit_log(target_user_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON admin_audit_log(action_type, created_at DESC);
CREATE INDEX idx_audit_log_created ON admin_audit_log(created_at DESC);
```

---

## Table: `user_notes`

```sql
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
```

---

## RLS Policies

```sql
CREATE POLICY "users_own_images" ON images
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_subscriptions" ON subscriptions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_outputs" ON processed_outputs
    FOR ALL USING (
        image_id IN (SELECT id FROM images WHERE user_id = auth.uid())
    );

CREATE POLICY "admins_only" ON admin_users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
    );

CREATE POLICY "admins_audit_log" ON admin_audit_log
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
    );

CREATE POLICY "admins_user_notes" ON user_notes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
    );
```

---

## Database Functions

```sql
-- Check if current user is admin with minimum role
CREATE OR REPLACE FUNCTION public.is_admin(min_role text DEFAULT 'read_only')
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_catalog AS $$
DECLARE
    v_role text;
    v_role_level int;
    v_min_level int;
BEGIN
    SELECT role INTO v_role FROM public.admin_users
    WHERE user_id = auth.uid() AND is_active = true;
    IF v_role IS NULL THEN RETURN false; END IF;
    v_role_level := CASE v_role
        WHEN 'super_admin' THEN 3
        WHEN 'support_admin' THEN 2
        WHEN 'read_only' THEN 1
        ELSE 0 END;
    v_min_level := CASE min_role
        WHEN 'super_admin' THEN 3
        WHEN 'support_admin' THEN 2
        WHEN 'read_only' THEN 1
        ELSE 0 END;
    RETURN v_role_level >= v_min_level;
END;
$$;

-- Admin credit adjustment with audit logging
CREATE OR REPLACE FUNCTION public.admin_update_credits(
    p_user_id uuid, p_new_credits integer, p_admin_note text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_catalog AS $$
DECLARE
    v_old_credits integer;
    v_admin_user_id uuid;
BEGIN
    SELECT id INTO v_admin_user_id FROM public.admin_users
    WHERE user_id = auth.uid() AND is_active = true;
    SELECT credits_total INTO v_old_credits FROM public.subscriptions
    WHERE user_id = p_user_id;
    UPDATE public.subscriptions SET credits_total = p_new_credits
    WHERE user_id = p_user_id;
    INSERT INTO public.admin_audit_log (admin_user_id, action_type, target_user_id, changes, admin_note)
    VALUES (v_admin_user_id, 'credit_adjustment', p_user_id,
        jsonb_build_object('old_credits', v_old_credits, 'new_credits', p_new_credits),
        p_admin_note);
    RETURN jsonb_build_object('success', true, 'old_credits', v_old_credits, 'new_credits', p_new_credits);
END;
$$;

-- Truncate audit log (super admin only)
CREATE OR REPLACE FUNCTION public.admin_truncate_audit_log(
    p_before_date timestamptz, p_admin_note text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_catalog AS $$
DECLARE
    v_deleted_count integer;
    v_admin_user_id uuid;
BEGIN
    SELECT id INTO v_admin_user_id FROM public.admin_users
    WHERE user_id = auth.uid() AND is_active = true AND role = 'super_admin';
    IF v_admin_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Super admin required');
    END IF;
    DELETE FROM public.admin_audit_log WHERE created_at < p_before_date;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    INSERT INTO public.admin_audit_log (admin_user_id, action_type, changes, admin_note)
    VALUES (v_admin_user_id, 'audit_log_truncate',
        jsonb_build_object('deleted_count', v_deleted_count, 'before_date', p_before_date),
        p_admin_note);
    RETURN jsonb_build_object('success', true, 'deleted_count', v_deleted_count);
END;
$$;
```

## Database Security Rules Summary

- **Trigger functions:** `SECURITY DEFINER`, `SET search_path = public, pg_catalog`, use `pg_catalog.now()`
- **Application functions:** `SECURITY INVOKER`, `SET search_path = public, pg_catalog`, fully qualify table names
- Never leave `search_path` unset or use `SECURITY DEFINER` on application functions

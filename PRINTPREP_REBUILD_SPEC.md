# PrintPrep - Full Rebuild Specification

**Purpose:** Complete specification for rebuilding PrintPrep from scratch using a Node.js stack while keeping Supabase and Stripe as backend services.

**Original Stack:** Flask (Python), Jinja2, Tailwind CSS, Vanilla JS, Pillow, Supabase, Stripe
**Target Stack:** Next.js (Node.js), React, Tailwind CSS, Sharp (image processing), Supabase, Stripe

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Recommended Stack](#2-recommended-stack)
3. [Database Schema](#3-database-schema)
4. [Authentication System](#4-authentication-system)
5. [Image Upload & Metadata](#5-image-upload--metadata)
6. [Crop Tool (Core Feature)](#6-crop-tool-core-feature)
7. [Image Processing Engine](#7-image-processing-engine)
8. [Download System](#8-download-system)
9. [Credit & Subscription System](#9-credit--subscription-system)
10. [Stripe Integration](#10-stripe-integration)
11. [Account Management](#11-account-management)
12. [Image History](#12-image-history)
13. [Admin System](#13-admin-system)
14. [UI/UX Specification](#14-uiux-specification)
15. [API Routes](#15-api-routes)
16. [Environment Variables](#16-environment-variables)
17. [File Naming & Output Format](#17-file-naming--output-format)
18. [Error Handling Patterns](#18-error-handling-patterns)
19. [Performance Optimizations](#19-performance-optimizations)
20. [Security Requirements](#20-security-requirements)
21. [Known Gotchas](#21-known-gotchas)

---

## 1. Product Overview

**PrintPrep** is a SaaS tool for resizing artwork to multiple print-ready formats without warping or unwanted cropping.

**Primary Users:** Etsy digital printable sellers who need to offer artwork in standard print sizes (2x3, 3x4, 4:5, 8:11, ISO A-series).

**Core Workflow:**
1. User uploads artwork (image file)
2. System detects orientation (portrait/landscape) and extracts metadata
3. User selects target print ratios (e.g., 2:3, 3:4, 4:5)
4. Interactive crop tool shows how artwork maps to each ratio
5. User adjusts crop position, picks background color for padding areas
6. System generates all output files at 300 DPI
7. User downloads individual files or ZIP archive

**Business Model:** Subscription-based with credits. 1 credit = 1 image processed (regardless of how many output sizes are generated from that image).

---

## 2. Recommended Stack

### Framework: Next.js (App Router)

**Why Next.js:**
- Full-stack: React frontend + API routes in one project
- Deploys to any Node.js hosting (supported by user's VPS provider)
- Server-side rendering for fast initial page loads
- API routes replace Flask blueprints
- Middleware for auth checks (replaces decorators)

### Dependencies

```json
{
  "dependencies": {
    "next": "latest",
    "react": "latest",
    "react-dom": "latest",
    "@supabase/supabase-js": "^2.x",
    "@supabase/ssr": "latest",
    "stripe": "latest",
    "sharp": "latest",
    "archiver": "latest",
    "cropperjs": "latest",
    "react-cropper": "latest",
    "tailwindcss": "latest",
    "zustand": "latest"
  }
}
```

**Key Replacements:**
| Python (Original) | Node.js (New) |
|---|---|
| Flask | Next.js API routes |
| Jinja2 templates | React components (JSX) |
| Pillow (PIL) | Sharp |
| `python-dotenv` | Next.js built-in `.env.local` |
| Flask session | Supabase Auth + cookies (via `@supabase/ssr`) |
| gunicorn | Node.js runtime (built into hosting) |
| Cropper.js (vanilla) | react-cropper (React wrapper) |

### Suggested Directory Structure

```
printprep/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout (nav, footer, providers)
│   ├── page.tsx                 # Landing/upload page
│   ├── crop/page.tsx            # Crop tool
│   ├── download/page.tsx        # Download page
│   ├── history/page.tsx         # Image history
│   ├── pricing/page.tsx         # Pricing tiers
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── callback/page.tsx    # Email verification callback
│   │   └── actions.ts           # Server actions for auth
│   ├── account/
│   │   ├── page.tsx             # Dashboard
│   │   ├── settings/page.tsx
│   │   ├── usage/page.tsx
│   │   └── subscription/page.tsx
│   ├── admin/
│   │   ├── page.tsx             # Admin dashboard
│   │   ├── users/page.tsx
│   │   ├── users/[id]/page.tsx
│   │   ├── audit-log/page.tsx
│   │   └── images/page.tsx
│   └── api/                     # API routes
│       ├── upload/route.ts
│       ├── process/route.ts
│       ├── download/[id]/route.ts
│       ├── download-zip/[imageId]/route.ts
│       ├── stripe/
│       │   ├── checkout/route.ts
│       │   ├── portal/route.ts
│       │   └── webhook/route.ts
│       └── admin/
│           ├── users/route.ts
│           ├── credits/route.ts
│           ├── notes/route.ts
│           └── audit-log/route.ts
├── components/
│   ├── CropTool.tsx             # Cropper.js wrapper
│   ├── FileUpload.tsx           # Drag & drop upload
│   ├── PricingCard.tsx
│   ├── SubscriptionBanner.tsx
│   ├── DeleteConfirmModal.tsx
│   └── AdminLayout.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser client
│   │   ├── server.ts            # Server client (cookies)
│   │   ├── service.ts           # Service role client
│   │   └── middleware.ts        # Auth middleware helper
│   ├── stripe.ts                # Stripe helpers
│   ├── image-processor.ts       # Sharp-based processing
│   ├── output-sizes.ts          # Ratio & size definitions
│   └── credits.ts               # Credit system logic
├── middleware.ts                 # Next.js middleware (auth, admin)
├── .env.local                   # Environment variables
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## 3. Database Schema

All tables live in Supabase (PostgreSQL). The existing schema can be reused as-is. No migration needed.

### Table: `subscriptions`

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

-- Indexes
CREATE UNIQUE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);

-- Auto-update timestamp trigger
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

**Status values:** `active`, `cancelled`, `past_due`, `incomplete`, `paused`, `inactive`
**Plan names:** `none`, `monthly_starter`, `monthly_professional`, `monthly_enterprise`, `yearly_starter`, `yearly_professional`, `yearly_enterprise`

### Table: `images`

```sql
CREATE TABLE public.images (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    project_id uuid,
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

**Processing status values:** `pending`, `processing`, `completed`, `failed`
**Orientation** is derived at runtime: `width > height ? 'landscape' : 'portrait'`

### Table: `processed_outputs`

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

**strategy_params** stores: crop coordinates, background color, shadow setting, size in inches.

### Table: `output_sizes`

```sql
CREATE TABLE public.output_sizes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    width_inches numeric NOT NULL,
    height_inches numeric NOT NULL,
    aspect_ratio numeric NOT NULL,
    is_active boolean DEFAULT true,
    user_id uuid
);
```

### Table: `admin_users`

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

**Role hierarchy:** `super_admin` > `support_admin` > `read_only`

### Table: `admin_audit_log`

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

**Action types:** `credit_adjustment`, `profile_update`, `note_added`, `image_deleted`, `bulk_image_deleted`, `audit_log_truncate`

### Table: `user_notes`

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

### RLS Policies (Apply to All Tables)

```sql
-- Users can only see their own data
CREATE POLICY "users_own_images" ON images
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_subscriptions" ON subscriptions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_outputs" ON processed_outputs
    FOR ALL USING (
        image_id IN (SELECT id FROM images WHERE user_id = auth.uid())
    );

-- Admin tables: only admins can access
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

### Database Functions

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

### Database Security Rules

All functions MUST follow these patterns:

- **Trigger functions:** `SECURITY DEFINER`, `SET search_path = public, pg_catalog`, use `pg_catalog.now()`
- **Application functions:** `SECURITY INVOKER`, `SET search_path = public, pg_catalog`, fully qualify table names (`public.tablename`)
- **Never** leave search_path unset, use unqualified table names, or use `SECURITY DEFINER` on application functions

---

## 4. Authentication System

### Provider: Supabase Auth

Use `@supabase/ssr` for cookie-based auth in Next.js. This replaces Flask session-based JWT storage.

### Flows

**Registration:**
1. User submits email + password
2. Call `supabase.auth.signUp({ email, password, options: { emailRedirectTo: '/auth/callback' } })`
3. If email confirmation required: show "check your email" message, redirect to login
4. If auto-confirmed: session created automatically, redirect to pricing page
5. On registration, create a default subscription record: `plan_name='none', status='inactive', credits_total=0`

**Login:**
1. User submits email + password
2. Call `supabase.auth.signInWithPassword({ email, password })`
3. Session cookies set automatically via `@supabase/ssr`
4. Redirect to `next` URL parameter or home page
5. If email not confirmed: show "please check email for confirmation link"

**Email Confirmation Callback:**
1. Supabase redirects to `/auth/callback` with tokens in URL hash
2. Client-side JavaScript extracts `access_token` and `refresh_token` from hash
3. Call `supabase.auth.setSession()` to establish session
4. Redirect to home page

**Logout:**
1. Call `supabase.auth.signOut()`
2. Cookies cleared automatically
3. Redirect to home page

**Token Refresh:**
- `@supabase/ssr` handles token refresh automatically via middleware
- In the original app, this was manual and error-prone (see Known Gotchas)
- The Next.js `@supabase/ssr` package handles this correctly out of the box

### Middleware (Auth Protection)

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Protected routes that require authentication
const protectedRoutes = ['/account', '/history', '/admin']

// Admin routes that require admin role
const adminRoutes = ['/admin']

export async function middleware(request) {
    // Create Supabase client with cookie handling
    // Check auth for protected routes
    // Check admin role for admin routes
    // Redirect to login if not authenticated
    // Redirect to 403 if not admin
}
```

---

## 5. Image Upload & Metadata

### Upload Flow

1. User selects file via click or drag-and-drop
2. Frontend validates:
   - File exists and has a name
   - Extension is allowed: `jpg, jpeg, png, tiff, webp, bmp`
   - File size under 50 MB
3. POST file to `/api/upload` as `FormData`
4. Server-side:
   - Validate file again (extension, size)
   - Generate unique filename: `{uuid}.{ext}`
   - Upload to Supabase Storage bucket `printprep-images` at path `uploads/{uuid}.{ext}`
   - Extract metadata using Sharp:
     - `width`, `height` (pixels)
     - `aspect_ratio` = width / height (rounded to 4 decimals)
     - `format` (jpeg, png, etc.)
     - `orientation` = width > height ? 'landscape' : 'portrait'
   - Create `images` record in database
   - Return image info + available ratios for detected orientation

### Metadata Extraction (Sharp equivalent of Pillow)

```typescript
import sharp from 'sharp'

async function getImageInfo(buffer: Buffer) {
    const metadata = await sharp(buffer).metadata()
    const { width, height, format } = metadata
    const aspectRatio = Math.round((width / height) * 10000) / 10000
    const orientation = width > height ? 'landscape' : 'portrait'
    return { width, height, aspectRatio, format, orientation }
}
```

### Drag & Drop UI

- Dashed border drop zone
- Visual feedback on drag-over (blue border, slight scale up)
- Shows file name and size after selection
- Shows extracted metadata after upload (dimensions, ratio, format)
- Upload button disabled until file selected
- Loading spinner during upload

---

## 6. Crop Tool (Core Feature)

This is the heart of the application. Get this right.

### Cropper.js Integration

Use `react-cropper` (React wrapper for Cropper.js) or raw Cropper.js in a React component.

**Cropper Configuration:**
```javascript
{
    aspectRatio: targetRatio,      // Locked to selected ratio (e.g., 0.6667 for 2:3)
    viewMode: 0,                   // Allow crop box to extend beyond image
    dragMode: 'move',              // Drag the IMAGE, not the crop box
    cropBoxMovable: false,         // Crop box stays centered
    cropBoxResizable: false,       // Crop box size is fixed
    zoomable: true,
    zoomOnWheel: true,
    zoomOnTouch: true,
    autoCropArea: 1,               // Start with maximum crop area
    responsive: true,
    restore: false,
    guides: false,
    center: false,
    highlight: false,
    background: true               // Show checkered background for beyond-image areas
}
```

### How the Crop Tool Works

The crop box is FIXED (doesn't move or resize). The user moves/zooms the IMAGE behind the crop box. This is the opposite of how most crop tools work.

**Sacrifice Direction Logic:**
- If target ratio is WIDER than original: crop will sacrifice top/bottom (vertical areas removed)
- If target ratio is NARROWER than original: crop will sacrifice left/right (horizontal areas removed)
- If ratios match (within 0.01 tolerance): no sacrifice needed

```typescript
function getSacrificeDirection(originalRatio: number, targetRatio: number): string {
    if (Math.abs(originalRatio - targetRatio) < 0.01) return 'none'
    if (targetRatio > originalRatio) return 'horizontal' // target wider, sacrifice left/right
    return 'vertical' // target narrower, sacrifice top/bottom
}
```

### Multi-Ratio Workflow

1. Left sidebar shows checkboxes for all available ratios
2. User checks which ratios they want to generate
3. For each checked ratio, user adjusts the crop
4. "Previous" and "Next" buttons navigate between selected ratios
5. Crop state is saved per ratio (position, zoom, color, sizes)
6. All crop data is sent together when user clicks "Generate"

### Crop Data Structure (Per Ratio)

```typescript
interface CropData {
    cropBox: {
        x: number      // Can be NEGATIVE (extends beyond image)
        y: number       // Can be NEGATIVE
        width: number   // Crop box width in pixels
        height: number  // Crop box height in pixels
    }
    canvasData: object  // Cropper.js canvas state (for restoring position)
    imageData: object   // Cropper.js image state
    targetSizes: Array<{
        width: number   // inches
        height: number  // inches
        label: string   // e.g., "4x6", "24x36"
        selected: boolean
    }>
    backgroundColor: string  // '#FFFFFF' or 'transparent'
    useShadow: boolean
}
```

### Background Color Picker

Three ways to choose background color:
1. **Color picker input** - standard HTML color picker
2. **Eyedropper tool** - click on the image to sample a color
3. **Transparent button** - set background to transparent (output will be PNG)

**Eyedropper Implementation:**
1. User clicks eyedropper button
2. Cursor changes to crosshair
3. Instruction overlay appears: "Click on the image to pick a color"
4. User clicks on image area
5. Read pixel color using canvas `getImageData(x, y, 1, 1)`
6. Convert RGB to hex
7. Update color picker and crop data
8. Deactivate eyedropper mode

**Shadow Checkbox:**
- When checked, a drop shadow is added to the image portion when it doesn't fill the entire output (padding scenario)
- Shadow: black, 50% opacity, 20px Gaussian blur, offset 10px down-right

### Size Selection Per Ratio

Each ratio has multiple standard print sizes. Display as checkboxes:

```
2:3 Ratio:
[x] 4x6 in  (1200x1800 px)
[x] 8x12 in (2400x3600 px)
[x] 16x24 in (4800x7200 px)
[x] 24x36 in (7200x10800 px)
```

User can select which sizes to generate for each ratio.

---

## 7. Image Processing Engine

### Core Algorithm: `applyCropAndResize`

This replaces the Python Pillow processing with Sharp (Node.js).

**Parameters:**
- `originalBuffer`: Buffer of original image
- `cropData`: `{ x, y, width, height }` - crop box coordinates (can be negative)
- `targetWidthInches`, `targetHeightInches`: output dimensions in inches
- `dpi`: default 300
- `backgroundColor`: `'transparent'` or hex string like `'#FFFFFF'`
- `useShadow`: boolean

**Algorithm:**

```
Step 1: Calculate intersection of crop box with actual image
    actualX = max(0, cropX)
    actualY = max(0, cropY)
    actualX2 = min(imageWidth, cropX + cropWidth)
    actualY2 = min(imageHeight, cropY + cropHeight)
    croppedWidth = actualX2 - actualX
    croppedHeight = actualY2 - actualY

Step 2: Extract (crop) the available portion from original image
    croppedImage = originalImage.extract({
        left: actualX, top: actualY,
        width: croppedWidth, height: croppedHeight
    })

Step 3: Calculate target dimensions in pixels
    targetWidthPx = Math.round(targetWidthInches * dpi)
    targetHeightPx = Math.round(targetHeightInches * dpi)

Step 4: Calculate scale factor
    scaleX = croppedWidth / cropWidth
    scaleY = croppedHeight / cropHeight

Step 5a: If image fills crop box (scale >= 0.99):
    - Resize directly to target dimensions
    - Use Lanczos resampling (sharp's default)

Step 5b: If image is smaller than crop box (padding needed):
    - Calculate output image dimensions:
        outputImgWidth = Math.round(croppedWidth * (targetWidthPx / cropWidth))
        outputImgHeight = Math.round(croppedHeight * (targetHeightPx / cropHeight))
    - Resize cropped image to outputImgWidth x outputImgHeight
    - Create canvas at targetWidthPx x targetHeightPx filled with backgroundColor
    - Calculate paste position:
        offsetX = (actualX - cropX) if cropX < 0 else 0
        offsetY = (actualY - cropY) if cropY < 0 else 0
        pasteX = Math.round(offsetX * (targetWidthPx / cropWidth))
        pasteY = Math.round(offsetY * (targetHeightPx / cropHeight))
    - If useShadow: composite shadow layer at offset position
    - Composite resized image onto canvas at (pasteX, pasteY)

Step 6: Determine output format
    - If backgroundColor is 'transparent': output PNG (RGBA)
    - Otherwise: output JPEG (RGB), quality 95

Step 7: Set DPI metadata
    - PNG: set density to 300
    - JPEG: set density to 300
```

### Sharp Implementation Notes

```typescript
import sharp from 'sharp'

// Crop + resize for print output
async function applyCropAndResize(
    originalBuffer: Buffer,
    cropData: { x: number, y: number, width: number, height: number },
    targetWidthInches: number,
    targetHeightInches: number,
    dpi = 300,
    backgroundColor = '#FFFFFF',
    useShadow = false
): Promise<{ buffer: Buffer, format: 'png' | 'jpeg' }> {

    const metadata = await sharp(originalBuffer).metadata()
    const imgWidth = metadata.width!
    const imgHeight = metadata.height!

    // Step 1: intersection
    const actualX = Math.max(0, cropData.x)
    const actualY = Math.max(0, cropData.y)
    const actualX2 = Math.min(imgWidth, cropData.x + cropData.width)
    const actualY2 = Math.min(imgHeight, cropData.y + cropData.height)
    const croppedWidth = actualX2 - actualX
    const croppedHeight = actualY2 - actualY

    const targetWidthPx = Math.round(targetWidthInches * dpi)
    const targetHeightPx = Math.round(targetHeightInches * dpi)

    const useTransparency = backgroundColor === 'transparent'
    const format = useTransparency ? 'png' : 'jpeg'

    // Step 2: crop
    const cropped = sharp(originalBuffer).extract({
        left: actualX, top: actualY,
        width: croppedWidth, height: croppedHeight
    })

    const scaleX = croppedWidth / cropData.width
    const scaleY = croppedHeight / cropData.height
    const fillsBox = Math.min(scaleX, scaleY) >= 0.99

    if (fillsBox) {
        // Direct resize to target
        const result = await cropped
            .resize(targetWidthPx, targetHeightPx, { fit: 'fill' })
            .withMetadata({ density: dpi })

        if (format === 'png') {
            return { buffer: await result.png().toBuffer(), format: 'png' }
        } else {
            return { buffer: await result.jpeg({ quality: 95 }).toBuffer(), format: 'jpeg' }
        }
    } else {
        // Padding needed - create canvas and composite
        const outputImgWidth = Math.round(croppedWidth * (targetWidthPx / cropData.width))
        const outputImgHeight = Math.round(croppedHeight * (targetHeightPx / cropData.height))

        const resizedImage = await cropped
            .resize(outputImgWidth, outputImgHeight)
            .toBuffer()

        const offsetX = cropData.x < 0 ? (actualX - cropData.x) : 0
        const offsetY = cropData.y < 0 ? (actualY - cropData.y) : 0
        const pasteX = Math.round(offsetX * (targetWidthPx / cropData.width))
        const pasteY = Math.round(offsetY * (targetHeightPx / cropData.height))

        const bgColor = useTransparency
            ? { r: 255, g: 255, b: 255, alpha: 0 }
            : hexToRgb(backgroundColor)

        const canvas = sharp({
            create: {
                width: targetWidthPx,
                height: targetHeightPx,
                channels: useTransparency ? 4 : 3,
                background: bgColor
            }
        })

        const composites = []

        // Optional shadow
        if (useShadow) {
            // Create shadow as a blurred dark rectangle
            const shadow = await sharp({
                create: {
                    width: outputImgWidth,
                    height: outputImgHeight,
                    channels: 4,
                    background: { r: 0, g: 0, b: 0, alpha: 128 }
                }
            }).blur(20).png().toBuffer()

            composites.push({
                input: shadow,
                left: pasteX + 10,
                top: pasteY + 10
            })
        }

        composites.push({
            input: resizedImage,
            left: pasteX,
            top: pasteY
        })

        const result = canvas.composite(composites).withMetadata({ density: dpi })

        if (format === 'png') {
            return { buffer: await result.png().toBuffer(), format: 'png' }
        } else {
            return { buffer: await result.jpeg({ quality: 95 }).toBuffer(), format: 'jpeg' }
        }
    }
}
```

### Batch Processing: `processAllCrops`

For each selected ratio, for each selected size within that ratio:
1. Call `applyCropAndResize()` with the ratio's crop data and the size's dimensions
2. Generate output filename (see File Naming section)
3. Upload to Supabase Storage at `outputs/{imageId}/{filename}`
4. Create `processed_outputs` record in database
5. Continue on error (don't fail entire batch for one bad size)

Return array of results: `{ filename, ratio, size, success, error? }`

### Image Quality Note: Upscaling Limitations

Sharp uses Lanczos3 resampling, which is best-in-class for downscaling and minor upscaling. However, for **significant upscales** (2x+), traditional resampling can only interpolate existing pixels - the output will be technically correct at 300 DPI but may appear soft when printed.

**This is acceptable for the initial build.** Most users uploading digital artwork will have source files large enough that little or no upscaling is needed. The current Python/Pillow app has the same limitation.

**Future Enhancement: AI Upscaling (Optional Pre-Processing Step)**

For a premium feature, add an AI-based upscaling step before the crop/resize pipeline:

1. **Real-ESRGAN** - Gold standard for image super-resolution. Install the binary on the server and call as a subprocess. Produces dramatically sharper results at 2-4x upscale. Adds 5-30 seconds per image depending on size and GPU availability.
   ```typescript
   // Example: upscale 2x before processing
   import { execFile } from 'child_process'

   async function aiUpscale(inputPath: string, outputPath: string, scale: number = 2) {
       return new Promise((resolve, reject) => {
           execFile('realesrgan-ncnn-vulkan', [
               '-i', inputPath,
               '-o', outputPath,
               '-s', String(scale),
               '-n', 'realesrgan-x4plus'  // model name
           ], (error) => error ? reject(error) : resolve(outputPath))
       })
   }
   ```

2. **Hugging Face Inference API** - Cloud-based alternative, no local GPU needed. Call an upscaling model via API, receive the enhanced image, then feed it into the Sharp pipeline.

3. **Implementation approach:**
   - Detect when upscaling would exceed a threshold (e.g., output pixels > 1.5x input pixels)
   - Offer user a toggle: "AI Enhance" (slower, higher quality) vs "Standard" (fast)
   - AI-upscale the source image first, then run the normal crop/resize pipeline
   - The core Sharp processing algorithm stays unchanged - it just receives a higher-res input buffer
   - Consider charging extra credits for AI-enhanced processing (compute cost is higher)

This can be added after the initial rebuild without changing any existing processing logic.

---

## 8. Download System

### Single File Download

- **Route:** `GET /api/download/[outputId]`
- Fetch `processed_outputs` record
- Download file from Supabase Storage
- Return as attachment with proper MIME type and filename

### ZIP Download

- **Route:** `GET /api/download-zip/[imageId]`
- Fetch all `processed_outputs` for the image
- Download each file from storage
- Create ZIP archive using `archiver` package
- Stream ZIP to client
- Filename: `printprep_outputs_{imageId}.zip`

### Download Page UI

- List of all generated files with download links
- Each shows: filename, ratio, size (inches), dimensions (pixels)
- "Download All as ZIP" button
- "Process Another Image" link
- Preview thumbnails in a grid
- Guest account prompt (if not logged in): benefits list + Sign Up button

---

## 9. Credit & Subscription System

### Credit Constants

```typescript
const PLAN_CREDITS: Record<string, number> = {
    'none': 0,
    'monthly_starter': 30,
    'monthly_professional': 100,
    'monthly_enterprise': 500,
    'yearly_starter': 360,
    'yearly_professional': 1200,
    'yearly_enterprise': 6000,
}
```

### Credit Rules

1. **1 credit = 1 image processed** (regardless of number of output sizes generated)
2. Credits are checked BEFORE processing starts
3. Credit is deducted AFTER successful processing
4. Credits reset to 0 used on subscription renewal
5. Unused credits are preserved when upgrading mid-cycle (added to new plan's credits)
6. After cancellation, user can continue using remaining credits until period ends

### Subscription States

| Status | Meaning | Can Process? |
|---|---|---|
| `active` | Current paid subscription | Yes (if credits available) |
| `cancelled` | User cancelled, period not yet ended | Yes (if credits remaining) |
| `past_due` | Payment failed | No |
| `incomplete` | Checkout not completed | No |
| `inactive` | Never subscribed | No |
| `paused` | Subscription paused | No |

### `is_active()` Logic

```typescript
function isActive(subscription): boolean {
    if (subscription.status === 'active') return true
    if (subscription.status === 'cancelled' && creditsRemaining(subscription) > 0) return true
    return false
}
```

### Deferred Downgrades

When a user downgrades (switches to a plan with fewer credits):
- Don't change immediately
- Store `scheduled_plan_id` and `scheduled_change_date` (end of current period)
- On renewal webhook: apply the scheduled downgrade, reset credits
- User can cancel the scheduled downgrade before it takes effect

---

## 10. Stripe Integration

### Pricing Tiers

```typescript
const PRICING_TIERS = [
    // Monthly
    { id: 'monthly_starter', name: 'Starter', billing: 'Monthly', price: 29.99, credits: 30, perImage: 1.00 },
    { id: 'monthly_professional', name: 'Professional', billing: 'Monthly', price: 89.99, credits: 100, perImage: 0.90, popular: true },
    { id: 'monthly_enterprise', name: 'Enterprise', billing: 'Monthly', price: 399.99, credits: 500, perImage: 0.80 },
    // Yearly
    { id: 'yearly_starter', name: 'Starter', billing: 'Yearly', price: 251.99, credits: 360, perImage: 0.70, savings: '$108/year' },
    { id: 'yearly_professional', name: 'Professional', billing: 'Yearly', price: 720.00, credits: 1200, perImage: 0.60, popular: true, savings: '$359.88/year' },
    { id: 'yearly_enterprise', name: 'Enterprise', billing: 'Yearly', price: 2999.99, credits: 6000, perImage: 0.50, savings: '$1,799.89/year' },
]
```

### Checkout Flow

1. User clicks "Subscribe" on pricing page
2. `POST /api/stripe/checkout` with `priceId`
3. Server creates Stripe Checkout Session:
   ```typescript
   const session = await stripe.checkout.sessions.create({
       customer_email: userEmail,
       mode: 'subscription',
       payment_method_types: ['card'],
       line_items: [{ price: priceId, quantity: 1 }],
       success_url: `${siteUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
       cancel_url: `${siteUrl}/payment/cancel`,
       metadata: { user_id: userId },
       subscription_data: { metadata: { user_id: userId } }
   })
   ```
4. Redirect user to `session.url`
5. User completes payment on Stripe
6. Stripe sends `checkout.session.completed` webhook
7. User redirected to success page

### Downgrade Flow (Important Edge Case)

When user selects a plan with FEWER credits than current:
1. Don't create a Stripe Checkout
2. Instead, store the downgrade as scheduled:
   - `scheduled_plan_id` = new plan's Stripe price ID
   - `scheduled_change_date` = current period end date
3. Show user: "Your plan will change to X on DATE"
4. On next renewal webhook, apply the change

### Webhook Handler

**Route:** `POST /api/stripe/webhook`

Must verify webhook signature before processing:
```typescript
const event = stripe.webhooks.constructEvent(
    rawBody,
    request.headers.get('stripe-signature'),
    process.env.STRIPE_WEBHOOK_SECRET
)
```

**Events handled:**

#### `checkout.session.completed`
1. Extract `user_id` from metadata, `customer` ID, `subscription` ID
2. Retrieve full subscription from Stripe to get price ID
3. Map price ID to plan name
4. Get credits for plan
5. Check if existing subscription (upgrade scenario):
   - If upgrading and old credits remaining > 0: add unused credits to new total
6. Create or update `subscriptions` record with `status='active'`
7. Clear any scheduled downgrades

#### `customer.subscription.updated`
1. Extract subscription details
2. Check if this is a renewal (`current_period_start` in `previous_attributes`)
3. If renewal AND scheduled downgrade exists:
   - Apply scheduled plan change
   - Reset `credits_used` to 0
   - Clear scheduled fields
4. If renewal without scheduled change:
   - Reset `credits_used` to 0
   - Keep same plan
5. If mid-cycle change (not renewal):
   - If upgrading with unused credits: preserve them
   - Update plan details
6. Handle `cancel_at_period_end`:
   - If true: mark status as `cancelled`
   - If false (reactivation): mark status as `active`

#### `customer.subscription.deleted`
1. Find subscription by Stripe subscription ID
2. Set status to `cancelled`
3. Keep credit counts for historical record

#### `invoice.payment_failed`
1. Find subscription by Stripe subscription ID
2. Set status to `past_due`

### Customer Portal

For managing subscription (cancel, change payment method, view invoices):
```typescript
const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${siteUrl}/account/subscription`
})
// Redirect to portalSession.url
```

### Success Page Race Condition

The success page must handle the case where the webhook hasn't arrived yet:
1. Check if local subscription matches the Stripe checkout session
2. If stale (subscription doesn't match): manually sync by calling `handle_checkout_completed()`
3. This ensures the user sees their active subscription even if the webhook is delayed

---

## 11. Account Management

### Dashboard (`/account`)

Display:
- Credits remaining (with progress bar: `creditsUsed / creditsTotal`)
- Images processed (total and this month)
- Subscription status with plan name
- Scheduled downgrade notice (if applicable)
- Quick links to: Settings, Subscription, Usage
- Recent activity (last 5 images with status)

### Settings (`/account/settings`)

**Email Update:**
1. User enters new email
2. Call `supabase.auth.updateUser({ email: newEmail })`
3. Supabase sends confirmation to new email
4. Change takes effect after confirmation

**Password Update:**
1. User enters current password, new password, confirm password
2. Validate: new passwords match, 8+ characters
3. Call `supabase.auth.updateUser({ password: newPassword })`

### Usage Statistics (`/account/usage`)

Display:
- Current billing period dates
- Credit usage bar with percentage
- Low credit warning (if < 10 remaining)
- All-time stats: total images, total outputs, this month's images, this month's outputs
- 30-day usage timeline (table with date, images count, outputs count)

**Stats Calculation:**
```typescript
async function getUsageStats(userId: string) {
    const images = await supabase.from('images').select('*').eq('user_id', userId)
    const thisMonth = images.filter(i => isThisMonth(i.uploaded_at))

    // Count outputs for each image
    const outputs = await supabase.from('processed_outputs')
        .select('*')
        .in('image_id', images.map(i => i.id))

    return {
        totalImages: images.length,
        totalOutputs: outputs.length,
        imagesThisMonth: thisMonth.length,
        outputsThisMonth: outputs.filter(o => isThisMonth(o.created_at)).length
    }
}
```

### Subscription Details (`/account/subscription`)

Display:
- Current plan name and status
- Credits per period, credits used, credits remaining
- Period start/end dates
- Scheduled downgrade notice (if applicable)
- Button: "Manage Subscription" (Stripe Portal)
- Button: "Upgrade Plan" (pricing page)
- Plan comparison table

---

## 12. Image History

### History Page (`/history`)

**Data Fetching:**
1. Get all user's images (limit 50, most recent first)
2. Batch-fetch all processed outputs for those images (one query, not N+1)
3. Group outputs by image

**Display:**
- Grid of image cards (responsive: 1-5 columns)
- Each card shows:
  - Thumbnail preview (lazy-loaded)
  - Filename (truncated with tooltip for long names)
  - Dimensions and orientation badge
  - Upload date
  - Status badge: Completed (with output count), Pending, Processing, Failed
  - Output thumbnail grid (3 columns, scrollable)
  - Action buttons: Re-process, Download ZIP, Delete Image

**Interactive Features:**
- Real-time search filtering by filename
- Orientation filter dropdown (All / Portrait / Landscape)
- Delete confirmation modal with "Don't ask me again" option

### Image Deletion

**Delete entire image:**
1. Verify ownership (user_id matches)
2. Fetch all processed outputs for the image
3. Delete output files from storage
4. Delete output records from database
5. Delete original file from storage
6. Delete image record from database

**Delete single output:**
1. Verify ownership via join (output -> image -> user)
2. Delete output file from storage
3. Delete output record from database

### Load from History

User can click an image in history to re-open it in the crop tool:
1. Load image record by ID
2. Verify ownership
3. Get image metadata
4. Navigate to `/crop?imageId={id}`

---

## 13. Admin System

### Access Control

Role hierarchy: `super_admin` > `support_admin` > `read_only`

| Feature | read_only | support_admin | super_admin |
|---|---|---|---|
| View dashboard & stats | Yes | Yes | Yes |
| View user list | Yes | Yes | Yes |
| View user details | Yes | Yes | Yes |
| View audit log | Yes | Yes | Yes |
| Edit user profiles | No | Yes | Yes |
| Adjust credits | No | Yes | Yes |
| Add user notes | No | Yes | Yes |
| Delete images | No | Yes | Yes |
| Truncate audit log | No | No | Yes |

### Admin Dashboard (`/admin`)

Display:
- Stats cards: Total Users, Active Subscriptions, Images Processed, Total Credits Issued
- Quick action links: Manage Users, Audit Log, Image Management
- Recent admin activity (last 20 audit log entries)

### User Management (`/admin/users`)

**List View:**
- Table: Email, Name, Credits (remaining/total), Status badge, Expiry date, Joined date, Actions
- Search by email (via Supabase admin API: `supabase.auth.admin.listUsers()`)
- Pagination (50 per page)

**User Detail (`/admin/users/[id]`):**

Left panel (2/3 width):
- Profile form: email, full_name, admin note (required), update button
- Credits form: current balance display, new balance input, admin note (required), update button
- Subscription info: plan, status, credits/month, period end, Stripe customer ID
- User statistics: total images, total outputs
- Recent images list (10 most recent)
- Admin action history for this user

Right panel (1/3 width):
- Add note form: type dropdown, content textarea, pin checkbox
- Existing notes: pinned first (yellow highlight), color-coded by type

### Notes System

**Note Types:**
- `general` - General observations
- `support` - Support interactions
- `billing` - Billing-related notes
- `warning` - Behavioral warnings
- `ban` - Ban records

Notes can be pinned (shown at top). Pinning is togglable via AJAX.

### Audit Logging

**All admin actions MUST be logged:**
- Credit adjustments: old value, new value
- Profile updates: changed fields with old/new values
- Notes added
- Images deleted (single and bulk)
- Audit log truncation

**Logged data:**
- `admin_user_id` - who performed the action
- `action_type` - what was done
- `target_user_id` - who was affected
- `changes` (JSON) - before/after values
- `admin_note` - mandatory explanation
- `ip_address` - request IP
- `user_agent` - browser info
- `created_at` - timestamp

**Admin Note Requirement:** Every admin action that modifies data MUST include an admin note explaining why. The UI enforces this with a required textarea.

### Audit Log View (`/admin/audit-log`)

- Filterable by action type
- Paginated (100 per page)
- Expandable detail rows showing full changes JSON
- Truncation tool (super admin only): date picker + required note

### Admin Image Management (`/admin/images`)

- List all images across all users
- Search by user email
- Filter by date
- Delete individual images (with audit logging)
- Bulk delete with checkboxes (with audit logging)
- Shows user email/name for each image

---

## 14. UI/UX Specification

### Design System

**Framework:** Tailwind CSS
**Color Palette:**
- Primary: Blue (blue-600 buttons, blue-500 accents)
- Success: Green (green-100 bg, green-800 text)
- Error: Red (red-100 bg, red-800 text)
- Warning: Yellow (yellow-100 bg, yellow-800 text)
- Admin/Alt: Purple (purple-100 bg, purple-600 text)
- Neutral: Gray (gray-50 bg, gray-500 text)

**Typography:**
- Headings: `font-bold` or `font-semibold`
- Body: default weight
- Small text: `text-sm text-gray-500`

### Navigation

**Header (all pages):**
- Logo/Home link: "PrintPrep" left-aligned
- Links: Pricing, History (auth), Account (auth), Admin (admin only)
- Credits badge: "X/Y credits" (if active subscription)
- User: email + Logout button (auth) OR Login/Sign Up buttons (guest)

**Footer:**
- Tagline and basic info

### Flash Messages / Toasts

Display at top of page, color-coded:
- Error: red background
- Success: green background
- Info: blue background

Auto-dismiss after 5 seconds or click to close.

### Page-Specific UI Notes

**Upload Page:**
- Subscription status banners (not logged in / no sub / out of credits)
- "How It Works" section with 4 numbered steps
- Max 50MB, 300 DPI output noted

**Pricing Page:**
- Monthly/Yearly toggle (tab-style buttons)
- "Most Popular" badge on Professional tier
- Current plan indicator (disabled button saying "Current Plan")
- Savings displayed on yearly plans

**Crop Page:**
- Three-column layout: ratio sidebar | crop canvas | (canvas takes 2 cols)
- Sticky sidebar on scroll
- Zoom controls (+/- buttons)
- Reset button
- Color preview with checkered pattern for transparent

---

## 15. API Routes

### Public Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Landing / upload page |
| GET | `/pricing` | Pricing page |
| GET | `/auth/login` | Login page |
| GET | `/auth/register` | Registration page |
| GET | `/auth/callback` | Email verification callback |
| POST | `/api/stripe/webhook` | Stripe webhook (no auth) |

### Authenticated Routes

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/upload` | Upload image file |
| GET | `/crop` | Crop tool page |
| POST | `/api/process` | Generate all outputs |
| GET | `/download` | Download page |
| GET | `/api/download/[outputId]` | Download single file |
| GET | `/api/download-zip/[imageId]` | Download ZIP |
| GET | `/history` | Image history |
| POST | `/api/images/[id]/delete` | Delete image + outputs |
| POST | `/api/outputs/[id]/delete` | Delete single output |
| POST | `/api/stripe/checkout` | Create checkout session |
| GET | `/api/stripe/portal` | Redirect to customer portal |
| POST | `/api/stripe/cancel-downgrade` | Cancel scheduled downgrade |
| GET | `/account` | Account dashboard |
| GET | `/account/settings` | Settings page |
| POST | `/api/account/update-email` | Update email |
| POST | `/api/account/update-password` | Update password |
| GET | `/account/usage` | Usage stats |
| GET | `/account/subscription` | Subscription details |

### Admin Routes (require admin role)

| Method | Path | Min Role | Purpose |
|---|---|---|---|
| GET | `/admin` | read_only | Dashboard |
| GET | `/admin/users` | read_only | User list |
| GET | `/admin/users/[id]` | read_only | User detail |
| POST | `/api/admin/users/[id]/credits` | support_admin | Adjust credits |
| POST | `/api/admin/users/[id]/profile` | support_admin | Update profile |
| POST | `/api/admin/users/[id]/notes` | support_admin | Add note |
| POST | `/api/admin/notes/[id]/toggle-pin` | support_admin | Toggle pin |
| GET | `/admin/audit-log` | read_only | Audit log |
| POST | `/api/admin/audit-log/truncate` | super_admin | Truncate log |
| GET | `/admin/images` | read_only | Image list |
| POST | `/api/admin/images/[id]/delete` | support_admin | Delete image |
| POST | `/api/admin/images/bulk-delete` | support_admin | Bulk delete |

---

## 16. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Stripe Price IDs
STRIPE_PRICE_MONTHLY_STARTER=price_xxxxx
STRIPE_PRICE_MONTHLY_PROFESSIONAL=price_xxxxx
STRIPE_PRICE_MONTHLY_ENTERPRISE=price_xxxxx
STRIPE_PRICE_YEARLY_STARTER=price_xxxxx
STRIPE_PRICE_YEARLY_PROFESSIONAL=price_xxxxx
STRIPE_PRICE_YEARLY_ENTERPRISE=price_xxxxx

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_STORAGE_BUCKET=printprep-images

# Processing
DEFAULT_DPI=300
MAX_UPLOAD_SIZE_MB=50
```

**Naming convention:** Prefix with `NEXT_PUBLIC_` for values that need to be available in browser code. Keep secrets (service role key, Stripe secret key, webhook secret) server-only (no prefix).

---

## 17. File Naming & Output Format

### Output Filename Pattern

```
{ratio}-{width}x{height}in-{widthPx}x{heightPx}px-{widthMm}x{heightMm}mm-{timestamp}.{ext}
```

**Examples:**
- `3x2-36x24in-10800x7200px-914x610mm-1707259234.jpg`
- `3x4-18x24in-5400x7200px-457x609mm-1770670742.jpg`
- `a-8.27x11.69in-2481x3507px-210x297mm-1707259234.png`

**Ratio formatting:**
- Colons replaced with 'x': `3:4` -> `3x4`
- Lowercase
- "A-Series" -> `a`

**Unit conversions:**
- Pixels = inches x DPI (300)
- Millimeters = inches x 25.4 (rounded to whole numbers)

**Timestamp:** Unix epoch seconds (`Math.floor(Date.now() / 1000)`)

**Format selection:**
- Transparent background -> `.png`
- Solid color background -> `.jpg` (quality 95)

### DPI Metadata

All output files MUST include 300 DPI in EXIF/metadata. Sharp supports this:
```typescript
sharp(buffer).withMetadata({ density: 300 })
```

---

## 18. Error Handling Patterns

### User-Facing Errors

Always show friendly error messages. Never expose internal errors or stack traces.

| Scenario | Message |
|---|---|
| No file selected | "Please select a file to upload" |
| Invalid file type | "Supported formats: JPG, PNG, TIFF, WebP" |
| File too large | "Maximum file size is 50 MB" |
| Not authenticated | Redirect to login with `next` parameter |
| No subscription | "Please subscribe to start processing" (link to pricing) |
| No credits | "You've used all your credits. Upgrade your plan to continue." |
| Processing failed | "Something went wrong processing your image. Please try again." |
| Stripe checkout error | "Unable to start checkout. Please try again." |
| Webhook signature invalid | Return 400 (no user-facing message) |

### API Error Response Format

```json
{
    "error": "error_code",
    "message": "Human-readable message"
}
```

Error codes used:
- `authentication_required`
- `no_subscription`
- `no_credits`
- `invalid_file`
- `file_too_large`
- `not_found`
- `forbidden`
- `processing_error`
- `stripe_error`

---

## 19. Performance Optimizations

### Subscription Caching

The original app cached subscription data in the Flask session to avoid a DB query on every page load. In Next.js, consider:

- Cache subscription in a cookie or client-side state (Zustand)
- Invalidate after: credit use, subscription change, login/logout
- The nav bar shows credits badge on every page, so this matters

### N+1 Query Prevention

When loading history page with multiple images, fetch all outputs in one query:
```typescript
const outputs = await supabase
    .from('processed_outputs')
    .select('*')
    .in('image_id', imageIds)
```

Then group client-side by `image_id`.

### Image Lazy Loading

History page should use `loading="lazy"` on all image thumbnails.

### Admin Stripe Sync

Do NOT auto-sync every user's subscription with Stripe on the admin user list page. The original app disabled this because it added 50+ seconds to page load. Only sync individual users when viewing their detail page.

---

## 20. Security Requirements

### Authentication

- All sensitive routes require authentication (middleware check)
- Admin routes require admin role check via database function
- Service role key never exposed to client (server-only env var)

### Data Isolation (RLS)

- Users can only see/modify their own: images, outputs, subscriptions
- Admin tables only accessible to users with admin records
- Webhook handler uses service role to bypass RLS

### Input Validation

- File upload: validate type, size, dimensions
- Form inputs: validate email format, password length (8+ chars)
- Admin actions: require admin note (non-empty)
- Stripe webhooks: verify signature before processing

### CORS

- Uploaded images served with CORS headers for canvas pixel reading (eyedropper tool)
- Supabase Storage handles CORS for stored files

### Session Security

- HTTP-only cookies (via `@supabase/ssr`)
- SameSite=Lax
- Secure flag in production

---

## 21. Known Gotchas

### Supabase Auth Token Refresh

In the Python app, this was a major source of bugs. The `@supabase/ssr` package for Next.js handles token refresh automatically via middleware, so this should be simpler. But test thoroughly:
- Expired tokens should auto-refresh
- Refresh tokens are single-use (each refresh returns NEW tokens)
- Never call `set_session()` unnecessarily (it can trigger internal refreshes)

### Stripe Webhook Secret Changes

When using `stripe listen` for local development, the webhook secret changes every time the CLI is restarted. Must update `.env.local` and restart the dev server.

### Square Images

Images with 1:1 aspect ratio default to portrait orientation. Very close to square (0.95-1.05 ratio) may behave unexpectedly in the crop tool.

### Background Color + Transparency

When the original image has transparency (PNG with alpha channel) and a solid background color is chosen, the background color fills transparent areas too. This is intentional for print-ready outputs.

### Crop Box Negative Coordinates

The crop box CAN extend beyond image boundaries, resulting in negative x/y values. The processing engine must handle this correctly by calculating the intersection with actual image bounds and filling exposed areas with the background color.

### Sharp vs Pillow Differences

- Sharp uses `libvips` under the hood (faster than Pillow's PIL)
- Sharp's `extract()` = Pillow's `crop()`
- Sharp's `composite()` = Pillow's `paste()`
- Sharp's `resize()` defaults to Lanczos (same quality as Pillow's LANCZOS)
- Sharp handles EXIF orientation automatically (Pillow needs explicit handling)
- Sharp's DPI is set via `.withMetadata({ density: 300 })`

### Credit Deduction Timing

Credits are deducted AFTER successful processing, not before. If processing fails, no credit is consumed. This means the check-then-deduct flow has a tiny race condition window, but it's acceptable for this use case.

### Supabase Storage Bucket

The storage bucket `printprep-images` must be created in the Supabase dashboard with appropriate policies:
- Authenticated users can upload to `uploads/` path
- Authenticated users can read their own files
- Service role can read/write all files

---

## Appendix A: Target Ratio Definitions

### Portrait Ratios

```typescript
const PORTRAIT_RATIOS = {
    '2:3': {
        ratio: 2/3,  // 0.6667
        name: '2:3 Ratio',
        sizes: [
            { width: 4, height: 6, label: '4x6' },
            { width: 8, height: 12, label: '8x12' },
            { width: 16, height: 24, label: '16x24' },
            { width: 24, height: 36, label: '24x36' },
        ]
    },
    '3:4': {
        ratio: 3/4,  // 0.75
        name: '3:4 Ratio',
        sizes: [
            { width: 6, height: 8, label: '6x8' },
            { width: 9, height: 12, label: '9x12' },
            { width: 12, height: 16, label: '12x16' },
            { width: 18, height: 24, label: '18x24' },
        ]
    },
    '4:5': {
        ratio: 4/5,  // 0.8
        name: '4:5 Ratio',
        sizes: [
            { width: 4, height: 5, label: '4x5' },
            { width: 8, height: 10, label: '8x10' },
            { width: 16, height: 20, label: '16x20' },
        ]
    },
    '8:11': {
        ratio: 8/11,  // 0.7273
        name: '8:11 Ratio',
        sizes: [
            { width: 8, height: 11, label: '8x11' },
        ]
    },
    'A-Series': {
        ratio: 210/297,  // 0.7071 (ISO standard)
        name: 'A-Series (ISO)',
        sizes: [
            { width: 2.91, height: 4.13, label: 'A7' },
            { width: 4.13, height: 5.83, label: 'A6' },
            { width: 5.83, height: 8.27, label: 'A5' },
            { width: 8.27, height: 11.69, label: 'A4' },
            { width: 11.69, height: 16.54, label: 'A3' },
            { width: 16.54, height: 23.39, label: 'A2' },
            { width: 23.39, height: 33.11, label: 'A1' },
            { width: 33.11, height: 46.81, label: 'A0' },
        ]
    },
}
```

### Landscape Ratios

Same ratios but inverted (width/height swapped):
- `3:2` (ratio 1.5), `4:3` (1.333), `5:4` (1.25), `11:8` (1.375), `A-Series landscape` (1.414)
- All sizes have width > height

---

## Appendix B: Stripe Test Cards

| Card Number | Result |
|---|---|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Decline |
| 4000 0025 0000 3155 | 3D Secure required |

Use any future expiry, any CVC, any ZIP.

---

## Appendix C: Implementation Order

Recommended build order (each phase builds on the previous):

1. **Project Setup** - Next.js, Tailwind, Supabase client, env vars
2. **Auth** - Registration, login, logout, email verification, middleware
3. **Upload** - File upload with drag-and-drop, metadata extraction, Supabase Storage
4. **Crop Tool** - Cropper.js integration, multi-ratio, background color, eyedropper
5. **Processing** - Sharp-based image processing, all crop/resize logic
6. **Download** - Single file and ZIP download
7. **Subscriptions** - Stripe checkout, webhooks, credit system
8. **Account** - Dashboard, settings, usage stats, subscription management
9. **History** - Image history, search, filter, delete
10. **Admin** - Dashboard, user management, audit log, notes, image management
11. *(Optional)* **AI Upscaling** - Real-ESRGAN or Hugging Face API integration as a pre-processing step for significant upscales (see Section 7: Image Quality Note)

---

*This specification was generated from a complete analysis of the PrintPrep Flask application codebase. Every feature, algorithm, edge case, and business rule has been documented for a faithful reconstruction.*

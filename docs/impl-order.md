# Recommended Implementation Order

Each phase builds on the previous. Complete auth before upload, upload before crop, etc.

1. **Project Setup** — Next.js, Tailwind, Supabase client, env vars
2. **Auth** — Registration, login, logout, email verification, middleware
3. **Upload** — File upload with drag-and-drop, metadata extraction, Supabase Storage
4. **Crop Tool** — Cropper.js integration, multi-ratio, background color, eyedropper
5. **Processing** — Sharp-based image processing, all crop/resize logic
6. **Download** — Single file, ZIP download, PDF download
7. **Subscriptions** — Stripe checkout, webhooks, credit system
8. **Account** — Dashboard, settings, usage stats, subscription management
9. **History** — Image history, search, filter, delete
10. **Admin** — Dashboard, user management, audit log, notes, image management
11. *(Optional)* **AI Upscaling** — Real-ESRGAN or Hugging Face API as a pre-processing step for significant upscales

## AI Upscaling Notes (if implementing #11)

Detect when output pixels > 1.5× input pixels. Offer user toggle: "AI Enhance" (slower) vs "Standard" (fast).

Options:
- **Real-ESRGAN** — binary on server, call as subprocess. 5–30s per image depending on GPU.
- **Hugging Face Inference API** — cloud-based, no local GPU.

The core Sharp processing pipeline stays unchanged — AI upscaler just produces a higher-res input buffer.

# Cleanup — Daily File Expiry

## Overview

A daily cron job deletes expired image files (original uploads + processed outputs) from Supabase Storage to enforce per-plan file retention limits. Thumbnails are intentionally preserved so the user's history view remains functional indefinitely. The job tracks its work in the database — it never re-processes an image it has already cleaned.

---

## Cron Configuration

| Setting | Value |
|---|---|
| Host | Hostinger hPanel Cron Jobs |
| Schedule | Daily at 2:00 AM |
| Auth key | `CRON_KEY` — stored in Hostinger deployment variables and `.env.local` |

**Cron command:**
```
curl -X POST https://allgoodweb.com/api/cleanup \
  -H "Authorization: Bearer <CRON_KEY>"
```

---

## Endpoint

- **Route:** `POST /api/cleanup` → `app/api/cleanup/route.js`
- **Auth:** `Authorization: Bearer <CRON_KEY>` — returns `401` if missing or incorrect
- **Response:** `{ "cleaned": N }` — count of images cleaned in this run
- **Batch size:** 50 images per invocation — safe for daily volume; can be run multiple times per day if needed

---

## Processing Steps

Per invocation, the route:

1. Queries `images` where `expires_at < now` AND `expired_at IS NULL` (not yet cleaned) — up to 50 rows
2. Collects all `processed_outputs.storage_path` values for those images
3. Deletes output files from the `printprep-images` Supabase Storage bucket
4. Deletes original upload files (`images.storage_path`) from the `printprep-images` bucket
5. **Skips thumbnails** (`images.thumbnail_path`) — these are never deleted
6. Sets `expired_at = now()` on each image row — marks cleanup complete and prevents re-processing

---

## File Lifetime by Plan

Retention is calculated at processing time in `app/api/process/route.js` via `getRetentionDays()` (`lib/credits.js`) and written to `images.expires_at`.

| Plan | Retention |
|---|---|
| Starter (monthly / yearly) | 7 days |
| Professional (monthly / yearly) | 30 days |
| Enterprise (monthly / yearly) | 90 days |
| No plan / fallback | 7 days |

---

## Database Columns Involved

| Column | Table | Purpose |
|---|---|---|
| `expires_at` | `images` | When files should be deleted — set at processing time |
| `expired_at` | `images` | When cleanup actually ran — `null` = files still live |
| `thumbnail_path` | `images` | Never deleted; powers the history view permanently |
| `storage_path` | `images` | Original upload file — deleted on expiry |
| `storage_path` | `processed_outputs` | Output files — deleted on expiry |

Index `idx_images_cleanup` on `images (expires_at) WHERE expired_at IS NULL` keeps the cleanup query fast.

---

## History After Expiry

Once an image is expired the user's history page still displays the row — thumbnail visible, ratio and size info intact — but download links are no longer functional. This is intentional by design.

---

## Related Files

| File | Role |
|---|---|
| `app/api/cleanup/route.js` | Cron endpoint implementation |
| `lib/credits.js` | `getRetentionDays()`, `RETENTION_DAYS` map |
| `app/api/process/route.js` | Sets `expires_at` after successful processing |
| `docs/schema.md` | `images` table DDL and column definitions |

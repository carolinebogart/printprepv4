# Mockup Feature Design

**Date:** 2026-02-28
**Status:** Approved

## Problem

Etsy digital printable sellers need lifestyle mockup images to show buyers how prints will look in a real room at real scale. Currently sellers must stitch this together manually using third-party tools. This feature automates it: after PrintPrep processes artwork into print-ready outputs, it composites those outputs into scene images with a frame, optional mat, and real-world scale reference — producing ready-to-use Etsy listing photos.

## Trigger Modes

- **Auto-mockup** — runs automatically after processing if user has opted in (account setting)
- **On-demand** — "Generate Mockup" button in history UI

## Layer Stack (composited at runtime by Sharp)

1. **Scene** — background photo (open wall, shelf, desk) — must contain a fully-visible straight-on reference object with known real-world dimensions
2. **Frame** — assembled from single texture strip asset (mitered corners, tiled sides)
3. **Mat** — programmatic solid-color border (Sharp `.extend()`, no asset needed)
4. **Artwork** — user's processed output (fills frame 100%)

## Scale Approach

Each scene stores a reference object (e.g. sofa = 82", doorframe = 80") and how many pixels wide it is in the scene image. This gives a px-per-inch ratio that sizes the artwork to true real-world scale in the mockup.

```
px_per_inch = reference_object_px / reference_object_inches
artwork_px_width = (output_width_px / 300) * px_per_inch   -- 300 DPI → inches → px in scene
```

## Frame Assembly

A single texture strip image per frame style. At runtime Sharp:
1. Crops corner squares (thickness × thickness), rotates for each corner
2. Tiles the strip along each side between corners
3. Assembles a frame PNG with transparent center
4. Composites over the matted artwork

## Placement

Golden ratio position on scene (pre-calculated and stored per scene as `placement_x`, `placement_y`). Optional `offset_x`/`offset_y` nudge columns exist in DB but are not exposed in admin UI in v1.

## Defaults

- Frame: wood (system default, `is_default = true` on frame record)
- Mat: none
- Auto-mockup: off

Users can override defaults in account settings.

## Database Tables

### `mockup_scenes`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | "Clean White Wall" |
| description | text | |
| storage_path | text | In Supabase Storage |
| width, height | int | Scene image px dimensions |
| frame_area_width, frame_area_height | int | Max bounding box for frame |
| placement_x, placement_y | int | Golden ratio center point |
| offset_x, offset_y | int default 0 | Nudge — wired in, UI deferred |
| reference_object_label | text | "sofa", "doorframe" |
| reference_object_inches | numeric | Real-world width |
| reference_object_px | int | Pixels wide in scene |
| is_default | boolean | |
| is_active | boolean | |

### `mockup_frames`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | "Natural Wood", "Black Metal" |
| storage_path | text | Single texture strip asset |
| thickness_px | int default 20 | Frame width |
| is_default | boolean | |
| is_active | boolean | |

### `mockup_outputs`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| image_id | uuid FK | → images |
| processed_output_id | uuid FK | → processed_outputs (largest output used) |
| scene_id | uuid FK | → mockup_scenes |
| frame_id | uuid FK nullable | → mockup_frames, null = no frame |
| mat_color | text nullable | Hex color |
| mat_thickness_px | int nullable | |
| storage_path | text | Generated JPEG in storage |
| width, height | int | |

### `user_mockup_prefs`
| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid PK FK | → auth.users |
| auto_mockup | boolean default false | |
| default_scene_id | uuid FK nullable | null = system default |
| default_frame_id | uuid FK nullable | null = system default (wood) |
| default_mat_color | text nullable | |
| default_mat_thickness_px | int nullable | |

## Storage Structure

```
printprep-images bucket
└── mockups/
    ├── templates/scenes/{sceneId}.{ext}
    ├── templates/frames/{frameId}.{ext}
    └── outputs/{imageId}/{mockupOutputId}.jpg
```

Generated mockups are always JPEG. Served via 1-hour signed URLs (same pattern as existing outputs).

## New Files

| File | Purpose |
|------|---------|
| `lib/mockup-compositor.js` | Core Sharp compositing logic |
| `app/api/mockup/generate/route.js` | On-demand POST endpoint |
| `app/admin/mockups/page.jsx` | Admin scene + frame management |

## Modified Files

| File | Change |
|------|--------|
| `app/api/process/route.js` | Non-blocking auto-mockup step after processing |
| `components/HistoryGrid.jsx` | Mockups collapsible section + generate button |
| `app/account/page.jsx` | Mockup preferences section |
| `app/api/download-zip/[imageId]/route.js` | Include mockup JPEGs in ZIP |

## Future Phases

- User-uploaded scenes and frames
- Per-scene pricing / credit cost
- Perspective-warped mockups (angled surfaces)
- Admin nudge UI for offset_x/offset_y
- Multiple scenes per auto-mockup run

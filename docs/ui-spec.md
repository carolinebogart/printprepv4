# UI/UX Specification

## Design Direction

**Target audience:** Etsy sellers — creative, detail-oriented, small business owners.

UI should feel professional and craft-focused, not corporate SaaS. Avoid generic AI aesthetics (purple gradients, Inter font, cookie-cutter layouts). Choose distinctive typography and a cohesive, intentional visual direction.

The **crop tool** and **history/download** experience are the two most-used surfaces — prioritize these.

---

## Design System

**Framework:** Tailwind CSS 4

**Color Palette:**
| Role | Tailwind classes |
|---|---|
| Primary actions | `blue-600` buttons, `blue-500` accents |
| Success | `green-100` bg, `green-800` text |
| Error | `red-100` bg, `red-800` text |
| Warning | `yellow-100` bg, `yellow-800` text |
| Admin/Alt | `purple-100` bg, `purple-600` text |
| Neutral | `gray-50` bg, `gray-500` text |

**Typography:** `font-bold` / `font-semibold` for headings; default weight for body; `text-sm text-gray-500` for small text.

---

## Navigation (all pages)

**Header:**
- Logo/Home link: "PrintPrep" left-aligned
- Links: Pricing | History (auth) | Account (auth) | Admin (admin only)
- Credits badge: "X/Y credits" (if active subscription)
- Auth: email + Logout (authenticated) OR Login / Sign Up (guest)

**Footer:** tagline and basic info.

---

## Flash Messages / Toasts

Display at top of page, color-coded. Auto-dismiss after 5 seconds or click to close.
- Error → red background
- Success → green background
- Info → blue background

---

## Upload Page

- Subscription status banners: not logged in / no sub / out of credits
- Dashed border drop zone with drag-over feedback (blue border, slight scale)
- Shows file name and size after selection; metadata after upload (dimensions, ratio, format)
- Upload button disabled until file selected; loading spinner during upload
- "How It Works" section with 4 numbered steps

---

## Pricing Page

- Monthly/Yearly toggle (tab-style buttons)
- "Most Popular" badge on Professional tier
- Current plan indicator (disabled button: "Current Plan")
- Savings displayed on yearly plans
- Plan comparison table

---

## Crop Page Layout

- Three-column layout: ratio sidebar (left) | crop canvas (takes 2 cols)
- Sticky sidebar on scroll
- Zoom controls (+/− buttons) + Reset button
- Color preview with checkered pattern for transparent backgrounds
- Navigation: "Previous" / "Next" buttons to cycle through selected ratios
- Size checkboxes per ratio with DPI quality badges

---

## History Page

**Grid:** responsive 1–5 columns, lazy-loaded thumbnails.

Each card shows:
- Thumbnail preview
- Filename (truncated with tooltip for long names)
- Dimensions and orientation badge
- Upload date
- Status badge: Completed (with output count) | Pending | Processing | Failed
- Output thumbnail grid (3 cols, scrollable)
- Action buttons: Re-process | Download ZIP | Delete Image

**Interactive features:**
- Real-time search filtering by filename
- Orientation filter dropdown (All / Portrait / Landscape)
- Delete confirmation modal with "Don't ask me again" option

---

## Account Pages

### Dashboard (`/account`)
- Credits remaining with progress bar (`creditsUsed / creditsTotal`)
- Images processed (total and this month)
- Subscription status and plan name
- Scheduled downgrade notice (if applicable)
- Quick links: Settings | Subscription | Usage
- Recent activity (last 5 images)

### Usage (`/account/usage`)
- Current billing period dates
- Credit usage bar with percentage
- Low credit warning (< 10 remaining)
- All-time stats: total images, total outputs, this month counts
- 30-day usage timeline

### Subscription (`/account/subscription`)
- Current plan name, status, credits/period, used, remaining
- Period start/end dates
- Scheduled downgrade notice (if applicable)
- "Manage Subscription" → Stripe Portal
- "Upgrade Plan" → pricing page
- Plan comparison table

---

## Admin UI

### User Detail Layout
- Left panel (2/3 width): profile form, credits form, subscription info, stats, recent images, action history
- Right panel (1/3 width): add note form, existing notes (pinned first, yellow highlight, color-coded by type)

### Audit Log
- Filterable by action type
- Paginated (100 per page)
- Expandable detail rows showing full changes JSON
- Truncation tool (super admin only): date picker + required note

---

## Accessibility & Responsiveness

- `loading="lazy"` on all history/thumbnail images
- Tooltip for truncated filenames
- Form validation with clear error messages before submission
- Mobile-friendly layouts — use `sm:` breakpoints for grid column counts

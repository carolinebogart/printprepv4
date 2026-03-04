
# PrintPrep Quality Communication Implementation Plan

**Date:** March 3, 2026  
**Goal:** Unified, transparent messaging across Upload → Calculator → History pages about image resolution, print quality, and upscaling options.

---

## Conversation Context

User asked: *"When a user uploads an image, how does the app determine whether it has sufficient resolution to be turned into printable sizes? The user will want to know more about the issue, and exactly what this app is doing to compensate."*

**Key insight:** Current messaging about "auto upscale" is vague. Users don't understand what upscaling actually means or what quality tradeoff they're getting.

---

## Core Concept: DPI-Based Quality Calculation

### The Math
```
Print Size (inches) = Image Pixels ÷ DPI (dots per inch)
```

**Example:**
- Image: 2400 × 1800 pixels
- At 300 DPI: 8" × 6" max (photo-quality)
- At 150 DPI: 16" × 12" max (acceptable web/draft)

### Quality Standards
- **300 DPI** = photo-quality (industry standard for prints)
- **200 DPI** = good quality (acceptable for most prints)
- **150 DPI** = fair quality (web/casual prints, minor softness)
- **Below 150 DPI** = poor quality (visible pixelation)

### What Upscaling Does
Upscaling = mathematically guessing what missing pixels should be (interpolation). It increases pixel count but doesn't add real detail. Quality degrades noticeably beyond 1.5–2× enlargement.

---

## Unified Messaging Strategy

### Core Principles
1. **Label everything:** Native resolution, DPI, print size, upscale factor
2. **Offer previews:** Show side-by-side comparisons when upscaling
3. **Suggest a "best" option:** Mark recommended choice with ⭐
4. **Be transparent:** Show quality tradeoffs clearly
5. **Use consistent terminology** across all three pages

### Terminology (use everywhere)
- **Native Resolution** = current pixel dimensions (e.g., "2400 × 1800 px")
- **Print DPI** = dots per inch at desired size
- **Upscale Factor** = magnification ratio (1.5×, 2×, etc.)
- **Quality Level** = Excellent / Good / Fair / Poor
- **Standard** = 300 DPI for photo-quality prints

---

## Page-by-Page Implementation

### 1. UPLOAD PAGE (UploadForm.jsx)

**Current state:** Shows basic resolution tier after upload  
**Enhancement:** Add detailed metadata card

#### Changes to UploadForm.jsx:

After file is selected and dimensions are read, display:

```
┌─────────────────────────────────────────┐
│ ✓ Image received                        │
├─────────────────────────────────────────┤
│ 📸 Native Resolution: 2400 × 1800 px   │
│ 📋 File size: 1.2 MB (JPG)              │
│ 🔍 Aspect ratio: 4:3                    │
├─────────────────────────────────────────┤
│ Resolution tier: Good                   │
│ (Supports medium prints up to ~16×20")  │
│                                         │
│ Next step: Tell us what size you want   │
│ to print, and we'll check quality.      │
│                                         │
│ [Upload & Continue →]                   │
└─────────────────────────────────────────┘
```

**Messaging tone:** Reassuring, forward-looking. No warnings yet—just facts.

**What to add:**
- Calculate aspect ratio from width/height
- Show resolution tier label (already exists in RES_TIERS)
- Add small info icon with tooltip explaining resolution tiers
- Call-to-action: "Upload & Continue" → goes to crop page or directly to calculator

---

### 2. RESOLUTION CALCULATOR PAGE (resolution-calculator/page.jsx)

**Current state:** Simple calculator showing DPI at a given size  
**Enhancement:** Add quality analysis card with three options

#### New Component: QualityAnalysisCard

When user inputs a print size, show:

```
┌──────────────────────────────────────────────────┐
│ 📊 QUALITY ANALYSIS                              │
├──────────────────────────────────────────────────┤
│ Your image: 2400 × 1800 pixels                   │
│ Your print: 8" × 10"                             │
│                                                  │
│ At 8" × 10":                                     │
│ • Current DPI: 300 DPI ✓ EXCELLENT              │
│ • Quality rating: Photo-quality                  │
│ • Upscaling needed: NO                           │
│                                                  │
│ This image is ready to print at 8" × 10"        │
│ with no quality loss. Print with confidence.     │
│                                                  │
│ [Proceed to Print Settings →]                    │
└──────────────────────────────────────────────────┘
```

#### If upscaling needed:

```
┌──────────────────────────────────────────────────┐
│ ⚠️ QUALITY ANALYSIS                              │
├──────────────────────────────────────────────────┤
│ Your image: 1200 × 900 pixels                    │
│ Your print: 8" × 10"                             │
│                                                  │
│ At 8" × 10":                                     │
│ • Current DPI: 150 DPI ⚠️ FAIR                  │
│ • Quality rating: Web/draft quality              │
│ • Upscaling needed: YES (1.5× to reach 300 DPI)│
│                                                  │
│ What's the difference?                           │
│ • 150 DPI: acceptable for casual prints,         │
│   fine details may appear slightly soft          │
│ • 300 DPI: photo-quality, sharp text & details   │
│                                                  │
├──────── YOUR OPTIONS ─────────────────────┤
│                                                  │
│ OPTION A (RECOMMENDED ⭐)                       │
│ ✓ Upscale to 2400 × 3000 pixels (1.5×)         │
│ ✓ Result: 300 DPI at 8" × 10"                  │
│ ✓ Quality loss: Minimal                        │
│ ✓ Cost: +$2 for upscaling                      │
│ → This is our recommended choice                │
│                                                  │
│ OPTION B                                        │
│ ✓ Print at current resolution (150 DPI)        │
│ ✓ Print size: 8" × 10"                         │
│ ⚠️ Quality: Fair (some softness expected)       │
│ ✓ Cost: Standard                                │
│ → Good for casual use, proofs                   │
│                                                  │
│ OPTION C                                        │
│ ✓ Print at smaller size (5.3" × 6.7")          │
│ ✓ Result: 300 DPI (photo-quality)              │
│ ⚠️ Limitation: Smaller print                    │
│ ✓ Cost: Standard                                │
│ → Good if size is flexible                      │
│                                                  │
│ [I'll upscale (Option A)] [Skip upscaling]      │
└──────────────────────────────────────────────────┘
```

**If user selects upscaling, show preview:**

```
┌──────────────────────────────────────────────────┐
│ 🔍 UPSCALING PREVIEW                             │
├──────────────────────────────────────────────────┤
│ [Side-by-side slider: Original | Upscaled]      │
│  (Drag left/right to compare)                    │
│                                                  │
│ Method: AI-based bicubic interpolation           │
│ Magnification: 1.5× (minimal quality loss)       │
│                                                  │
│ Quality expectation: 95% of original sharpness   │
│                                                  │
│ [Confirm upscale] or [Choose different size]    │
└──────────────────────────────────────────────────┘
```

**Messaging tone:** Clear risk assessment + smart default. Educate, don't scare.

**What to add:**
- New `QualityAnalysisCard` component
- Logic to calculate upscale factor: `targetPixels / currentPixels`
- Function to recommend best option (upscale < 1.5× = recommend it)
- Store selected option in component state for next page
- Show expandable "What's the difference?" explanation of DPI

---

### 3. HISTORY PAGE (HistoryGrid.jsx & history page)

**Current state:** Grid of images with basic metadata  
**Enhancement:** Show full decision trail for each order

#### Enhanced History Card:

```
┌──────────────────────────────────────────────────┐
│ Order #1047 — Printed March 3, 2026             │
├──────────────────────────────────────────────────┤
│ 📸 Original: 1800 × 1200 px (0.8 MB)            │
│ 📋 Print size: 8" × 10"                         │
│ 🎯 Quality selected: Fair (150 DPI)             │
│                                                  │
│ What we did:                                    │
│ ✓ Assessed resolution: 150 DPI (below standard) │
│ ✓ Offered upscaling option                      │
│ ✓ You chose: "Print as-is (fair quality)"      │
│ ✓ Method: Standard print, no upscaling          │
│                                                  │
│ Status: ✓ Delivered (Jan 15)                    │
│                                                  │
│ [View details] [Reorder]                        │
└──────────────────────────────────────────────────┘
```

**Alternate: Upscaled order**

```
┌──────────────────────────────────────────────────┐
│ Order #1048 — Printed March 3, 2026             │
├──────────────────────────────────────────────────┤
│ 📸 Original: 1800 × 1200 px (0.8 MB)            │
│ 📋 Print size: 8" × 10"                         │
│ 🎯 Quality selected: Excellent (300 DPI)        │
│                                                  │
│ What we did:                                    │
│ ✓ Detected resolution shortfall (150 → 300 DPI)│
│ ✓ Recommended upscaling (1.5×)                  │
│ ✓ You chose: "Upscale for photo-quality"       │
│ ✓ Applied AI upscaling: 2400 × 3000 pixels      │
│ ✓ Final DPI: 300 (photo-quality)                │
│ ✓ Upscaling cost: +$2                           │
│                                                  │
│ Status: ✓ Delivered (Feb 20)                    │
│                                                  │
│ [View details] [Reorder]                        │
└──────────────────────────────────────────────────┘
```

**Messaging tone:** Honest, factual. User sees the full decision trail.

**What to add:**
- Store decision data in database: `{ originalDPI, recommendedOption, selectedOption, upscaleFactor, cost }`
- Enhance history cards to show `What we did` section
- Add "View details" modal to expand full analysis
- "Reorder" button pre-fills calculator with same print size

---

## Visual Design Notes

### Icons & Colors
- **Green badges:** ✓ Excellent / Good (300+ DPI)
- **Yellow badges:** ⚠️ Fair (150–200 DPI) — acceptable
- **Orange badges:** ⚠️ Limited (100–150 DPI) — caution
- **Red badges:** ⚠️ Poor (< 100 DPI) — not recommended
- **⭐ Star:** Mark recommended option
- **Icons:** 📸 image, 📊 analysis, ⚠️ warning, ✓ success, 🔍 detail

### Typography
- **Quality Level:** Bold, prominent
- **DPI value:** Large, clear
- **Explanation text:** Smaller, secondary color
- **Options:** Each in its own card/button

### Interactive Elements
- **Side-by-side slider** for upscaling preview (optional but highly recommended)
- **Expandable "What's the difference?"** sections
- **Clear buttons** for each option (not radio buttons—buttons are more action-oriented)

---

## Database Changes Needed

To support full decision trail, add fields to `images` table:

```sql
ALTER TABLE images ADD COLUMN desired_print_width_in FLOAT;
ALTER TABLE images ADD COLUMN desired_print_height_in FLOAT;
ALTER TABLE images ADD COLUMN original_dpi_at_size FLOAT;
ALTER TABLE images ADD COLUMN upscale_factor FLOAT;
ALTER TABLE images ADD COLUMN upscale_method VARCHAR(255);  -- e.g., "bicubic", "ai-based"
ALTER TABLE images ADD COLUMN quality_selected VARCHAR(50);  -- e.g., "excellent", "fair"
ALTER TABLE images ADD COLUMN final_pixels_width INT;
ALTER TABLE images ADD COLUMN final_pixels_height INT;
ALTER TABLE images ADD COLUMN upscaling_cost_cents INT;  -- if applicable
ALTER TABLE images ADD COLUMN user_choice VARCHAR(255);  -- "upscale" | "lower_dpi" | "smaller_size"
```

---

## Implementation Checklist

### Phase 1: Upload Page
- [ ] Add aspect ratio calculation to UploadForm
- [ ] Enhance metadata card styling
- [ ] Add info tooltip for resolution tiers
- [ ] Update call-to-action button text

### Phase 2: Quality Analysis Component
- [ ] Create `QualityAnalysisCard.jsx` component
- [ ] Logic to determine upscale factor needed
- [ ] Logic to recommend best option
- [ ] Add three option buttons with clear labels
- [ ] Optional: Add side-by-side preview slider

### Phase 3: Calculator Integration
- [ ] Integrate QualityAnalysisCard into resolution-calculator page
- [ ] Store selected option in state
- [ ] Pass decision data to next page/API

### Phase 4: History Page
- [ ] Enhance HistoryGrid cards with decision trail
- [ ] Add "View details" modal
- [ ] Add "Reorder" functionality
- [ ] Update database schema if needed

### Phase 5: Testing & Polish
- [ ] Test with various image sizes
- [ ] Test with different print sizes
- [ ] Verify messaging consistency across pages
- [ ] Gather user feedback

---

## Key Messaging Summary

| Page | Key Message |
|------|-------------|
| **Upload** | "Let's check if this is ready to print." |
| **Calculator** | "Here's what you're getting. Here's your best option." |
| **History** | "Here's what we did and why." |

---

## Next Steps

1. Review this plan and adjust messaging/design as needed
2. Start with Phase 1 (Upload metadata card) — lowest complexity, high visibility
3. Move to Phase 2 (QualityAnalysisCard) — core feature
4. Integrate into calculator page
5. Enhance history with decision trail
6. Test end-to-end

---

## Notes & Questions

- **Upscaling method:** Currently unclear what method is used. Update this field when known.
- **Cost for upscaling:** Is there a cost? Update OPTION A messaging accordingly.
- **Preview slider:** Is this a nice-to-have or must-have? Could use `react-compare-slider` library if needed.
- **Database:** Confirm if these fields should be added to `images` table or stored separately in an `orders` table.

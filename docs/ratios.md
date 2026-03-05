# Target Ratio Definitions

Defined in `lib/output-sizes.js`.

## Portrait Ratios

### 2:3 (ratio: 0.6667)
| Label | Width (in) | Height (in) | Width (px) | Height (px) |
|---|---|---|---|---|
| 4x6 | 4 | 6 | 1200 | 1800 |
| 6x9 | 6 | 9 | 1800 | 2700 |
| 8x12 | 8 | 12 | 2400 | 3600 |
| 10x15 | 10 | 15 | 3000 | 4500 |
| 12x18 | 12 | 18 | 3600 | 5400 |
| 16x24 | 16 | 24 | 4800 | 7200 |
| 20x30 | 20 | 30 | 6000 | 9000 |
| 24x36 | 24 | 36 | 7200 | 10800 |
| 28x42 | 28 | 42 | 8400 | 12600 |
| 32x48 | 32 | 48 | 9600 | 14400 |
| 36x54 | 36 | 54 | 10800 | 16200 |
| 40x60 | 40 | 60 | 12000 | 18000 |

### 3:4 (ratio: 0.75)
| Label | Width (in) | Height (in) | Width (px) | Height (px) |
|---|---|---|---|---|
| 6x8 | 6 | 8 | 1800 | 2400 |
| 9x12 | 9 | 12 | 2700 | 3600 |
| 12x16 | 12 | 16 | 3600 | 4800 |
| 15x20 | 15 | 20 | 4500 | 6000 |
| 18x24 | 18 | 24 | 5400 | 7200 |
| 24x32 | 24 | 32 | 7200 | 9600 |
| 30x40 | 30 | 40 | 9000 | 12000 |
| 36x48 | 36 | 48 | 10800 | 14400 |

### 4:5 (ratio: 0.8)
| Label | Width (in) | Height (in) | Width (px) | Height (px) |
|---|---|---|---|---|
| 8x10 | 8 | 10 | 2400 | 3000 |
| 12x15 | 12 | 15 | 3600 | 4500 |
| 16x20 | 16 | 20 | 4800 | 6000 |
| 20x25 | 20 | 25 | 6000 | 7500 |
| 24x30 | 24 | 30 | 7200 | 9000 |
| 32x40 | 32 | 40 | 9600 | 12000 |
| 40x50 | 40 | 50 | 12000 | 15000 |
| 48x60 | 48 | 60 | 14400 | 18000 |

### US Letter / Tabloid
| Label | Width (in) | Height (in) | Width (px) | Height (px) | Ratio key |
|---|---|---|---|---|---|
| 8.5x11 | 8.5 | 11 | 2550 | 3300 | Letter |
| 11x14 | 11 | 14 | 3300 | 4200 | 11:14 |
| 11x17 | 11 | 17 | 3300 | 5100 | 11:17 |

### A-Series / ISO (ratio: 210/297 ≈ 0.7071)
| Label | Width (in) | Height (in) | Width (px) | Height (px) |
|---|---|---|---|---|
| A7 | 2.91 | 4.13 | 873 | 1239 |
| A6 | 4.13 | 5.83 | 1239 | 1749 |
| A5 | 5.83 | 8.27 | 1749 | 2481 |
| A4 | 8.27 | 11.69 | 2481 | 3507 |
| A3 | 11.69 | 16.54 | 3507 | 4962 |
| A2 | 16.54 | 23.39 | 4962 | 7017 |
| A1 | 23.39 | 33.11 | 7017 | 9933 |
| A0 | 33.11 | 46.81 | 9933 | 14043 |

---

## Landscape Ratios

All landscape sizes have width > height (dimensions swapped from portrait equivalents).

### 3:2 (landscape mirror of 2:3)
6×4, 9×6, 12×8, 15×10, 18×12, 24×16, 30×20, 36×24, 42×28, 48×32, 54×36, 60×40

### 4:3 (landscape mirror of 3:4)
8×6, 12×9, 16×12, 20×15, 24×18, 32×24, 40×30, 48×36

### 5:4 (landscape mirror of 4:5)
10×8, 15×12, 20×16, 25×20, 30×24, 40×32, 50×40, 60×48

Letter/A-Series landscape: same sizes with width/height swapped.

---

## Filename Ratio Keys

| Ratio | Filename key |
|---|---|
| 2:3 | `2x3` |
| 3:4 | `3x4` |
| 4:5 | `4x5` |
| Letter | `letter` |
| 11:14 | `11x14` |
| 11:17 | `11x17` |
| A-Series | `a` (size-specific: `a7`–`a0`) |
| 3:2 | `3x2` |
| 4:3 | `4x3` |
| 5:4 | `5x4` |
| A-Series landscape | `a` (size-specific: `a7`–`a0`) |

Rules: colons → `x`, lowercase. A-Series → `a`.

---

## Sacrifice Direction Logic

```js
function getSacrificeDirection(originalRatio, targetRatio) {
  if (Math.abs(originalRatio - targetRatio) < 0.01) return 'none'
  if (targetRatio > originalRatio) return 'horizontal' // target wider: sacrifice left/right
  return 'vertical' // target narrower: sacrifice top/bottom
}
```

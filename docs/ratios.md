# Target Ratio Definitions

Defined in `lib/output-sizes.js`.

## Portrait Ratios

### 2:3 (ratio: 0.6667)
| Label | Width (in) | Height (in) | Width (px) | Height (px) |
|---|---|---|---|---|
| 4x6 | 4 | 6 | 1200 | 1800 |
| 8x12 | 8 | 12 | 2400 | 3600 |
| 16x24 | 16 | 24 | 4800 | 7200 |
| 24x36 | 24 | 36 | 7200 | 10800 |

### 3:4 (ratio: 0.75)
| Label | Width (in) | Height (in) | Width (px) | Height (px) |
|---|---|---|---|---|
| 6x8 | 6 | 8 | 1800 | 2400 |
| 9x12 | 9 | 12 | 2700 | 3600 |
| 12x16 | 12 | 16 | 3600 | 4800 |
| 18x24 | 18 | 24 | 5400 | 7200 |

### 4:5 (ratio: 0.8)
| Label | Width (in) | Height (in) | Width (px) | Height (px) |
|---|---|---|---|---|
| 4x5 | 4 | 5 | 1200 | 1500 |
| 8x10 | 8 | 10 | 2400 | 3000 |
| 16x20 | 16 | 20 | 4800 | 6000 |

### 8:11 (ratio: 0.7273)
| Label | Width (in) | Height (in) | Width (px) | Height (px) |
|---|---|---|---|---|
| 8x11 | 8 | 11 | 2400 | 3300 |

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

Same ratios with width/height swapped:

| Key | Ratio | Landscape of |
|---|---|---|
| 3:2 | 1.5 | 2:3 |
| 4:3 | 1.333 | 3:4 |
| 5:4 | 1.25 | 4:5 |
| 11:8 | 1.375 | 8:11 |
| A-Series landscape | 1.414 | A-Series |

All landscape sizes have width > height (dimensions swapped from portrait equivalents).

---

## Filename Ratio Keys

| Ratio | Filename key |
|---|---|
| 2:3 | `2x3` |
| 3:4 | `3x4` |
| 4:5 | `4x5` |
| 8:11 | `8x11` |
| A-Series | `a` |
| 3:2 | `3x2` |
| 4:3 | `4x3` |
| 5:4 | `5x4` |
| 11:8 | `11x8` |
| A-Series landscape | `a-landscape` |

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

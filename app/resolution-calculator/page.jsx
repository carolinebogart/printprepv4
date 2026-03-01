'use client';

import { useState } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '4×6"',   w: 4,     h: 6     },
  { label: '5×7"',   w: 5,     h: 7     },
  { label: '8×10"',  w: 8,     h: 10    },
  { label: '8×11"',  w: 8,     h: 11    },
  { label: '8×12"',  w: 8,     h: 12    },
  { label: '11×14"', w: 11,    h: 14    },
  { label: '16×20"', w: 16,    h: 20    },
  { label: '18×24"', w: 18,    h: 24    },
  { label: '24×36"', w: 24,    h: 36    },
  { label: 'A5',     w: 5.83,  h: 8.27  },
  { label: 'A4',     w: 8.27,  h: 11.69 },
  { label: 'A3',     w: 11.69, h: 16.54 },
];

const DPI_LEVELS = [
  { label: 'Excellent', range: '300+ DPI',      detail: 'ideal for all professional print',              color: 'text-green-700  bg-green-50  border-green-200'  },
  { label: 'Good',      range: '200–299 DPI',   detail: 'suitable for most home & online print services', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  { label: 'Fair',      range: '150–199 DPI',   detail: 'may appear slightly soft at full size',          color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { label: 'Low',       range: 'below 150 DPI', detail: 'likely to appear pixelated when printed',        color: 'text-red-600    bg-red-50    border-red-200'    },
];

const EMPTY = {
  widthPx: '', widthIn: '', widthCm: '',
  heightPx: '', heightIn: '', heightCm: '',
  dpi: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Format a number for display: strip trailing decimal zeros
function fmt(n, decimals = 2) {
  if (!isFinite(n)) return '';
  const str = n.toFixed(decimals);
  return str.includes('.') ? str.replace(/\.?0+$/, '') : str;
}

function getQuality(dpi) {
  if (!isFinite(dpi) || dpi <= 0) return null;
  if (dpi >= 300) return { label: 'Excellent', color: 'text-green-700 bg-green-50 border-green-200' };
  if (dpi >= 200) return { label: 'Good',      color: 'text-yellow-700 bg-yellow-50 border-yellow-200' };
  if (dpi >= 150) return { label: 'Fair',      color: 'text-orange-600 bg-orange-50 border-orange-200' };
  return             { label: 'Low',       color: 'text-red-600 bg-red-50 border-red-200' };
}

// ── Core computation ──────────────────────────────────────────────────────────
//
// Variables: px, in, cm, dpi
// Constraints: cm = in × 2.54   and   px = in × dpi
// Knowing any 2 of (px, in, dpi) → can derive the third.
// cm and in are always linked.

function compute(f, manual) {
  // Parse only manually-entered fields
  const p = {};
  for (const k in f) {
    const n = parseFloat(f[k]);
    p[k] = manual.has(k) && f[k] !== '' && isFinite(n) ? n : NaN;
  }

  const out = { ...f };

  // Step 1: in ↔ cm sync (entering either updates the other, never conflict)
  if (!isNaN(p.widthIn))   out.widthCm  = fmt(p.widthIn * 2.54);
  if (!isNaN(p.widthCm))   out.widthIn  = fmt(p.widthCm / 2.54, 4);
  if (!isNaN(p.heightIn))  out.heightCm = fmt(p.heightIn * 2.54);
  if (!isNaN(p.heightCm))  out.heightIn = fmt(p.heightCm / 2.54, 4);

  // Parse full state (includes newly computed in/cm values)
  const a = {};
  for (const k in out) { const n = parseFloat(out[k]); a[k] = isFinite(n) ? n : NaN; }

  // Step 2: derive DPI from whichever row has both px and in
  if (!manual.has('dpi')) {
    if (!isNaN(a.widthPx)  && !isNaN(a.widthIn)  && a.widthIn  > 0) out.dpi = fmt(a.widthPx  / a.widthIn,  1);
    else if (!isNaN(a.heightPx) && !isNaN(a.heightIn) && a.heightIn > 0) out.dpi = fmt(a.heightPx / a.heightIn, 1);
    const n = parseFloat(out.dpi); a.dpi = isFinite(n) ? n : NaN;
  }

  // Step 3: fill remaining px or in fields using DPI
  if (!isNaN(a.dpi) && a.dpi > 0) {
    if (!isNaN(a.widthIn)  && isNaN(a.widthPx)  && !manual.has('widthPx'))  out.widthPx  = String(Math.round(a.widthIn  * a.dpi));
    if (!isNaN(a.heightIn) && isNaN(a.heightPx) && !manual.has('heightPx')) out.heightPx = String(Math.round(a.heightIn * a.dpi));

    if (!isNaN(a.widthPx)  && isNaN(a.widthIn)  && !manual.has('widthIn')) {
      const wIn = a.widthPx / a.dpi;
      out.widthIn = fmt(wIn, 4);
      out.widthCm = fmt(wIn * 2.54);
    }
    if (!isNaN(a.heightPx) && isNaN(a.heightIn) && !manual.has('heightIn')) {
      const hIn = a.heightPx / a.dpi;
      out.heightIn = fmt(hIn, 4);
      out.heightCm = fmt(hIn * 2.54);
    }
  }

  return out;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResolutionCalculatorPage() {
  const [fields, setFields] = useState(EMPTY);
  const [manual, setManual] = useState(new Set());

  function handleChange(field, value) {
    const newManual = new Set(manual);
    if (value === '') {
      newManual.delete(field);
    } else {
      newManual.add(field);
      // in ↔ cm are always linked — entering one resets the other to computed
      if (field === 'widthIn')  newManual.delete('widthCm');
      if (field === 'widthCm')  newManual.delete('widthIn');
      if (field === 'heightIn') newManual.delete('heightCm');
      if (field === 'heightCm') newManual.delete('heightIn');
    }
    setManual(newManual);
    setFields(compute({ ...fields, [field]: value }, newManual));
  }

  function handlePreset(w, h) {
    const newManual = new Set(['widthIn', 'heightIn']);
    setManual(newManual);
    setFields(compute({ ...EMPTY, widthIn: String(w), heightIn: String(h) }, newManual));
  }

  function handleClear() {
    setFields(EMPTY);
    setManual(new Set());
  }

  const dpiNum  = parseFloat(fields.dpi);
  const quality = getQuality(dpiNum);

  function cellClass(field) {
    const isComputed = fields[field] !== '' && !manual.has(field);
    const base = 'w-full rounded-lg border px-3 py-2 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors';
    return isComputed
      ? `${base} border-blue-200 bg-blue-50 text-blue-700 focus:bg-white focus:text-gray-900`
      : `${base} border-gray-300 bg-white text-gray-900`;
  }

  const colHeader = 'text-xs font-semibold text-gray-500 uppercase tracking-wide text-center pb-1';
  const rowLabel  = 'text-sm font-medium text-gray-700 flex items-center';

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">

      {/* Page header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Resolution Calculator</h1>
        <p className="text-gray-500 mt-3">
          Convert between pixels, inches, centimeters, and DPI.<br />
          Fill in any two values — the rest compute automatically.
        </p>
      </div>

      {/* Calculator */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 mb-5">

        {/* Column headers */}
        <div className="grid grid-cols-[5rem_1fr_1fr_1fr] gap-3 mb-1">
          <div />
          <div className={colHeader}>Pixels</div>
          <div className={colHeader}>Inches</div>
          <div className={colHeader}>Centimeters</div>
        </div>

        {/* Width row */}
        <div className="grid grid-cols-[5rem_1fr_1fr_1fr] gap-3 mb-3 items-center">
          <div className={rowLabel}>Width</div>
          <input type="number" min="0" step="1"    placeholder="—" value={fields.widthPx}  onChange={e => handleChange('widthPx',  e.target.value)} className={cellClass('widthPx')}  />
          <input type="number" min="0" step="any"  placeholder="—" value={fields.widthIn}  onChange={e => handleChange('widthIn',  e.target.value)} className={cellClass('widthIn')}  />
          <input type="number" min="0" step="any"  placeholder="—" value={fields.widthCm}  onChange={e => handleChange('widthCm',  e.target.value)} className={cellClass('widthCm')}  />
        </div>

        {/* Height row */}
        <div className="grid grid-cols-[5rem_1fr_1fr_1fr] gap-3 items-center">
          <div className={rowLabel}>Height</div>
          <input type="number" min="0" step="1"    placeholder="—" value={fields.heightPx} onChange={e => handleChange('heightPx', e.target.value)} className={cellClass('heightPx')} />
          <input type="number" min="0" step="any"  placeholder="—" value={fields.heightIn} onChange={e => handleChange('heightIn', e.target.value)} className={cellClass('heightIn')} />
          <input type="number" min="0" step="any"  placeholder="—" value={fields.heightCm} onChange={e => handleChange('heightCm', e.target.value)} className={cellClass('heightCm')} />
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 my-5" />

        {/* DPI + quality */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid grid-cols-[5rem_1fr] gap-3 items-center">
            <div className={rowLabel}>DPI</div>
            <input
              type="number" min="1" step="any" placeholder="—"
              value={fields.dpi}
              onChange={e => handleChange('dpi', e.target.value)}
              className={`${cellClass('dpi')} w-28`}
            />
          </div>

          {quality && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold ${quality.color}`}>
              {quality.label}
              <span className="font-normal text-current opacity-70">· {Math.round(dpiNum)} DPI</span>
            </div>
          )}
        </div>

        {/* Legend + Clear */}
        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-5 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-gray-300 bg-white inline-block" />
              You entered
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-blue-200 bg-blue-50 inline-block" />
              Computed
            </span>
          </div>
          <button
            onClick={handleClear}
            className="text-sm text-gray-400 hover:text-gray-700 underline underline-offset-2"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Preset sizes */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Common Print Sizes</h2>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset.w, preset.h)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Clicking a size fills the inch dimensions. Enter your pixel dimensions or a target DPI to see the result.
        </p>
      </div>

      {/* DPI quality guide */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Print Quality Reference</h2>
        <div className="space-y-2.5">
          {DPI_LEVELS.map(level => (
            <div key={level.label} className="flex items-center gap-3 text-sm">
              <span className={`w-24 shrink-0 text-xs font-semibold rounded px-2 py-0.5 text-center border ${level.color}`}>
                {level.label}
              </span>
              <span className="text-gray-500">
                <span className="font-medium text-gray-700">{level.range}</span>
                {' '}— {level.detail}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

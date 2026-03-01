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
  { label: 'Excellent', range: '300+ DPI',      detail: 'ideal for all professional print',               color: 'text-green-700  bg-green-50  border-green-200'  },
  { label: 'Good',      range: '200–299 DPI',   detail: 'suitable for most home & online print services', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  { label: 'Fair',      range: '150–199 DPI',   detail: 'may appear slightly soft at full size',           color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { label: 'Low',       range: 'below 150 DPI', detail: 'likely to appear pixelated when printed',         color: 'text-red-600    bg-red-50    border-red-200'    },
];

const EMPTY = {
  widthPx: '', widthIn: '', widthCm: '',
  heightPx: '', heightIn: '', heightCm: '',
  dpi: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n, decimals = 2) {
  if (!isFinite(n) || n === null) return '';
  const str = n.toFixed(decimals);
  return str.includes('.') ? str.replace(/\.?0+$/, '') : str;
}

function pos(v) {
  const n = parseFloat(v);
  return isFinite(n) && n > 0 ? n : null;
}

function getQuality(dpi) {
  if (!isFinite(dpi) || dpi <= 0) return null;
  if (dpi >= 300) return { label: 'Excellent', color: 'text-green-700 bg-green-50 border-green-200' };
  if (dpi >= 200) return { label: 'Good',      color: 'text-yellow-700 bg-yellow-50 border-yellow-200' };
  if (dpi >= 150) return { label: 'Fair',      color: 'text-orange-600 bg-orange-50 border-orange-200' };
  return             { label: 'Low',       color: 'text-red-600 bg-red-50 border-red-200' };
}

// ── Core calculation ──────────────────────────────────────────────────────────
//
// Input→Output rules (user-specified):
//   inches + DPI → px
//   inches       → cm
//   pixels + DPI → in
//   pixels + DPI → cm
//   cm + DPI     → px
//   cm           → in

function calculateAll(vals) {
  let wPx = pos(vals.widthPx),  wIn = pos(vals.widthIn),  wCm = pos(vals.widthCm);
  let hPx = pos(vals.heightPx), hIn = pos(vals.heightIn), hCm = pos(vals.heightCm);
  let dpi = pos(vals.dpi);

  // Step 1: Resolve all inch values (in ↔ cm ↔ px/dpi)
  if (!wIn && wCm)        wIn = wCm / 2.54;
  if (!wIn && wPx && dpi) wIn = wPx / dpi;
  if (!hIn && hCm)        hIn = hCm / 2.54;
  if (!hIn && hPx && dpi) hIn = hPx / dpi;

  // Step 2: Derive DPI if not provided
  if (!dpi && wPx && wIn) dpi = wPx / wIn;
  if (!dpi && hPx && hIn) dpi = hPx / hIn;

  // Step 3: Fill cm and px from inches + dpi
  if (wIn) {
    if (!wCm) wCm = wIn * 2.54;
    if (!wPx && dpi) wPx = wIn * dpi;
  }
  if (hIn) {
    if (!hCm) hCm = hIn * 2.54;
    if (!hPx && dpi) hPx = hIn * dpi;
  }

  // Step 4: Second pass — px+dpi → in → cm (for cases where inches weren't entered)
  if (!wIn && wPx && dpi) { wIn = wPx / dpi; if (!wCm) wCm = wIn * 2.54; }
  if (!hIn && hPx && dpi) { hIn = hPx / dpi; if (!hCm) hCm = hIn * 2.54; }

  return { wPx, wIn, wCm, hPx, hIn, hCm, dpi };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResolutionCalculatorPage() {
  const [fields, setFields]           = useState(EMPTY);
  const [computed, setComputed]       = useState(new Set());
  const [hasCalculated, setHasCalc]   = useState(false);
  const [error, setError]             = useState('');

  function handleChange(field, value) {
    setFields(prev => ({ ...prev, [field]: value }));
    // Clear computed status when user edits a field
    setComputed(prev => { const s = new Set(prev); s.delete(field); return s; });
    setError('');
  }

  function handleCalculate() {
    const result = calculateAll(fields);
    const { wPx, wIn, wCm, hPx, hIn, hCm, dpi } = result;

    // Check if we got anything useful
    if (!wIn && !wPx && !wCm && !hIn && !hPx && !hCm && !dpi) {
      setError('Enter at least two values to calculate.');
      return;
    }

    const newComputed = new Set();
    const newFields   = { ...fields };

    function fill(key, origKey, val, decimals = 2, round = false) {
      if (val !== null && fields[origKey] === '') {
        newFields[key] = round ? String(Math.round(val)) : fmt(val, decimals);
        newComputed.add(key);
      } else if (val !== null && fields[origKey] === '') {
        newFields[key] = round ? String(Math.round(val)) : fmt(val, decimals);
      }
    }

    // Width
    if (wPx  !== null && fields.widthPx  === '') { newFields.widthPx  = String(Math.round(wPx));   newComputed.add('widthPx');  }
    if (wIn  !== null && fields.widthIn  === '') { newFields.widthIn  = fmt(wIn, 4);                newComputed.add('widthIn');  }
    if (wCm  !== null && fields.widthCm  === '') { newFields.widthCm  = fmt(wCm, 2);                newComputed.add('widthCm');  }
    // Height
    if (hPx  !== null && fields.heightPx === '') { newFields.heightPx = String(Math.round(hPx));   newComputed.add('heightPx'); }
    if (hIn  !== null && fields.heightIn === '') { newFields.heightIn = fmt(hIn, 4);                newComputed.add('heightIn'); }
    if (hCm  !== null && fields.heightCm === '') { newFields.heightCm = fmt(hCm, 2);                newComputed.add('heightCm'); }
    // DPI
    if (dpi  !== null && fields.dpi      === '') { newFields.dpi      = fmt(dpi, 1);               newComputed.add('dpi');      }

    setFields(newFields);
    setComputed(newComputed);
    setHasCalc(true);
    setError('');
  }

  function handlePreset(w, h) {
    setFields({ ...EMPTY, widthIn: String(w), heightIn: String(h) });
    setComputed(new Set());
    setHasCalc(false);
    setError('');
  }

  function handleClear() {
    setFields(EMPTY);
    setComputed(new Set());
    setHasCalc(false);
    setError('');
  }

  const dpiNum  = parseFloat(fields.dpi);
  const quality = hasCalculated ? getQuality(dpiNum) : null;

  function cellClass(field) {
    const isComputed = computed.has(field);
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
          Fill in what you know, then click Calculate.
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
          <input type="number" min="0" step="1"   placeholder="—" value={fields.widthPx}  onChange={e => handleChange('widthPx',  e.target.value)} className={cellClass('widthPx')}  />
          <input type="number" min="0" step="any" placeholder="—" value={fields.widthIn}  onChange={e => handleChange('widthIn',  e.target.value)} className={cellClass('widthIn')}  />
          <input type="number" min="0" step="any" placeholder="—" value={fields.widthCm}  onChange={e => handleChange('widthCm',  e.target.value)} className={cellClass('widthCm')}  />
        </div>

        {/* Height row */}
        <div className="grid grid-cols-[5rem_1fr_1fr_1fr] gap-3 items-center">
          <div className={rowLabel}>Height</div>
          <input type="number" min="0" step="1"   placeholder="—" value={fields.heightPx} onChange={e => handleChange('heightPx', e.target.value)} className={cellClass('heightPx')} />
          <input type="number" min="0" step="any" placeholder="—" value={fields.heightIn} onChange={e => handleChange('heightIn', e.target.value)} className={cellClass('heightIn')} />
          <input type="number" min="0" step="any" placeholder="—" value={fields.heightCm} onChange={e => handleChange('heightCm', e.target.value)} className={cellClass('heightCm')} />
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

        {/* Error */}
        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}

        {/* Legend + actions */}
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
          <div className="flex items-center gap-3">
            <button
              onClick={handleClear}
              className="text-sm text-gray-400 hover:text-gray-700 underline underline-offset-2"
            >
              Clear
            </button>
            <button
              onClick={handleCalculate}
              className="btn-primary btn-sm"
            >
              Calculate
            </button>
          </div>
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
          Clicking a size fills the inch dimensions. Add your pixel count or target DPI, then click Calculate.
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

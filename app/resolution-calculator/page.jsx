'use client';

import { useState } from 'react';

// ── Preset groups ─────────────────────────────────────────────────────────────

const PRESET_GROUPS = [
  {
    name: '2:3',
    sizes: [
      { label: '4×6',   wIn: 4,    hIn: 6,    wCm: 10.16,  hCm: 15.24  },
      { label: '12×18', wIn: 12,   hIn: 18,   wCm: 30.48,  hCm: 45.72  },
      { label: '16×24', wIn: 16,   hIn: 24,   wCm: 40.64,  hCm: 60.96  },
      { label: '20×30', wIn: 20,   hIn: 30,   wCm: 50.8,   hCm: 76.2   },
      { label: '24×36', wIn: 24,   hIn: 36,   wCm: 60.96,  hCm: 91.44  },
      { label: '40×60', wIn: 40,   hIn: 60,   wCm: 101.6,  hCm: 152.4  },
    ],
  },
  {
    name: '3:4',
    sizes: [
      { label: '9×12',  wIn: 9,    hIn: 12,   wCm: 22.86,  hCm: 30.48  },
      { label: '12×16', wIn: 12,   hIn: 16,   wCm: 30.48,  hCm: 40.64  },
      { label: '18×24', wIn: 18,   hIn: 24,   wCm: 45.72,  hCm: 60.96  },
      { label: '30×40', wIn: 30,   hIn: 40,   wCm: 76.2,   hCm: 101.6  },
      { label: '36×48', wIn: 36,   hIn: 48,   wCm: 91.44,  hCm: 121.92 },
    ],
  },
  {
    name: '4:5',
    sizes: [
      { label: '8×10',  wIn: 8,    hIn: 10,   wCm: 20.32,  hCm: 25.4   },
      { label: '16×20', wIn: 16,   hIn: 20,   wCm: 40.64,  hCm: 50.8   },
      { label: '24×30', wIn: 24,   hIn: 30,   wCm: 60.96,  hCm: 76.2   },
      { label: '40×50', wIn: 40,   hIn: 50,   wCm: 101.6,  hCm: 127    },
      { label: '48×60', wIn: 48,   hIn: 60,   wCm: 121.92, hCm: 152.4  },
    ],
  },
  {
    name: 'Paper',
    sizes: [
      { label: '8.5×11', wIn: 8.5, hIn: 11,   wCm: 21.59,  hCm: 27.94 },
      { label: '11×14',  wIn: 11,  hIn: 14,   wCm: 27.94,  hCm: 35.56 },
      { label: '11×17',  wIn: 11,  hIn: 17,   wCm: 27.94,  hCm: 43.18 },
    ],
  },
  {
    name: 'A-Series',
    sizes: [
      { label: 'A7', wIn: 2.9,  hIn: 4.1,  wCm: 7.4,   hCm: 10.4  },
      { label: 'A6', wIn: 4.1,  hIn: 5.8,  wCm: 10.4,  hCm: 14.7  },
      { label: 'A5', wIn: 5.8,  hIn: 8.3,  wCm: 14.7,  hCm: 21.1  },
      { label: 'A4', wIn: 8.3,  hIn: 11.7, wCm: 21.1,  hCm: 29.7  },
      { label: 'A3', wIn: 11.7, hIn: 16.5, wCm: 29.7,  hCm: 41.9  },
      { label: 'A2', wIn: 16.5, hIn: 23.4, wCm: 41.9,  hCm: 59.5  },
      { label: 'A1', wIn: 23.4, hIn: 33.1, wCm: 59.5,  hCm: 84.1  },
      { label: 'A0', wIn: 33.1, hIn: 46.8, wCm: 84.1,  hCm: 118.9 },
    ],
  },
];

// ── DPI quality reference ─────────────────────────────────────────────────────

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

function calculateAll(vals) {
  let wPx = pos(vals.widthPx),  wIn = pos(vals.widthIn),  wCm = pos(vals.widthCm);
  let hPx = pos(vals.heightPx), hIn = pos(vals.heightIn), hCm = pos(vals.heightCm);
  let dpi = pos(vals.dpi);

  // Step 1: Resolve inch values
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

  // Step 4: Second pass — px+dpi → in → cm
  if (!wIn && wPx && dpi) { wIn = wPx / dpi; if (!wCm) wCm = wIn * 2.54; }
  if (!hIn && hPx && dpi) { hIn = hPx / dpi; if (!hCm) hCm = hIn * 2.54; }

  return { wPx, wIn, wCm, hPx, hIn, hCm, dpi };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResolutionCalculatorPage() {
  const [fields, setFields]         = useState(EMPTY);
  const [computed, setComputed]     = useState(new Set());
  const [hasCalculated, setHasCalc] = useState(false);
  const [error, setError]           = useState('');

  function handleChange(field, value) {
    setFields(prev => ({ ...prev, [field]: value }));
    setComputed(prev => { const s = new Set(prev); s.delete(field); return s; });
    setError('');
  }

  function handleCalculate() {
    const result = calculateAll(fields);
    const { wPx, wIn, wCm, hPx, hIn, hCm, dpi } = result;

    if (!wIn && !wPx && !wCm && !hIn && !hPx && !hCm && !dpi) {
      setError('Enter at least two values to calculate.');
      return;
    }

    const newComputed = new Set();
    const newFields   = { ...fields };

    if (wPx !== null && fields.widthPx  === '') { newFields.widthPx  = String(Math.round(wPx)); newComputed.add('widthPx');  }
    if (wIn !== null && fields.widthIn  === '') { newFields.widthIn  = fmt(wIn, 4);              newComputed.add('widthIn');  }
    if (wCm !== null && fields.widthCm  === '') { newFields.widthCm  = fmt(wCm, 2);              newComputed.add('widthCm');  }
    if (hPx !== null && fields.heightPx === '') { newFields.heightPx = String(Math.round(hPx)); newComputed.add('heightPx'); }
    if (hIn !== null && fields.heightIn === '') { newFields.heightIn = fmt(hIn, 4);              newComputed.add('heightIn'); }
    if (hCm !== null && fields.heightCm === '') { newFields.heightCm = fmt(hCm, 2);              newComputed.add('heightCm'); }
    if (dpi !== null && fields.dpi      === '') { newFields.dpi      = fmt(dpi, 1);              newComputed.add('dpi');      }

    setFields(newFields);
    setComputed(newComputed);
    setHasCalc(true);
    setError('');
  }

  function handlePreset(size) {
    const presetFields = {
      widthIn:  String(size.wIn),
      heightIn: String(size.hIn),
      widthCm:  String(size.wCm),
      heightCm: String(size.hCm),
      dpi:      '300',
      widthPx:  '',
      heightPx: '',
    };
    const result = calculateAll(presetFields);
    setFields({
      ...presetFields,
      widthPx:  result.wPx !== null ? String(Math.round(result.wPx)) : '',
      heightPx: result.hPx !== null ? String(Math.round(result.hPx)) : '',
    });
    setComputed(new Set(['widthPx', 'heightPx']));
    setHasCalc(true);
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

      {/* Preset sizes — grouped by ratio */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Common Print Sizes</h2>
        <div className="space-y-3">
          {PRESET_GROUPS.map(group => (
            <div key={group.name} className="flex items-start gap-3">
              <span className="text-xs font-semibold text-gray-400 w-16 shrink-0 pt-1.5">{group.name}</span>
              <div className="flex flex-wrap gap-1.5">
                {group.sizes.map(size => (
                  <button
                    key={size.label}
                    onClick={() => handlePreset(size)}
                    className="px-2.5 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Selecting a size fills all fields at 300 DPI. Adjust the DPI field and click Calculate to recalculate pixels.
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

'use client';

import { useState } from 'react';

// ── Preset groups ─────────────────────────────────────────────────────────────

const PRESET_GROUPS = [
  {
    name: '2:3',
    sizes: [
      { label: '4×6',   wIn: 4,    hIn: 6    },
      { label: '12×18', wIn: 12,   hIn: 18   },
      { label: '16×24', wIn: 16,   hIn: 24   },
      { label: '20×30', wIn: 20,   hIn: 30   },
      { label: '24×36', wIn: 24,   hIn: 36   },
      { label: '40×60', wIn: 40,   hIn: 60   },
    ],
  },
  {
    name: '3:4',
    sizes: [
      { label: '9×12',  wIn: 9,    hIn: 12   },
      { label: '12×16', wIn: 12,   hIn: 16   },
      { label: '18×24', wIn: 18,   hIn: 24   },
      { label: '30×40', wIn: 30,   hIn: 40   },
      { label: '36×48', wIn: 36,   hIn: 48   },
    ],
  },
  {
    name: '4:5',
    sizes: [
      { label: '8×10',  wIn: 8,    hIn: 10   },
      { label: '16×20', wIn: 16,   hIn: 20   },
      { label: '24×30', wIn: 24,   hIn: 30   },
      { label: '40×50', wIn: 40,   hIn: 50   },
      { label: '48×60', wIn: 48,   hIn: 60   },
    ],
  },
  {
    name: 'Paper',
    sizes: [
      { label: '8.5×11', wIn: 8.5, hIn: 11   },
      { label: '11×14',  wIn: 11,  hIn: 14   },
      { label: '11×17',  wIn: 11,  hIn: 17   },
    ],
  },
  {
    name: 'A-Series',
    sizes: [
      { label: 'A7', wIn: 2.9,  hIn: 4.1  },
      { label: 'A6', wIn: 4.1,  hIn: 5.8  },
      { label: 'A5', wIn: 5.8,  hIn: 8.3  },
      { label: 'A4', wIn: 8.3,  hIn: 11.7 },
      { label: 'A3', wIn: 11.7, hIn: 16.5 },
      { label: 'A2', wIn: 16.5, hIn: 23.4 },
      { label: 'A1', wIn: 23.4, hIn: 33.1 },
      { label: 'A0', wIn: 33.1, hIn: 46.8 },
    ],
  },
];

const DPI_LEVELS = [
  { label: 'Excellent', range: '300+ DPI',      detail: 'ideal for all professional print',               color: 'text-green-700  bg-green-50  border-green-200'  },
  { label: 'Good',      range: '200–299 DPI',   detail: 'suitable for most home & online print services', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  { label: 'Fair',      range: '150–199 DPI',   detail: 'may appear slightly soft at full size',           color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { label: 'Low',       range: 'below 150 DPI', detail: 'likely to appear pixelated when printed',         color: 'text-red-600    bg-red-50    border-red-200'    },
];

const UNITS = ['Inches', 'Pixels', 'Centimeters'];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Core calculation ──────────────────────────────────────────────────────────

function calculate(width, height, unit, dpiStr) {
  const w = parseFloat(width);
  const h = parseFloat(height);
  const d = parseFloat(dpiStr) > 0 ? parseFloat(dpiStr) : 300;

  if (!isFinite(w) || w <= 0 || !isFinite(h) || h <= 0) return null;

  let wIn, hIn;
  if (unit === 'Inches')      { wIn = w;       hIn = h; }
  else if (unit === 'Pixels') { wIn = w / d;   hIn = h / d; }
  else                        { wIn = w / 2.54; hIn = h / 2.54; }

  return {
    inches: `${fmt(wIn)} × ${fmt(hIn)}`,
    pixels: `${Math.round(wIn * d)} × ${Math.round(hIn * d)}`,
    cm:     `${fmt(wIn * 2.54)} × ${fmt(hIn * 2.54)}`,
    dpi:    d,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResolutionCalculatorPage() {
  const [unit,   setUnit]   = useState('Inches');
  const [width,  setWidth]  = useState('');
  const [height, setHeight] = useState('');
  const [dpi,    setDpi]    = useState('300');
  const [result, setResult] = useState(null);
  const [error,  setError]  = useState('');

  const unitSuffix = unit === 'Inches' ? 'in' : unit === 'Pixels' ? 'px' : 'cm';

  function handleUnitChange(u) {
    setUnit(u);
    setWidth('');
    setHeight('');
    setResult(null);
    setError('');
  }

  function handleCalculate() {
    const r = calculate(width, height, unit, dpi);
    if (!r) { setError('Enter a width and height to calculate.'); return; }
    setResult(r);
    setError('');
  }

  function handlePreset(size) {
    setUnit('Inches');
    setWidth(String(size.wIn));
    setHeight(String(size.hIn));
    setDpi('300');
    setResult(calculate(String(size.wIn), String(size.hIn), 'Inches', '300'));
    setError('');
  }

  function handleClear() {
    setWidth('');
    setHeight('');
    setDpi('300');
    setResult(null);
    setError('');
  }

  const quality = result ? getQuality(result.dpi) : null;

  const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">

      {/* Page header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Resolution Calculator</h1>
        <p className="text-gray-500 mt-3">
          Enter dimensions in any unit and get the equivalent in all others.
        </p>
      </div>

      {/* Calculator card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">

          {/* ── Left: inputs ── */}
          <div>
            {/* Unit selector */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-5">
              {UNITS.map(u => (
                <button
                  key={u}
                  onClick={() => handleUnitChange(u)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    unit === u
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>

            {/* Width */}
            <div className="flex items-center gap-3 mb-3">
              <label className="text-sm font-medium text-gray-700 w-14 shrink-0">Width</label>
              <input
                type="number" min="0" step="any"
                placeholder={`0 ${unitSuffix}`}
                value={width}
                onChange={e => { setWidth(e.target.value); setResult(null); }}
                className={inputClass}
              />
            </div>

            {/* Height */}
            <div className="flex items-center gap-3 mb-3">
              <label className="text-sm font-medium text-gray-700 w-14 shrink-0">Height</label>
              <input
                type="number" min="0" step="any"
                placeholder={`0 ${unitSuffix}`}
                value={height}
                onChange={e => { setHeight(e.target.value); setResult(null); }}
                className={inputClass}
              />
            </div>

            {/* DPI */}
            <div className="flex items-center gap-3 mb-5">
              <label className="text-sm font-medium text-gray-700 w-14 shrink-0">DPI</label>
              <input
                type="number" min="1" step="1"
                placeholder="300"
                value={dpi}
                onChange={e => { setDpi(e.target.value); setResult(null); }}
                className={inputClass}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button onClick={handleCalculate} className="btn-primary btn-sm">
                Calculate
              </button>
              <button
                onClick={handleClear}
                className="text-sm text-gray-400 hover:text-gray-700 underline underline-offset-2"
              >
                Clear
              </button>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>

          {/* ── Right: results ── */}
          <div className="flex flex-col justify-center">
            {result ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Inches</div>
                  <div className="text-sm font-medium text-gray-900">{result.inches} in</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Pixels</div>
                  <div className="text-sm font-medium text-gray-900">{result.pixels} px</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Centimeters</div>
                  <div className="text-sm font-medium text-gray-900">{result.cm} cm</div>
                </div>
                {quality && (
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${quality.color}`}>
                    {quality.label}
                    <span className="font-normal opacity-70">· {result.dpi} DPI</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-300 text-center sm:text-left">Results appear here</p>
            )}
          </div>

        </div>
      </div>

      {/* Preset sizes — grouped by ratio */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Common Print Sizes</h2>
        <div className="space-y-3">
          {PRESET_GROUPS.map(group => (
            <div key={group.name} className="flex items-start gap-3">
              <span className="text-xs font-semibold text-gray-400 w-16 shrink-0 pt-1">{group.name}</span>
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
          Selecting a size calculates all units at 300 DPI.
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

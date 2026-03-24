import { useState, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import QRCode from 'qrcode';
import TagTemplate from './TagTemplate';
import AlertModal from './AlertModal.jsx';
import useAlertModal from '../hooks/useAlertModal.js';

// ── Predefined page sizes (mm) ──────────────────────────────────────
const PAGE_SIZES = {
  A4: { width: 210, height: 297, label: 'A4 (210 × 297 mm)' },
  A5: { width: 148, height: 210, label: 'A5 (148 × 210 mm)' },
  LETTER: { width: 216, height: 279, label: 'Letter (216 × 279 mm)' },
  '4x6': { width: 102, height: 152, label: '4×6" (102 × 152 mm)' },
};

// ── Storage key ──────────────────────────────────────────────────────
const STORAGE_KEY = 'gear-tag-template-config';

function loadSavedConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Strip legacy `template` field that stored raw user-editable HTML
      const { template: _ignored, ...rest } = parsed;
      return rest;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

// ── Default config ───────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  pageSize: 'A4',
  rows: 3,
  cols: 2,
  paddingX: 0,
  paddingY: 0,
  marginTop: 10,
  marginBottom: 10,
  marginLeft: 8,
  marginRight: 8,
};

// ── Resolve cq* units to absolute mm for print ───────────────────────
// PDF renderers are inconsistent with container query units, so we
// convert them to absolute mm values before writing to the print window.
function resolveCqUnits(html, cellWmm, cellHmm) {
  const cqMin = Math.min(cellWmm, cellHmm);
  return html
    .replace(/(\d+(?:\.\d+)?)cqmin/g, (_, n) => `${((parseFloat(n) * cqMin) / 100).toFixed(3)}mm`)
    .replace(/(\d+(?:\.\d+)?)cqw/g, (_, n) => `${((parseFloat(n) * cellWmm) / 100).toFixed(3)}mm`)
    .replace(/(\d+(?:\.\d+)?)cqh/g, (_, n) => `${((parseFloat(n) * cellHmm) / 100).toFixed(3)}mm`);
}

// ── QR code generation ───────────────────────────────────────────────
const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

async function generateQrDataUrl(gear) {
  const nanoid = gear?.qrTag?.nanoid;
  const qrContent = `${APP_URL}/t/${nanoid}`;

  try {
    return await QRCode.toDataURL(qrContent, {
      version: 3,
      errorCorrectionLevel: 'Q',
      width: 200,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });
  } catch {
    return '';
  }
}

// ── Component ────────────────────────────────────────────────────────

export default function TagTemplateEditor({ gearItems = [], onClose }) {
  const saved = loadSavedConfig();
  const [config, setConfig] = useState(saved || DEFAULT_CONFIG);
  const { alertState, showAlert, closeAlert } = useAlertModal();
  // Map of (gear.shortId || gear.id) -> QR data URL
  const [qrDataUrls, setQrDataUrls] = useState({});

  // Persist config on change
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Generate QR codes for all gear items
  useEffect(() => {
    let cancelled = false;
    async function generate() {
      const entries = await Promise.all(
        gearItems.map(async (gear) => {
          const key = gear.shortId || gear.id;
          const dataUrl = await generateQrDataUrl(gear);
          return [key, dataUrl];
        }),
      );
      if (!cancelled) setQrDataUrls(Object.fromEntries(entries));
    }
    generate();
    return () => {
      cancelled = true;
    };
  }, [gearItems]);

  const page = PAGE_SIZES[config.pageSize] || PAGE_SIZES.A4;

  // Calculate tag cell dimensions (mm)
  const usableW =
    page.width - config.marginLeft - config.marginRight - (config.cols - 1) * config.paddingX;
  const usableH =
    page.height - config.marginTop - config.marginBottom - (config.rows - 1) * config.paddingY;
  const cellW = usableW / config.cols;
  const cellH = usableH / config.rows;

  const tagsPerPage = config.rows * config.cols;
  const totalPages = Math.ceil(gearItems.length / tagsPerPage) || 1;

  // Group gear into pages
  const pages = [];
  for (let p = 0; p < totalPages; p++) {
    pages.push(gearItems.slice(p * tagsPerPage, (p + 1) * tagsPerPage));
  }

  function handlePrint() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showAlert('Please allow popups to print tags.');
      return;
    }

    // Load background image as data URL to ensure it works in blob context
    const loadBackgroundImage = async () => {
      try {
        const response = await fetch('/static/qr_tag_background.png');
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      } catch {
        return '/static/qr_tag_background.png'; // Fallback to relative URL
      }
    };

    loadBackgroundImage().then((bgImageUrl) => {
      // Build each page using renderToStaticMarkup so all gear field values
      const pagesHtml = pages
        .map((pageTags) => {
          const cells = pageTags
            .map((gear) => {
              const qrDataUrl = qrDataUrls[gear.shortId || gear.id] ?? '';
              // Replace relative URL with absolute or data URL
              let tagHtml = renderToStaticMarkup(<TagTemplate gear={gear} qrDataUrl={qrDataUrl} />);
              tagHtml = tagHtml.replace(
                /url\(\/static\/qr_tag_background\.png\)/g,
                `url(${bgImageUrl})`,
              );
              tagHtml = resolveCqUnits(tagHtml, cellW, cellH);
              return `<div style="width:${cellW}mm;height:${cellH}mm;overflow:hidden;border:1px dashed #ccc;box-sizing:border-box;container-type:size;">${tagHtml}</div>`;
            })
            .join('');

          return `<div class="print-page" style="width:${page.width}mm;height:${page.height}mm;padding:${config.marginTop}mm ${config.marginRight}mm ${config.marginBottom}mm ${config.marginLeft}mm;display:grid;grid-template-columns:repeat(${config.cols},${cellW}mm);grid-template-rows:repeat(${config.rows},${cellH}mm);gap:${config.paddingY}mm ${config.paddingX}mm;box-sizing:border-box;page-break-after:always;">${cells}</div>`;
        })
        .join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Gear Tags</title>
          <style>
            @page {
              size: ${page.width}mm ${page.height}mm;
              margin: 0;
            }
            * { margin: 0; padding: 0; }
            body { margin: 0; }
            .print-page:last-child { page-break-after: avoid; }
            @media print {
              .print-page { border: none; }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
            }
          </style>
        </head>
        <body>${pagesHtml}</body>
        </html>
      `;

      const htmlBlob = new Blob([html], { type: 'text/html' });
      const htmlUrl = URL.createObjectURL(htmlBlob);
      printWindow.location.href = htmlUrl;

      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        URL.revokeObjectURL(htmlUrl);
      }, 500);
    });
  }

  function handleReset() {
    setConfig(DEFAULT_CONFIG);
  }

  function set(key, value) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  // Preview scaling: fit page into a ~360px-wide container
  const previewScale = 800 / ((page.width / 25.4) * 96);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold">🏷️ Tag Designer</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              🖨️ Print {gearItems.length} Tag{gearItems.length !== 1 ? 's' : ''}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-2"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Left sidebar: settings ────────────────────────────── */}
          <div className="w-72 border-r overflow-y-auto p-4 space-y-4 text-sm flex-shrink-0">
            {/* Page size */}
            <div>
              <label className="block font-medium mb-1">Page Size</label>
              <select
                value={config.pageSize}
                onChange={(e) => set('pageSize', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                {Object.entries(PAGE_SIZES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Columns</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={config.cols}
                  onChange={(e) => set('cols', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Rows</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={config.rows}
                  onChange={(e) => set('rows', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>

            {/* Page margins */}
            <div>
              <label className="block font-medium mb-1">Page Margins (mm)</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500">Top</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={config.marginTop}
                    onChange={(e) => set('marginTop', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full border rounded-lg px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Bottom</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={config.marginBottom}
                    onChange={(e) =>
                      set('marginBottom', Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-full border rounded-lg px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Left</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={config.marginLeft}
                    onChange={(e) => set('marginLeft', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full border rounded-lg px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Right</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={config.marginRight}
                    onChange={(e) => set('marginRight', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full border rounded-lg px-3 py-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Tag dimensions (read-only) */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium mb-1">Tag Size</p>
              <p className="text-gray-600">
                {cellW.toFixed(1)} × {cellH.toFixed(1)} mm
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {tagsPerPage} tags/page · {totalPages} page{totalPages !== 1 ? 's' : ''} ·{' '}
                {gearItems.length} item{gearItems.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Reset to defaults
            </button>
          </div>

          {/* ── Center: preview ───────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto bg-gray-100 p-3">
            <div className="space-y-4">
              {pages.map((pageTags, pageIdx) => (
                <div key={pageIdx}>
                  <p className="text-xs text-gray-500 mb-2 font-medium">
                    Page {pageIdx + 1} of {totalPages}
                  </p>
                  <div
                    style={{
                      width: `${page.width}mm`,
                      height: `${page.height}mm`,
                      transform: `scale(${previewScale})`,
                      transformOrigin: 'top left',
                    }}
                  >
                    <div
                      style={{
                        width: `${page.width}mm`,
                        height: `${page.height}mm`,
                        padding: `${config.marginTop}mm ${config.marginRight}mm ${config.marginBottom}mm ${config.marginLeft}mm`,
                        display: 'grid',
                        gridTemplateColumns: `repeat(${config.cols}, ${cellW}mm)`,
                        gridTemplateRows: `repeat(${config.rows}, ${cellH}mm)`,
                        gap: `${config.paddingY}mm ${config.paddingX}mm`,
                        background: 'white',
                        boxSizing: 'border-box',
                        boxShadow: '0 2px 8px rgba(0,0,0,.15)',
                      }}
                    >
                      {pageTags.map((gear, i) => (
                        <div
                          key={gear.id || i}
                          style={{
                            width: `${cellW}mm`,
                            height: `${cellH}mm`,
                            overflow: 'hidden',
                            border: '2px dashed #d1d5db',
                            boxSizing: 'border-box',
                            containerType: 'size',
                          }}
                        >
                          <TagTemplate
                            gear={gear}
                            qrDataUrl={qrDataUrls[gear.shortId || gear.id] ?? ''}
                          />
                        </div>
                      ))}
                      {/* Fill remaining cells with empty slots */}
                      {Array.from({ length: tagsPerPage - pageTags.length }).map((_, i) => (
                        <div
                          key={`empty-${i}`}
                          style={{
                            width: `${cellW}mm`,
                            height: `${cellH}mm`,
                            border: '2px dashed #e5e7eb',
                            boxSizing: 'border-box',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#d1d5db',
                            fontSize: '11px',
                          }}
                        >
                          empty
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Spacer so the scaled page doesn't overlap the next */}
                  <div style={{ height: `${(page.height * previewScale) / 4}px` }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <AlertModal
          isOpen={alertState.isOpen}
          message={alertState.message}
          title={alertState.title}
          okText={alertState.okText}
          onClose={closeAlert}
        />
      </div>
    </div>
  );
}

export { PAGE_SIZES };

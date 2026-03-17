import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import DEFAULT_TEMPLATE from './tagTemplate.html?raw';

// ── Predefined page sizes (mm) ──────────────────────────────────────
const PAGE_SIZES = {
  A4: { width: 210, height: 297, label: 'A4 (210 × 297 mm)' },
  A5: { width: 148, height: 210, label: 'A5 (148 × 210 mm)' },
  LETTER: { width: 216, height: 279, label: 'Letter (216 × 279 mm)' },
  '4x6': { width: 102, height: 152, label: '4×6" (102 × 152 mm)' },
};

// ── Available placeholders ───────────────────────────────────────────
const PLACEHOLDERS = [
  { token: '{{ Name }}', description: 'Gear name' },
  { token: '{{ ShortId }}', description: 'Short ID (e.g. HAR-A1B)' },
  { token: '{{ Category }}', description: 'Category name' },
  { token: '{{ SerialNumber }}', description: 'Serial number' },
  { token: '{{ Description }}', description: 'Description text' },
  { token: '{{ QRCode }}', description: 'QR code image (data URL)' },
  { token: '{{ Tags }}', description: 'Comma-separated tags' },
  { token: '{{ DefaultLoanDays }}', description: 'Default loan period' },
];

// ── Storage key ──────────────────────────────────────────────────────
const STORAGE_KEY = 'gear-tag-template-config';

function loadSavedConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch { /* ignore */ }
}

// ── Default config ───────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  pageSize: 'A4',
  rows: 3,
  cols: 2,
  paddingX: 6,
  paddingY: 6,
  marginTop: 10,
  marginBottom: 10,
  marginLeft: 10,
  marginRight: 10,
  template: DEFAULT_TEMPLATE,
};

// ── Interpolate placeholders with gear data ──────────────────────────
const APP_URL = import.meta.env.VITE_APP_URL || 'https://tasuniclimbing.club';

async function renderTemplate(template, gear) {
  // Generate QR code data URL for this gear item
  const qrTarget = gear.shortId || gear.id;
  const qrContent = `${APP_URL}/gear/${qrTarget}`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(qrContent, {
      width: 200,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });
  } catch { /* fallback: leave empty */ }

  let html = template;
  html = html.replace(/\{\{\s*Name\s*\}\}/g, gear.name || '');
  html = html.replace(/\{\{\s*ShortId\s*\}\}/g, gear.shortId || '');
  html = html.replace(/\{\{\s*Category\s*\}\}/g, gear.category || '');
  html = html.replace(/\{\{\s*SerialNumber\s*\}\}/g, gear.serialNumber || '');
  html = html.replace(/\{\{\s*Description\s*\}\}/g, gear.description || '');
  html = html.replace(/\{\{\s*QRCode\s*\}\}/g, qrDataUrl);
  html = html.replace(/\{\{\s*Tags\s*\}\}/g, (gear.tags || []).join(', '));
  html = html.replace(/\{\{\s*DefaultLoanDays\s*\}\}/g, String(gear.defaultLoanDays ?? ''));
  return html;
}

// ── Component ────────────────────────────────────────────────────────

export default function TagTemplateEditor({ gearItems = [], onClose }) {
  const saved = loadSavedConfig();
  const [config, setConfig] = useState(saved || DEFAULT_CONFIG);
  const [renderedTags, setRenderedTags] = useState([]);
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const printRef = useRef(null);

  // Persist config on change
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  // Re-render tags whenever config template or gear items change
  useEffect(() => {
    let cancelled = false;
    async function render() {
      const results = await Promise.all(
        gearItems.map((g) => renderTemplate(config.template, g))
      );
      if (!cancelled) setRenderedTags(results);
    }
    render();
    return () => { cancelled = true; };
  }, [config.template, gearItems]);

  const page = PAGE_SIZES[config.pageSize] || PAGE_SIZES.A4;

  // Calculate tag cell dimensions (mm)
  const usableW = page.width - config.marginLeft - config.marginRight - (config.cols - 1) * config.paddingX;
  const usableH = page.height - config.marginTop - config.marginBottom - (config.rows - 1) * config.paddingY;
  const cellW = usableW / config.cols;
  const cellH = usableH / config.rows;

  const tagsPerPage = config.rows * config.cols;
  const totalPages = Math.ceil(gearItems.length / tagsPerPage) || 1;

  // Group tags into pages
  const pages = [];
  for (let p = 0; p < totalPages; p++) {
    pages.push(renderedTags.slice(p * tagsPerPage, (p + 1) * tagsPerPage));
  }

  function handlePrint() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print tags.');
      return;
    }

    const pagesHtml = pages.map((pageTags, pageIdx) => {
      const cells = pageTags.map((html, i) => `
        <div style="
          width: ${cellW}mm;
          height: ${cellH}mm;
          overflow: hidden;
          border: 1px dashed #ccc;
          box-sizing: border-box;
          container-type: size;
        ">${html}</div>
      `).join('');

      return `
        <div class="print-page" style="
          width: ${page.width}mm;
          height: ${page.height}mm;
          padding: ${config.marginTop}mm ${config.marginRight}mm ${config.marginBottom}mm ${config.marginLeft}mm;
          display: grid;
          grid-template-columns: repeat(${config.cols}, ${cellW}mm);
          grid-template-rows: repeat(${config.rows}, ${cellH}mm);
          gap: ${config.paddingY}mm ${config.paddingX}mm;
          box-sizing: border-box;
          page-break-after: always;
        ">${cells}</div>
      `;
    }).join('');

    printWindow.document.write(`
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
            .print-page div { border-color: transparent !important; }
          }
        </style>
      </head>
      <body>${pagesHtml}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }

  function handleReset() {
    setConfig(DEFAULT_CONFIG);
  }

  function set(key, value) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  // Preview scaling: fit page into a ~360px-wide container
  const previewScale = 360 / ((page.width / 25.4) * 96);

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
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Left sidebar: settings ────────────────────────────── */}
          <div className="w-80 border-r overflow-y-auto p-4 space-y-4 text-sm flex-shrink-0">
            {/* Page size */}
            <div>
              <label className="block font-medium mb-1">Page Size</label>
              <select
                value={config.pageSize}
                onChange={(e) => set('pageSize', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                {Object.entries(PAGE_SIZES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
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

            {/* Padding between tags */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Gap X (mm)</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={config.paddingX}
                  onChange={(e) => set('paddingX', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Gap Y (mm)</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={config.paddingY}
                  onChange={(e) => set('paddingY', Math.max(0, parseInt(e.target.value) || 0))}
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
                    onChange={(e) => set('marginBottom', Math.max(0, parseInt(e.target.value) || 0))}
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
              <p className="text-gray-600">{cellW.toFixed(1)} × {cellH.toFixed(1)} mm</p>
              <p className="text-gray-500 text-xs mt-1">
                {tagsPerPage} tags/page · {totalPages} page{totalPages !== 1 ? 's' : ''} · {gearItems.length} item{gearItems.length !== 1 ? 's' : ''}
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
          <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
            <div className="space-y-8">
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
                      ref={pageIdx === 0 ? printRef : undefined}
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
                      {pageTags.map((html, i) => (
                        <div
                          key={i}
                          style={{
                            width: `${cellW}mm`,
                            height: `${cellH}mm`,
                            overflow: 'hidden',
                            border: '1px dashed #d1d5db',
                            boxSizing: 'border-box',
                            containerType: 'size',
                          }}
                          dangerouslySetInnerHTML={{ __html: html }}
                        />
                      ))}
                      {/* Fill remaining cells with empty slots */}
                      {Array.from({ length: tagsPerPage - pageTags.length }).map((_, i) => (
                        <div
                          key={`empty-${i}`}
                          style={{
                            width: `${cellW}mm`,
                            height: `${cellH}mm`,
                            border: '1px dashed #e5e7eb',
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
                  <div style={{ height: `${page.height * previewScale * (25.4 / 25.4)}mm` }} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Right sidebar: template editor ────────────────────── */}
          <div className="w-96 border-l overflow-y-auto p-4 space-y-4 text-sm flex-shrink-0">
            <div className="flex items-center justify-between">
              <label className="font-medium">HTML Template</label>
              <button
                onClick={() => setShowPlaceholders(!showPlaceholders)}
                className="text-primary-600 hover:underline text-xs"
              >
                {showPlaceholders ? 'Hide' : 'Show'} placeholders
              </button>
            </div>

            {showPlaceholders && (
              <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                <p className="font-medium text-blue-800 text-xs mb-2">Available Placeholders</p>
                {PLACEHOLDERS.map((p) => (
                  <div key={p.token} className="flex justify-between text-xs">
                    <code className="text-blue-700 bg-blue-100 px-1 rounded">{p.token}</code>
                    <span className="text-blue-600">{p.description}</span>
                  </div>
                ))}
              </div>
            )}

            <textarea
              value={config.template}
              onChange={(e) => set('template', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 font-mono text-xs leading-relaxed"
              rows={20}
              spellCheck={false}
            />

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
              <strong>Tip:</strong> The template is rendered inside a cell of size{' '}
              <strong>{cellW.toFixed(1)} × {cellH.toFixed(1)} mm</strong>. Use inline styles for
              best results. The <code>{'{{ QRCode }}'}</code> placeholder inserts a data-URL you can
              use in an <code>&lt;img&gt;</code> tag.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_TEMPLATE, PLACEHOLDERS, PAGE_SIZES, renderTemplate };

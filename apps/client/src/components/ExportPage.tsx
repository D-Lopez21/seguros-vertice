/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { supabase } from '../lib/supabase';
import { DashboardLayout } from './common';

// ─── tipos ────────────────────────────────────────────────────────────────────
type DateField =
  | 'arrival_date'
  | 'severance_date'
  | 'audit_date'
  | 'programmed_date'
  | 'paid_date'
  | 'settlement_date';

interface DateOption {
  value: DateField;
  label: string;
}

// ─── constantes ───────────────────────────────────────────────────────────────
const DATE_OPTIONS: DateOption[] = [
  { value: 'arrival_date',    label: 'Fecha de Recepción'            },
  { value: 'severance_date',  label: 'Fecha de Liquidación'          },
  { value: 'audit_date',      label: 'Fecha de Auditoría'            },
  { value: 'programmed_date', label: 'Fecha de Programación de Pago' },
  { value: 'paid_date',       label: 'Fecha de Pago'                 },
  { value: 'settlement_date', label: 'Fecha de Finiquito'            },
];

// Orden y etiquetas en español de todas las columnas (sin IDs de Supabase)
// agrupadas por sección: recepcion → liquidacion → auditoria → programacion → pago → finiquito
const COLUMN_MAP: { key: string; label: string }[] = [
  // ── RECEPCIÓN ──
  { key: 'arrival_date',          label: 'Fecha de Recepción'            },
  { key: 'n_claim',               label: 'N° Siniestro'                  },
  { key: 'type',                  label: 'Tipo de Documento'             },
  { key: 'n_billing',             label: 'N° Factura'                    },
  { key: 'n_control',             label: 'N° Control'                    },
  { key: 'currency_type',         label: 'Tipo de Moneda'                },
  { key: 'total_billing',         label: 'Monto Total Factura'           },
  { key: 'proveedor_nombre',      label: 'Proveedor'                     },
  { key: 'proveedor_rif',         label: 'RIF Proveedor'                 },
  { key: 'receptor_nombre',       label: 'Analista Recepción'            },
  // ── LIQUIDACIÓN ──
  { key: 'severance_date',        label: 'Fecha de Liquidación'          },
  { key: 'claim_type',            label: 'Tipo de Siniestro'             },
  { key: 'monto_amp',             label: 'Monto AMP'                     },
  { key: 'gna',                   label: 'GNA'                           },
  { key: 'medical_honoraries',    label: 'Honorarios Médicos'            },
  { key: 'clinical_services',     label: 'Servicios Clínicos'            },
  { key: 'retention_rate',        label: 'Tasa de Retención'             },
  { key: 'indemnizable_rate',     label: 'Monto Indemnizable'            },
  { key: 'nomenclature_pile',     label: 'Lote / Nomenclatura'           },
  { key: 'liquidador_nombre',     label: 'Analista Liquidación'          },
  // ── AUDITORÍA ──
  { key: 'audit_date',            label: 'Fecha de Auditoría'            },
  { key: 'auditor_nombre',        label: 'Auditor'                       },
  // ── PROGRAMACIÓN ──
  { key: 'programmed_date',       label: 'Fecha de Programación de Pago' },
  { key: 'admin_decision',        label: 'Decisión Administrativa'       },
  { key: 'programador_nombre',    label: 'Analista Programación'         },
  // ── PAGO ──
  { key: 'paid_date',             label: 'Fecha de Pago'                 },
  { key: 'bs_amount',             label: 'Monto en Bs'                   },
  { key: 'tcr_amount',            label: 'TCR'                           },
  { key: 'dollar_amount',         label: 'Referencia en Dólares'         },
  { key: 'transfer_ref',          label: 'Referencia Bancaria'           },
  { key: 'vertice_difference',    label: 'Diferencia Vértice'            },
  { key: 'provider_difference',   label: 'Diferencia Proveedor'          },
  { key: 'pagador_nombre',        label: 'Analista Pago'                 },
  // ── FINIQUITO ──
  { key: 'settlement_date',       label: 'Fecha de Finiquito'            },
  { key: 'finiquito_nombre',      label: 'Analista Finiquito'            },
  // ── ESTADO ──
  { key: 'state',                 label: 'Estado'                        },
  { key: 'state_sequence',        label: 'Etapa Actual'                  },
  { key: 'active',                label: 'Activa'                        },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
function formatDate(value: string | null): string {
  if (!value) return '';
  return value.split('T')[0];
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Convierte array de objetos a CSV y dispara descarga
function downloadCSV(rows: Record<string, any>[], filename: string) {
  const headers = COLUMN_MAP.map(c => c.label);
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      COLUMN_MAP.map(c => escapeCSV(row[c.key])).join(',')
    ),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── generador XLSX nativo (sin SheetJS) usando JSZip ────────────────────────
// JSZip es segura, sin vulnerabilidades conocidas, y soporta browser nativo.

async function loadJSZip(): Promise<any> {
  if ((window as any).JSZip) return (window as any).JSZip;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar JSZip'));
    document.head.appendChild(script);
  });
  return (window as any).JSZip;
}

function xmlEsc(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Construye el XML de la hoja de cálculo (xl/worksheets/sheet1.xml)
function buildSheetXml(headers: string[], dataRows: any[][]): string {

  // Convierte índice numérico de columna (0-based) a letra Excel (A, B, ... Z, AA, ...)
  const colLetter = (n: number): string => {
    let s = '';
    n += 1;
    while (n > 0) {
      const r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };

  const cellRef = (col: number, row: number) => `${colLetter(col)}${row}`;

  // Calcula anchos de columna (en caracteres)
  const colWidths = headers.map((h, i) => {
    const maxData = dataRows.reduce((max, row) => {
      const len = String(row[i] ?? '').length;
      return len > max ? len : max;
    }, 0);
    return Math.min(Math.max(h.length, maxData) + 2, 45);
  });

  const colsXml = colWidths
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join('');

  // Fila de cabecera (styleId=1 → negrita + fondo azul)
  const headerCells = headers
    .map((h, ci) => `<c r="${cellRef(ci, 1)}" t="inlineStr" s="1"><is><t>${xmlEsc(h)}</t></is></c>`)
    .join('');
  const headerRow = `<row r="1">${headerCells}</row>`;

  // Filas de datos
  const dataRowsXml = dataRows.map((row, ri) => {
    const cells = row.map((val, ci) => {
      const ref = cellRef(ci, ri + 2);
      if (typeof val === 'number') {
        return `<c r="${ref}"><v>${val}</v></c>`;
      }
      return `<c r="${ref}" t="inlineStr"><is><t>${xmlEsc(val)}</t></is></c>`;
    }).join('');
    return `<row r="${ri + 2}">${cells}</row>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>${colsXml}</cols>
  <sheetData>${headerRow}${dataRowsXml}</sheetData>
</worksheet>`;
}

// Construye styles.xml con un estilo de cabecera (negrita, fondo azul #1a56ff, texto blanco)
function buildStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts>
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills>
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1a56ff"/></patternFill></fill>
  </fills>
  <borders><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
  </cellXfs>
</styleSheet>`;
}

async function downloadXLSX(rows: Record<string, any>[], filename: string) {
  const JSZip = await loadJSZip();

  const headers = COLUMN_MAP.map(c => c.label);
  const dataRows = rows.map(row =>
    COLUMN_MAP.map(({ key }) => {
      const val = row[key];
      if (val === null || val === undefined) return '';
      if (typeof val === 'boolean') return val ? 'Sí' : 'No';
      return val;
    })
  );

  const zip = new JSZip();

  // Estructura mínima de un .xlsx (OOXML)
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);

  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Facturas" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`);

  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  zip.file('xl/worksheets/sheet1.xml', buildSheetXml(headers, dataRows));
  zip.file('xl/styles.xml', buildStylesXml());

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── icono SVG inline ─────────────────────────────────────────────────────────
function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function FileSpreadsheetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
      <line x1="8" y1="9" x2="10" y2="9" />
    </svg>
  );
}


// ─── componente principal ─────────────────────────────────────────────────────

type FilterMode = 'fecha' | 'estado';

const STATE_OPTIONS = [
  { value: 'recepcion',    label: 'Recepción'    },
  { value: 'liquidacion',  label: 'Liquidación'  },
  { value: 'auditoria',    label: 'Auditoría'    },
  { value: 'programacion', label: 'Programación' },
  { value: 'pagos',        label: 'Pagos'        },
  { value: 'finiquito',    label: 'Finiquito'    },
  { value: 'devuelto',     label: 'Devuelto'     },
];

export default function ExportPage() {
  const [filterMode, setFilterMode]     = React.useState<FilterMode>('fecha');
  const [dateField, setDateField]       = React.useState<DateField>('arrival_date');
  const [dateFrom, setDateFrom]         = React.useState('');
  const [dateTo, setDateTo]             = React.useState('');
  const [stateFilter, setStateFilter]   = React.useState('');
  const [format, setFormat]             = React.useState<'xlsx' | 'csv'>('xlsx');
  const [loading, setLoading]           = React.useState(false);
  const [error, setError]               = React.useState<string | null>(null);
  const [preview, setPreview]           = React.useState<number | null>(null);

  const canExport = !loading && (
    filterMode === 'fecha' ? (!!dateFrom && !!dateTo) : !!stateFilter
  );

  // ── enriquece bills con perfiles ──────────────────────────────────────────
  const enrichBills = async (bills: any[]) => {
    const profileIds = new Set<string>();
    for (const b of bills) {
      [b.suppliers_id, b.analyst_receptor_id, b.analyst_severance,
       b.auditor, b.analyst_schedule, b.analyst_paid, b.analyst_settlement]
        .forEach((id: string | null) => { if (id) profileIds.add(id); });
    }
    const profileMap: Record<string, { name: string; rif?: string }> = {};
    if (profileIds.size > 0) {
      const { data: profiles, error: profErr } = await supabase
        .from('profile').select('id, name, rif').in('id', [...profileIds]);
      if (profErr) throw profErr;
      for (const p of profiles ?? []) profileMap[p.id] = { name: p.name, rif: p.rif };
    }
    const getName = (id?: string | null) => id && profileMap[id] ? profileMap[id].name : '';
    const getRIF  = (id?: string | null) => id && profileMap[id] ? (profileMap[id].rif ?? '') : '';

    return bills.map(b => ({
      arrival_date:       formatDate(b.arrival_date),
      n_claim:            b.n_claim            ?? '',
      type:               b.type               ?? '',
      n_billing:          b.n_billing          ?? '',
      n_control:          b.n_control          ?? '',
      currency_type:      b.currency_type      ?? '',
      total_billing:      b.total_billing      ?? '',
      proveedor_nombre:   getName(b.suppliers_id),
      proveedor_rif:      getRIF(b.suppliers_id),
      receptor_nombre:    getName(b.analyst_receptor_id),
      severance_date:     formatDate(b.severance_date),
      claim_type:         b.claim_type         ?? '',
      monto_amp:          b.monto_amp          ?? '',
      gna:                b.gna                ?? '',
      medical_honoraries: b.medical_honoraries ?? '',
      clinical_services:  b.clinical_services  ?? '',
      retention_rate:     b.retention_rate     ?? '',
      indemnizable_rate:  b.indemnizable_rate  ?? '',
      nomenclature_pile:  b.nomenclature_pile  ?? '',
      liquidador_nombre:  getName(b.analyst_severance),
      audit_date:         formatDate(b.audit_date),
      auditor_nombre:     getName(b.auditor),
      programmed_date:    formatDate(b.programmed_date),
      admin_decision:     b.admin_decision      ?? '',
      programador_nombre: getName(b.analyst_schedule),
      paid_date:          formatDate(b.paid_date),
      bs_amount:          b.bs_amount           ?? '',
      tcr_amount:         b.tcr_amount          ?? '',
      dollar_amount:      b.dollar_amount        ?? '',
      transfer_ref:       b.transfer_ref         ?? '',
      vertice_difference: b.vertice_difference   ?? '',
      provider_difference:b.provider_difference  ?? '',
      pagador_nombre:     getName(b.analyst_paid),
      settlement_date:    formatDate(b.settlement_date),
      finiquito_nombre:   getName(b.analyst_settlement),
      state:              b.state               ?? '',
      state_sequence:     b.state_sequence      ?? '',
      active:             b.active,
    }));
  };

  // ── consulta principal ─────────────────────────────────────────────────────
  const fetchData = async (): Promise<Record<string, any>[]> => {
    let query = supabase.from('bills').select('*');

    if (filterMode === 'fecha') {
      if (!dateFrom || !dateTo) throw new Error('Debes seleccionar un rango de fechas.');
      const from = `${dateFrom}T00:00:00`;
      const toDate = new Date(dateTo);
      toDate.setDate(toDate.getDate() + 1);
      const to = toDate.toISOString().split('T')[0] + 'T00:00:00';
      query = query.gte(dateField, from).lt(dateField, to).order(dateField, { ascending: true });
    } else {
      if (!stateFilter) throw new Error('Debes seleccionar un estado.');
      query = query.eq('state_sequence', stateFilter).order('arrival_date', { ascending: true });
    }

    const { data: bills, error: billsErr } = await query;
    if (billsErr) throw billsErr;
    if (!bills || bills.length === 0) return [];
    return enrichBills(bills);
  };

  // ── previsualizar cantidad ─────────────────────────────────────────────────
  const handlePreview = async () => {
    setError(null);
    try {
      let query = supabase.from('bills').select('id', { count: 'exact', head: true });
      if (filterMode === 'fecha') {
        if (!dateFrom || !dateTo) return;
        const from = `${dateFrom}T00:00:00`;
        const toDate = new Date(dateTo);
        toDate.setDate(toDate.getDate() + 1);
        const to = toDate.toISOString().split('T')[0] + 'T00:00:00';
        query = query.gte(dateField, from).lt(dateField, to);
      } else {
        if (!stateFilter) return;
        query = query.eq('state_sequence', stateFilter);
      }
      const { count, error: e } = await query;
      if (e) throw e;
      setPreview(count ?? 0);
    } catch (err: any) {
      setError(err.message);
    }
  };

  React.useEffect(() => {
    setPreview(null);
    const ready = filterMode === 'fecha' ? (!!dateFrom && !!dateTo) : !!stateFilter;
    if (ready) handlePreview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode, dateField, dateFrom, dateTo, stateFilter]);

  // ── exportar ───────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!canExport) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchData();
      if (rows.length === 0) {
        setError('No se encontraron facturas con ese filtro.');
        return;
      }
      let filename = '';
      if (filterMode === 'fecha') {
        const dateLabel = DATE_OPTIONS.find(o => o.value === dateField)?.label ?? dateField;
        filename = `facturas_${dateLabel.replace(/\s+/g, '_')}_${dateFrom}_${dateTo}.${format}`;
      } else {
        const stateLabel = STATE_OPTIONS.find(o => o.value === stateFilter)?.label ?? stateFilter;
        filename = `facturas_estado_${stateLabel.replace(/\s+/g, '_')}.${format}`;
      }
      if (format === 'csv') downloadCSV(rows, filename);
      else await downloadXLSX(rows, filename);
    } catch (err: any) {
      setError('Error al exportar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── UI ───────────────────────────────────────────────────────────────────
  const selectedDateLabel  = DATE_OPTIONS.find(o => o.value === dateField)?.label ?? '';
  const selectedStateLabel = STATE_OPTIONS.find(o => o.value === stateFilter)?.label ?? '—';

  return (
    <DashboardLayout title="Exportar Facturas" returnTo="/bills">
      <div className="space-y-6">

        {/* ── Formulario ── */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="bg-[#1a56ff] px-6 py-5 flex items-center gap-3">
            <FileSpreadsheetIcon className="size-6 text-white/80 shrink-0" />
            <div>
              <h2 className="text-white font-semibold text-base leading-tight">Exportación de Datos</h2>
              <p className="text-white/70 text-xs mt-0.5">
                Filtra facturas por rango de fecha o por estado y descarga el reporte
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5">

            {/* Toggle modo */}
            <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg w-fit">
              {([
                { value: 'fecha',  label: '📅 Por fecha'  },
                { value: 'estado', label: '🏷️ Por estado' },
              ] as { value: FilterMode; label: string }[]).map(m => (
                <button
                  key={m.value}
                  onClick={() => { setFilterMode(m.value); setPreview(null); setError(null); }}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    filterMode === m.value
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Campos según modo */}
            {filterMode === 'fecha' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide">Tipo de fecha</label>
                  <select value={dateField} onChange={e => setDateField(e.target.value as DateField)}
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#1a56ff]/40 focus:border-[#1a56ff] transition">
                    {DATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide">Desde</label>
                  <input type="date" value={dateFrom} max={dateTo || undefined}
                    onChange={e => setDateFrom(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#1a56ff]/40 focus:border-[#1a56ff] transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide">Hasta</label>
                  <input type="date" value={dateTo} min={dateFrom || undefined}
                    onChange={e => setDateTo(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#1a56ff]/40 focus:border-[#1a56ff] transition" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide">Estado de la factura</label>
                  <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#1a56ff]/40 focus:border-[#1a56ff] transition">
                    <option value="">Seleccionar estado...</option>
                    {STATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Formato + botón */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
              <div className="space-y-1.5 flex-1">
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide">Formato de descarga</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['xlsx', 'csv'] as const).map(f => (
                    <button key={f} onClick={() => setFormat(f)}
                      className={`py-2.5 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        format === f
                          ? 'bg-[#1a56ff] border-[#1a56ff] text-white shadow-sm'
                          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}>
                      <span className="text-base">{f === 'xlsx' ? '📊' : '📄'}</span>
                      <span>{f === 'xlsx' ? 'Excel (.xlsx)' : 'CSV (.csv)'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:w-56">
                {preview !== null && (
                  <p className={`text-xs text-center font-medium ${preview === 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {preview === 0
                      ? '⚠️ Sin resultados'
                      : `✅ ${preview.toLocaleString()} factura${preview !== 1 ? 's' : ''} encontrada${preview !== 1 ? 's' : ''}`}
                  </p>
                )}
                {error && <p className="text-xs text-center text-red-500">❌ {error}</p>}
                <button
                  onClick={handleExport}
                  disabled={!canExport || preview === 0}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    canExport && preview !== 0
                      ? 'bg-[#1a56ff] text-white hover:bg-[#1446e0] shadow-md hover:shadow-lg active:scale-[0.98]'
                      : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  }`}>
                  {loading ? (
                    <>
                      <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Generando reporte...
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="size-4" />
                      Exportar datos
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Cards informativas ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Resumen */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Resumen de exportación</h3>
            <div className="space-y-0">
              {(filterMode === 'fecha' ? [
                { label: 'Modo',          value: 'Por fecha'          },
                { label: 'Tipo de fecha', value: selectedDateLabel    },
                { label: 'Desde',         value: dateFrom   || '—'   },
                { label: 'Hasta',         value: dateTo     || '—'   },
                { label: 'Formato',       value: format.toUpperCase() },
              ] : [
                { label: 'Modo',    value: 'Por estado'          },
                { label: 'Estado',  value: selectedStateLabel    },
                { label: 'Formato', value: format.toUpperCase()  },
              ]).map(row => (
                <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-neutral-100 last:border-0">
                  <span className="text-sm text-neutral-500">{row.label}</span>
                  <span className="text-sm font-semibold text-neutral-800 text-right max-w-[55%]">{row.value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2.5">
                <span className="text-sm text-neutral-500">Registros</span>
                <span className={`text-sm font-bold ${
                  preview === null ? 'text-neutral-400' :
                  preview === 0    ? 'text-amber-600'   : 'text-emerald-600'
                }`}>
                  {preview === null ? '—' : preview.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Columnas incluidas */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 space-y-3">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Columnas incluidas</h3>
            <div className="space-y-0">
              {[
                { label: 'Recepción',    count: 10, color: 'bg-blue-500'    },
                { label: 'Liquidación',  count: 10, color: 'bg-purple-500'  },
                { label: 'Auditoría',    count: 2,  color: 'bg-indigo-500'  },
                { label: 'Programación', count: 3,  color: 'bg-orange-500'  },
                { label: 'Pago',         count: 8,  color: 'bg-cyan-500'    },
                { label: 'Finiquito',    count: 2,  color: 'bg-emerald-500' },
                { label: 'Estado',       count: 3,  color: 'bg-neutral-400' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 py-2 border-b border-neutral-100 last:border-0">
                  <span className={`size-2 rounded-full shrink-0 ${s.color}`} />
                  <span className="text-sm text-neutral-700 flex-1">{s.label}</span>
                  <span className="text-xs text-neutral-400">{s.count} col.</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-400 pt-1 border-t border-neutral-100">
              Total: {COLUMN_MAP.length} columnas
            </p>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
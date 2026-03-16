import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error(
    '❌ Faltan variables de entorno. Revisa tu .env:\n  VITE_SUPABASE_URL\n  SUPABASE_SERVICE_KEY'
  );
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Constantes ──────────────────────────────────────────────────────────────

const NUMERIC_FIELDS = [
  'total_billing', 'medical_honoraries', 'clinical_services',
  'retention_rate', 'indemnizable_rate', 'monto_amp', 'gna',
  'bs_amount', 'tcr_amount', 'dollar_amount',
  'vertice_difference', 'provider_difference',
];

const DATE_FIELDS = [
  'arrival_date', 'severance_date', 'audit_date',
  'programmed_date', 'paid_date', 'settlement_date', 'updated_at',
];

const VALID_STATES = new Set([
  'recibida', 'pendiente', 'programado', 'pagado', 'devuelto',
]);

// Typos conocidos en el CSV → valor correcto
const STATE_TYPO_MAP = {
  'penidente': 'pendiente',
  'pend':      'pendiente',
  '#n/a':      'recibida',
  'liquidado': 'pendiente',
};

const VALID_CLAIM_TYPES = new Set([
  'AMBULATORIO', 'APS', 'CARTA AVAL', 'FARMACIA', 'HOSPITALIZACION',
  'JORNADA', 'LABORATORIO', 'ONCOLOGICO', 'TRASLADO EN AMBULANCIA',
  'HOME CARE', 'PREGRADO', 'JUNTA MEDICA', 'PREPAGO', 'DEVUELTA',
]);

const STATE_SEQ_MAP = { liquidado: 'liquidacion' };

// ─── Utilidades ──────────────────────────────────────────────────────────────

function readCSV(filename) {
  const filePath = path.resolve(__dirname, 'data', filename);
  if (!fs.existsSync(filePath)) throw new Error(`No se encontró el archivo: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

function clean(row) {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k,
      typeof v === 'string' && v.trim() === '' ? null : v?.trim(),
    ])
  );
}

function toFloat(val) {
  if (val === null || val === undefined || val === '') return null;
  return parseFloat(String(val).replace(',', '.'));
}

function fixDateYear(val) {
  if (!val) return null;
  let s = String(val).trim();
  if (/^\d+\/\d+/.test(s)) return null;
  s = s
    .replace(/^20206-/, '2026-')
    .replace(/^20026-/, '2026-')
    .replace(/^0206-/,  '2026-')
    .replace(/^0202-/,  '2026-');
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeClaimType(val) {
  if (!val) return null;
  const normalized = val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  return VALID_CLAIM_TYPES.has(normalized) ? normalized : null;
}

// Normaliza el state: corrige typos y hace fallback a 'recibida'
function normalizeState(val) {
  if (!val) return 'recibida';
  const lower = val.trim().toLowerCase();
  if (STATE_TYPO_MAP[lower]) return STATE_TYPO_MAP[lower];
  if (VALID_STATES.has(lower)) return lower;
  return 'recibida';
}

// ─── Clave de deduplicación ──────────────────────────────────────────────────
//
// Usamos n_billing + n_claim + suppliers_id como clave triple.
//
// Por qué no solo n_billing + suppliers_id:
//   Hay grupos de facturas que comparten el mismo n_billing dentro del mismo
//   proveedor (ej: 21 filas con n_billing="20261003157"). En esos casos,
//   n_claim (número de siniestro) es lo que las distingue individualmente.
//
function buildKey(row) {
  const billing  = row.n_billing    ?? 'null';
  const claim    = row.n_claim      ?? 'null';
  const supplier = row.suppliers_id ?? 'null';
  return `bill__${billing}__claim__${claim}__sup__${supplier}`;
}

// ─── Diagnóstico ─────────────────────────────────────────────────────────────

function diagnoseRow(rawRow) {
  const issues = [];

  for (const field of DATE_FIELDS) {
    const val = rawRow[field];
    if (val && val.trim() !== '') {
      if (!fixDateYear(val)) {
        issues.push(`fecha inválida en "${field}": "${val}"`);
      }
    }
  }

  if (rawRow.state) {
    const lower = rawRow.state.trim().toLowerCase();
    if (!VALID_STATES.has(lower)) {
      const fixed = STATE_TYPO_MAP[lower] ?? 'recibida';
      issues.push(`state inválido: "${rawRow.state}" → se corregirá a "${fixed}"`);
    }
  }

  if (rawRow.claim_type) {
    const norm = rawRow.claim_type
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
    if (!VALID_CLAIM_TYPES.has(norm)) {
      issues.push(`claim_type desconocido: "${rawRow.claim_type}" → null`);
    }
  }

  if (!rawRow.n_billing && !rawRow.n_claim) {
    issues.push(`n_billing y n_claim ambos vacíos`);
  }

  return issues;
}

async function runDiagnosis(bills) {
  console.log('\n🔍 DIAGNÓSTICO DEL CSV');
  console.log('─'.repeat(60));

  let totalIssues = 0;
  const problemRows = [];

  bills.forEach((rawRow, i) => {
    const issues = diagnoseRow(rawRow);
    if (issues.length > 0) {
      totalIssues += issues.length;
      problemRows.push({ index: i + 1, n_billing: rawRow.n_billing, n_claim: rawRow.n_claim, issues });
      console.log(`\n  Fila ${i + 1} | n_billing="${rawRow.n_billing}" | n_claim="${rawRow.n_claim}"`);
      issues.forEach(issue => console.log(`    ⚠️  ${issue}`));
    }
  });

  if (totalIssues === 0) {
    console.log('  ✅ No se encontraron problemas en el CSV');
  } else {
    console.log(`\n  📊 Total: ${problemRows.length} filas con problemas, ${totalIssues} issues`);
  }

  const reportPath = path.resolve(__dirname, 'data', 'diagnosis_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(problemRows, null, 2), 'utf8');
  console.log(`\n  💾 Reporte guardado en: ${reportPath}`);
}

// ─── Transformar fila ────────────────────────────────────────────────────────

function transformRow(b) {
  const { rif_proveedor, notas, id, updated_at, ...rest } = b;
  const row = { ...rest, active: rest.active?.toUpperCase() !== 'FALSE' };

  for (const field of DATE_FIELDS) {
    if (row[field]) row[field] = fixDateYear(row[field]);
  }

  for (const field of NUMERIC_FIELDS) {
    if (field in row) row[field] = toFloat(row[field]);
  }

  // Usa normalizeState en lugar de la comparación directa — corrige typos
  row.state      = normalizeState(row.state);
  row.claim_type = normalizeClaimType(row.claim_type);

  if (row.state_sequence && STATE_SEQ_MAP[row.state_sequence]) {
    row.state_sequence = STATE_SEQ_MAP[row.state_sequence];
  }

  return row;
}

// ─── Cargar bills ────────────────────────────────────────────────────────────

async function loadBills() {
  console.log('\n🧾 CARGANDO FACTURAS');
  console.log('─'.repeat(60));

  const rawBills   = readCSV('bills.csv').map(clean);
  const validBills = rawBills.filter(b => b.n_claim || b.n_billing);

  console.log(`  📂 Total en CSV            : ${rawBills.length}`);
  console.log(`  ✅ Con n_claim o n_billing  : ${validBills.length}`);
  console.log(`  ⛔ Sin ambos campos         : ${rawBills.length - validBills.length}`);

  await runDiagnosis(validBills);

  // Paginar para traer TODAS las existentes en BD
  console.log('\n  🔗 Consultando facturas existentes en Supabase...');
  let existing = [];
  let from = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('bills')
      .select('n_billing, n_claim, suppliers_id')
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error('Error consultando BD: ' + error.message);
    if (!data || data.length === 0) break;

    existing = existing.concat(data);
    console.log(`  ...cargadas ${existing.length} facturas de BD`);

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // Misma clave triple que buildKey
  const seen = new Set(
    existing.map(r => {
      const billing  = r.n_billing    ?? 'null';
      const claim    = r.n_claim      ?? 'null';
      const supplier = r.suppliers_id ?? 'null';
      return `bill__${billing}__claim__${claim}__sup__${supplier}`;
    })
  );

  console.log(`\n  📦 Facturas ya en BD       : ${seen.size}`);

  const toInsert        = [];
  const skippedExisting = [];

  for (const b of validBills) {
    const key = buildKey(b);
    if (seen.has(key)) {
      skippedExisting.push(b.n_billing);
    } else {
      toInsert.push(transformRow(b));
    }
  }

  console.log(`  📋 Facturas a insertar     : ${toInsert.length}`);
  console.log(`  ♻️  Ya existían en BD       : ${skippedExisting.length}`);

  if (toInsert.length === 0) {
    console.log('\n  ✅ No hay facturas nuevas que insertar.');
    return;
  }

  console.log('\n  🚀 Insertando...\n');

  let inserted     = 0;
  let failed       = 0;
  const failedRows = [];

  for (let i = 0; i < toInsert.length; i += 50) {
    const batch = toInsert.slice(i, i + 50);
    const { error } = await supabase.from('bills').insert(batch);

    if (error) {
      console.error(`  ❌ Error batch ${i + 1}-${i + batch.length}: ${error.message}`);
      console.log(`     🔄 Reintentando fila por fila...`);

      for (const row of batch) {
        const { error: rowError } = await supabase.from('bills').insert([row]);
        if (rowError) {
          failed++;
          failedRows.push({
            n_billing : row.n_billing,
            n_claim   : row.n_claim,
            n_control : row.n_control,
            error     : rowError.message,
          });
          console.error(`     ❌ n_billing="${row.n_billing}" n_claim="${row.n_claim}" → ${rowError.message}`);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
      console.log(`  ✅ Batch ${i + 1}–${i + batch.length} (${batch.length} filas)`);
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log('📊 RESUMEN FINAL');
  console.log('─'.repeat(60));
  console.log(`  ✅ Insertadas exitosamente : ${inserted}`);
  console.log(`  ❌ Fallidas                : ${failed}`);
  console.log(`  ♻️  Ya existían en BD       : ${skippedExisting.length}`);
  console.log(`  📂 Total CSV válidas       : ${validBills.length}`);
  console.log(`  🎯 Esperado en BD al final : ${seen.size + inserted}`);

  if (failedRows.length > 0) {
    const failPath = path.resolve(__dirname, 'data', 'failed_rows.json');
    fs.writeFileSync(failPath, JSON.stringify(failedRows, null, 2), 'utf8');
    console.log(`\n  💾 Filas fallidas guardadas en: ${failPath}`);
    failedRows.forEach(r => {
      console.log(`    • n_billing="${r.n_billing}" n_claim="${r.n_claim}" → ${r.error}`);
    });
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Iniciando carga de facturas...');
  console.log(`   URL: ${supabaseUrl}\n`);
  await loadBills();
  console.log('\n🎉 Proceso completado');
}

main().catch(err => {
  console.error('\n💥 Error fatal:', err.message);
  process.exit(1);
});
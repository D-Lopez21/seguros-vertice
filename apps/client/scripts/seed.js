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
  throw new Error('❌ Faltan variables de entorno. Revisa tu .env:\n  VITE_SUPABASE_URL\n  SUPABASE_SERVICE_KEY');
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ─── Utilidades ───────────────────────────────────────────────────────────────

function readCSV(filename) {
  const filePath = path.resolve(__dirname, 'data', filename);
  if (!fs.existsSync(filePath)) throw new Error(`No se encontró el archivo: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

function clean(row) {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? null : v?.trim()])
  );
}

// ─── Cargar bills ─────────────────────────────────────────────────────────────

async function loadBills() {
  console.log('\n🧾 Cargando facturas...');
  const bills = readCSV('bills.csv').map(clean);

  const validBills = bills.filter(b => b.n_claim || b.n_billing);

  // Convierte string con coma decimal a float (ej: "44,1" → 44.1)
  const toFloat = (val) => {
    if (val === null || val === undefined || val === '') return null;
    return parseFloat(String(val).replace(',', '.'));
  };

  const NUMERIC_FIELDS = [
    'total_billing', 'medical_honoraries', 'clinical_services',
    'retention_rate', 'indemnizable_rate', 'monto_amp', 'gna',
    'bs_amount', 'tcr_amount', 'dollar_amount',
    'vertice_difference', 'provider_difference',
  ];

  // Valores válidos según los enums de Supabase
  const VALID_STATES = new Set(['recibida', 'pendiente', 'programado', 'pagado', 'devuelto']);
  const VALID_CLAIM_TYPES = new Set([
    'AMBULATORIO', 'APS', 'CARTA AVAL', 'FARMACIA', 'HOSPITALIZACION',
    'JORNADA', 'LABORATORIO', 'ONCOLOGICO', 'TRASLADO EN AMBULANCIA',
    'HOME CARE', 'PREGRADO', 'JUNTA MEDICA', 'PREPAGO', 'DEVUELTA',
  ]);

  // Normaliza tildes (ej: "ONCOLÓGICO" → "ONCOLOGICO")
  const normalizeClaimType = (val) => {
    if (!val) return null;
    const normalized = val.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (VALID_CLAIM_TYPES.has(normalized)) return normalized;
    console.warn(`  ⚠️  claim_type desconocido omitido: "${val}"`);
    return null;
  };

  // Trae los n_control que ya existen en la BD
  const { data: existing, error: existingError } = await supabase
    .from('bills')
    .select('n_control, suppliers_id');

  if (existingError) throw new Error('Error consultando facturas existentes: ' + existingError.message);

  const seen = new Set(
    (existing ?? []).map(r => `ctrl__${r.n_control}__${r.suppliers_id ?? 'null'}`)
  ); // pre-cargado con los ya existentes en BD

  const rows = validBills.reduce((acc, b) => {
    const { rif_proveedor, notas, id, updated_at, ...rest } = b;
    const row = { ...rest, active: rest.active?.toUpperCase() !== 'FALSE' };

    // Limpia y corrige fechas con años mal escritos (20206, 0206, 20026, 0202, etc.)
    const DATE_FIELDS = ["arrival_date","severance_date","audit_date","programmed_date","paid_date","settlement_date","updated_at"];
    const fixDateYear = (val) => {
      if (!val) return null;
      let s = String(val).trim();
      // Caso especial "4/32026"
      if (/^\d+\/\d+/.test(s)) return null;
      // Extrae el año (primeros dígitos antes del primer -)
      s = s
        .replace(/^20206-/, '2026-')
        .replace(/^20026-/, '2026-')
        .replace(/^0206-/,  '2026-')
        .replace(/^0202-/,  '2026-');
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d.toISOString();
    };
    for (const field of DATE_FIELDS) {
      if (row[field]) row[field] = fixDateYear(row[field]);
    }

    // Convierte campos numéricos
    for (const field of NUMERIC_FIELDS) {
      if (field in row) row[field] = toFloat(row[field]);
    }

    // Limpia enums
    row.state      = VALID_STATES.has(row.state) ? row.state : 'recibida'; // fallback para valores inválidos como #N/A
    row.claim_type = normalizeClaimType(row.claim_type);

    // Mapea variantes de state_sequence al valor correcto del enum
    const STATE_SEQ_MAP = { liquidado: "liquidacion" };
    if (row.state_sequence && STATE_SEQ_MAP[row.state_sequence]) {
      row.state_sequence = STATE_SEQ_MAP[row.state_sequence];
    }

    // Omite duplicados — clave: n_control + suppliers_id (con fallback a n_billing)
    const key = row.n_control
      ? `ctrl__${row.n_control}__${row.suppliers_id ?? 'null'}`
      : row.n_billing ? `bill__${row.n_billing}__${row.suppliers_id ?? 'null'}` : null;
    if (key && seen.has(key)) {
      console.warn(`  ⚠️  Duplicado omitido: n_control="${row.n_control}"`);
      return acc;
    }
    if (key) seen.add(key);

    acc.push(row);
    return acc;
  }, []);

  console.log(`  📋 ${rows.length} facturas a insertar (de ${validBills.length} en el CSV)\n`);

  let ok = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase.from('bills').insert(batch);
    if (error) {
      console.error(`  ❌ Error batch ${i + 1}-${i + batch.length}:`, error.message);
    } else {
      ok += batch.length;
      console.log(`  ✅ Facturas ${i + 1}–${i + batch.length}`);
    }
  }
  console.log(`\n  📊 Resultado: ${ok} insertadas de ${rows.length}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Iniciando carga de facturas...');
  console.log(`   URL: ${supabaseUrl}\n`);

  await loadBills();

  console.log('\n🎉 Carga completada');
}

main().catch(err => {
  console.error('\n💥 Error fatal:', err.message);
  process.exit(1);
});
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

// ─── 1. Cargar roles ──────────────────────────────────────────────────────────

async function loadRoles() {
  console.log('\n🔑 Cargando roles...');
  const roles = readCSV('roles.csv').map(clean);

//   const { error } = await supabase.from('roles').upsert(roles, { onConflict: 'name' });
//   if (error) {
//     console.error('  ❌ Error roles:', error.message);
//     return [];
//   }

//   // Retorna mapa nombre → id actualizado desde la BD
  const { data } = await supabase.from('roles').select('id, name');
  console.log(`  ✅ ${data.length} roles listos`);
  return Object.fromEntries(data.map(r => [r.name, r.id]));
}

// ─── 2. Cargar usuarios (auth + profile + user_roles automático) ──────────────

async function loadUsers(roleMap) {
  console.log('\n👤 Cargando usuarios...');
  const users = readCSV('profile.csv').map(clean);
  console.log('users', users)

  // Filtra filas vacías o de notas (sin email)
  const validUsers = users.filter(u => u.email && u.email.includes('@'));

  console.log(validUsers.length, 'Usuarios validos')
  let ok = 0, fail = 0;

  for (const user of validUsers) {
    // 1. Crea en auth.users
    const { data, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password_temporal ?? 'Cambiar123!',
      email_confirm: true,
      user_metadata: { name: user.name, role: user.role }
    });

    if (authError) {
  // Si ya existe en auth, búscalo en vez de fallar
  if (authError.message.includes('already been registered')) {
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list.users.find(u => u.email === user.email);
    if (existing) {
      userId = existing.id; // reutiliza el id existente
    }
  } else {
    console.error(`  ❌ Auth (${user.email}): ${authError.message}`);
    fail++;
    continue;
  }
}

    const userId = data.user.id;

    // 2. Inserta en public.profile con el mismo id
    const { error: profileError } = await supabase.from('profile').upsert({
      id:                       userId,
      email:                    user.email,
      name:                     user.name,
      role:                     null, // el rol se asigna en user_roles, no aquí
      rif:                      user.rif ?? null,
      active:                   user.active?.toUpperCase() !== 'FALSE',
      password_change_required: true
    });

    if (profileError) {
      console.error(`  ❌ Profile (${user.email}): ${profileError.message}`);
      fail++;
      continue;
    }

    // 3. Asigna user_roles automáticamente desde la columna "role" del CSV
    //    Un usuario puede tener varios roles separados por | (ej: "admin|pagos")
    const roleNames = (user.role ?? '').split(/[|,]/).map(r => r.trim()).filter(Boolean);
    const userRoleRows = roleNames
      .map(name => ({ user_id: userId, role_id: roleMap[name] }))
      .filter(r => {
        if (!r.role_id) console.warn(`  ⚠️  Rol no encontrado en BD: "${roleNames}" para ${user.email}`);
        return r.role_id;
      });

    if (userRoleRows.length > 0) {
      const { error: roleError } = await supabase.from('user_roles').insert(userRoleRows);
      if (roleError) {
        console.error(`  ❌ user_roles (${user.email}): ${roleError.message}`);
      }
    }

    console.log(`  ✅ ${user.email} → rol: ${user.role}`);
    ok++;
  }

  console.log(`\n  📊 Usuarios: ${ok} exitosos, ${fail} fallidos`);
}

// ─── 3. Cargar bills ──────────────────────────────────────────────────────────

async function loadBills() {
  console.log('\n🧾 Cargando facturas...');
  const bills = readCSV('bills.csv').map(clean);

  // Filtra filas de notas o vacías
  const validBills = bills.filter(b => b.n_claim || b.n_billing);

  // Trae proveedores para mapear rif → id
  const { data: providers } = await supabase
    .from('profile')
    .select('id, rif')
    .eq('role', 'proveedor');

  const rifMap = Object.fromEntries((providers ?? []).map(p => [p.rif, p.id]));

  const rows = validBills.map(b => {
    const { rif_proveedor, notas, ...rest } = b; // elimina columnas auxiliares
    return {
      ...rest,
      suppliers_id: rifMap[rif_proveedor] ?? null,
      total_billing:       rest.total_billing       ? parseFloat(rest.total_billing)       : null,
      medical_honoraries:  rest.medical_honoraries  ? parseFloat(rest.medical_honoraries)  : 0,
      clinical_services:   rest.clinical_services   ? parseFloat(rest.clinical_services)   : 0,
      indemnizable_rate:   rest.indemnizable_rate   ? parseFloat(rest.indemnizable_rate)   : null,
      active: rest.active?.toUpperCase() !== 'FALSE'
    };
  });

  // Inserta en lotes de 100
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
  console.log(`\n  📊 Facturas: ${ok} insertadas de ${rows.length}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Iniciando carga masiva...');
  console.log(`   URL: ${supabaseUrl}\n`);

  const roleMap = await loadRoles();
  await loadUsers(roleMap);

  console.log('\n🎉 Carga completada');
}

main().catch(err => {
  console.error('\n💥 Error fatal:', err.message);
  process.exit(1);
});
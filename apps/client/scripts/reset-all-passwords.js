import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import path from 'path';
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

const NEW_PASSWORD = 'Vertice123';

async function resetAllPasswords() {
  console.log('\n🔑 ASIGNANDO CONTRASEÑA GENÉRICA A TODOS LOS USUARIOS');
  console.log('─'.repeat(60));
  console.log(`  🔒 Contraseña: ${NEW_PASSWORD}\n`);

  // Traer todos los usuarios paginando
  console.log('  🔗 Obteniendo usuarios de Supabase...');
  let allUsers = [];
  let page = 1;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });

    if (error) throw new Error('Error consultando auth.users: ' + error.message);
    if (!data?.users || data.users.length === 0) break;

    allUsers = allUsers.concat(data.users);
    console.log(`  ...cargados ${allUsers.length} usuarios`);

    if (data.users.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`\n  👥 Total de usuarios encontrados : ${allUsers.length}`);
  console.log('\n  🚀 Actualizando contraseñas...\n');

  let updated      = 0;
  let failed       = 0;
  const failedRows = [];

  for (const user of allUsers) {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: NEW_PASSWORD,
    });

    if (error) {
      failed++;
      failedRows.push({ email: user.email, error: error.message });
      console.error(`  ❌ ${user.email} → ${error.message}`);
    } else {
      updated++;
      console.log(`  ✅ ${user.email}`);
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log('📊 RESUMEN FINAL');
  console.log('─'.repeat(60));
  console.log(`  ✅ Actualizados exitosamente : ${updated}`);
  console.log(`  ❌ Fallidos                 : ${failed}`);
  console.log(`  👥 Total usuarios           : ${allUsers.length}`);

  if (failedRows.length > 0) {
    console.log('\n  ⚠️  Usuarios con error:');
    failedRows.forEach(r => console.log(`    • ${r.email} → ${r.error}`));
  }
}

async function main() {
  console.log('🚀 Iniciando reset de contraseñas...');
  console.log(`   URL: ${supabaseUrl}\n`);
  await resetAllPasswords();
  console.log('\n🎉 Proceso completado');
}

main().catch(err => {
  console.error('\n💥 Error fatal:', err.message);
  process.exit(1);
});
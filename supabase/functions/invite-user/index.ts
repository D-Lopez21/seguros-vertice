import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, name, roles, active } = await req.json();

    // Validaciones básicas
    if (!email || !name || !roles?.length) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cliente con service_role (permisos de administrador)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // URL base del frontend para los enlaces de invitación / recuperación
    const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'https://seguros-vertice.onrender.com';

    // 1. Verificar si el email ya existe
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const emailExists = existingUsers?.users?.some(u => u.email === email);
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: 'Ya existe un usuario con ese correo electrónico.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Invitar usuario — le llega un correo para que establezca su contraseña
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { name, roles }, // se guarda en user_metadata
      // Enlace llevará al formulario personalizado de nueva contraseña
      redirectTo: `${frontendUrl}/reset-password`,
    });

    if (authError) throw authError;

    const userId = authData.user.id;
    console.log('✅ Invitación enviada a:', email, 'ID:', userId);

    // 3. Buscar IDs de los roles seleccionados
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id, name')
      .in('name', roles);

    if (roleError) throw roleError;
    console.log('✅ Roles encontrados:', roleData);

    // 4. Insertar relaciones en user_roles (evitando duplicados)
    if (roleData && roleData.length > 0) {
      const rows = roleData.map((r: any) => ({
        user_id: userId,
        role_id: r.id,
      }));

      // Usamos upsert + onConflict para evitar violar la PK (user_id, role_id)
      const { error: userRolesError } = await supabase
        .from('user_roles')
        .upsert(rows, {
          onConflict: 'user_id,role_id',
          ignoreDuplicates: true,
        });

      if (userRolesError) throw userRolesError;
      console.log('✅ Roles asignados correctamente (sin duplicados)');
    }

    // 5. Si active es false, actualizar el perfil
    if (!active) {
      await supabase.from('profile').update({ active: false }).eq('id', userId);
    }

    return new Response(
      JSON.stringify({ id: userId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
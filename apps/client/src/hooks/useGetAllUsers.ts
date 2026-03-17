/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../contexts/AuthContext';

export function useGetAllUsers() {
  const [users, setUsers] = React.useState<Profile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Traer perfil junto con sus roles relacionados
      const { data, error: supabaseError } = await supabase
        .from('profile')
        .select('*, user_roles(roles(name))')
        .eq('active', true)
        .order('name', { ascending: true });

      if (supabaseError) throw supabaseError;

      // Transformar los datos para aplanar los roles a string[]
      // y filtrar proveedores
      const profiles: Profile[] = (data || [])
        .map((item: any) => {
          const roles: string[] = item.user_roles?.map((ur: any) => ur.roles?.name).filter(Boolean) ?? [];
          return { ...item, roles };
        })
        .filter((item: Profile) => !item.roles.includes('proveedor'));

      setUsers(profiles);
    } catch (err: any) {
      console.error('Error en useGetAllUsers:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUser = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('profile')
        .update({ active: false })
        .eq('id', id);

      if (updateError) throw updateError;

      setUsers((prev) => prev.filter((u) => u.id !== id));
      return true;
    } catch (err: any) {
      alert('Error al desactivar usuario: ' + err.message);
      return false;
    }
  };

  const updateUser = async (id: string, updates: any) => {
    try {
      const { roles, ...profileUpdates } = updates;

      // 1. Actualizar datos del perfil
      const { error: updateError } = await supabase
        .from('profile')
        .update(profileUpdates)
        .eq('id', id);

      if (updateError) throw updateError;

      // 2. Si vienen roles, actualizar user_roles
      if (roles && Array.isArray(roles)) {
        // Borrar roles actuales
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', id);

        if (deleteError) throw deleteError;

        // Insertar nuevos roles
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('id, name')
          .in('name', roles);

        if (roleError) throw roleError;

        if (roleData && roleData.length > 0) {
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert(roleData.map((r: any) => ({ user_id: id, role_id: r.id })));

          if (insertError) throw insertError;
        }
      }

      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...profileUpdates, roles: roles ?? u.roles } : u)));
      return true;
    } catch (err: any) {
      alert('Error al actualizar usuario: ' + err.message);
      return false;
    }
  };

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    deleteUser,
    updateUser,
    refetch: fetchUsers,
  };
}
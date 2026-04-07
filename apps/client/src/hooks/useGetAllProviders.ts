/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../contexts/AuthContext';

export function useGetAllProviders() {
  const [providers, setProviders] = React.useState<Profile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchProviders = React.useCallback(async (isMounted = true) => {
    try {
      setLoading(true);
      setError(null);
      // Traemos el perfil junto con sus roles relacionados
      const { data, error: supabaseError } = await supabase
        .from('profile')
        .select('*, user_roles(roles(name))')
        .eq('active', true) // Solo activos
        .order('name', { ascending: true });

      if (supabaseError) throw supabaseError;

      if (isMounted) {
        // Mapeamos a Profile e incluimos solo los que tengan rol 'proveedor'
        const mapped: Profile[] = (data || []).map((row: any) => {
          const roles: string[] =
            row.user_roles?.map((ur: any) => ur.roles?.name).filter(Boolean) ?? [];

          return {
            id: row.id,
            name: row.name,
            email: row.email,
            roles,
            rif: row.rif,
            suppliers_id: row.suppliers_id,
            password_change_required: row.password_change_required,
            active: row.active,
          };
        });

        const onlyProviders = mapped.filter((p) => p.roles?.includes('proveedor'));
        setProviders(onlyProviders);
      }
    } catch (err: any) {
      console.error('Error en fetchProviders:', err.message);
      if (isMounted) {
        setError(err.message);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    fetchProviders(isMounted);

    const channel = supabase
      .channel('providers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile',
          filter: 'role=eq.proveedor',
        },
        (payload) => {
          if (!isMounted) return;

          if (payload.eventType === 'INSERT') {
            if (payload.new.active) {
              setProviders((prev) =>
                [...prev, payload.new as Profile].sort((a, b) =>
                  a.name.localeCompare(b.name)
                )
              );
            }
          } else if (payload.eventType === 'UPDATE') {
            // Borrado lógico en Realtime
            if (payload.new.active === false) {
              setProviders((prev) => prev.filter((p) => p.id !== payload.new.id));
            } else {
              setProviders((prev) =>
                prev.map((provider) =>
                  provider.id === payload.new.id
                    ? (payload.new as Profile)
                    : provider
                )
              );
            }
          } else if (payload.eventType === 'DELETE') {
            setProviders((prev) =>
              prev.filter((provider) => provider.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchProviders]);

  const updateProvider = React.useCallback(
    async (id: string, updates: Partial<Profile>): Promise<boolean> => {
      try {
        const { error: updateError } = await supabase
          .from('profile')
          .update(updates)
          .eq('id', id);

        if (updateError) throw updateError;
        return true;
      } catch (err: any) {
        console.error('Error updating provider:', err.message);
        throw err;
      }
    }, []
  );

  const deleteProvider = React.useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('profile')
        .update({ active: false })
        .eq('id', id);

      if (deleteError) throw deleteError;

      setProviders((prev) => prev.filter((p) => p.id !== id));
      return true;
    } catch (err: any) {
      console.error('Error deleting provider:', err.message);
      throw err;
    }
  }, []);

  const refetch = React.useCallback(async () => {
    await fetchProviders(true);
  }, [fetchProviders]);

  return {
    providers,
    loading,
    error,
    updateProvider,
    deleteProvider,
    refetch,
  };
}
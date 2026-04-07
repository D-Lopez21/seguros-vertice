/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../contexts/AuthContext';

type SimulatedRolesEnum =
  | 'admin'
  | 'recepcion'
  | 'liquidacion'
  | 'auditoria'
  | 'pagos'
  | 'finiquito'
  | 'programacion'
  | 'proveedor';

export function useGetAllUsersFiltered(filterRole: SimulatedRolesEnum) {
  const [users, setUsers] = React.useState<Profile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    // 🔥 Función dentro del useEffect
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const { data, error: supabaseError } = await supabase
          .from('profile')
          .select('*')
          .eq('role', filterRole)
          .order('name', { ascending: true });

        if (supabaseError) throw supabaseError;

        if (isMounted) {
          setUsers(data || []);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Carga inicial
    fetchUsers();

    // Suscripción en tiempo real con filtro
    const channel = supabase
      .channel(`profile-changes-${filterRole}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile',
          filter: `role=eq.${filterRole}`, // ← Filtro a nivel de canal
        },
        (payload) => {
          if (!isMounted) return;

          // Actualización optimista
          if (payload.eventType === 'INSERT') {
            setUsers((prev) => [...prev, payload.new as Profile].sort((a, b) => 
              a.name.localeCompare(b.name)
            ));
          } else if (payload.eventType === 'UPDATE') {
            setUsers((prev) =>
              prev.map((user) =>
                user.id === payload.new.id ? (payload.new as Profile) : user
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setUsers((prev) => prev.filter((user) => user.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [filterRole]); // ← Solo depende de filterRole

  // 🔥 Función de refetch manual
  const refetch = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: supabaseError } = await supabase
        .from('profile')
        .select('*')
        .eq('role', filterRole)
        .order('name', { ascending: true });

      if (supabaseError) throw supabaseError;
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterRole]);

  return { users, loading, error, refetch };
}
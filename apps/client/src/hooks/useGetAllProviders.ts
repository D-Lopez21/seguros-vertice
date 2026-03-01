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
      
      const { data, error: supabaseError } = await supabase
        .from('profile')
        .select('*')
        .eq('role', 'proveedor')
        .eq('active', true) // 🔥 FILTRO: Solo activos
        .order('name', { ascending: true });

      if (supabaseError) throw supabaseError;

      if (isMounted) {
        setProviders(data || []);
      }
    } catch (err: any) {
      console.error('❌ Error en fetchProviders:', err.message);
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

    // 🔍 DEBUGGING REALTIME - LOGS RESTAURADOS
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
          if (!isMounted) {
            console.log('⚠️⚠️⚠️ Evento recibido PERO componente desmontado');
            return;
          }

          // 🔍 LOGS PRINCIPALES
          console.log('');
          console.log('═══════════════════════════════════════');
          console.log('🔔 REALTIME EVENT RECIBIDO');
          console.log('   Tipo:', payload.eventType);
          console.log('   Hora:', new Date().toLocaleTimeString());
          console.log('═══════════════════════════════════════');
          console.log('');

          if (payload.eventType === 'INSERT') {
            console.log('➕ INSERTANDO NUEVO PROVIDER:');
            // Solo insertamos en el estado si viene activo
            if (payload.new.active) {
              setProviders((prev) => {
                const newProviders = [...prev, payload.new as Profile].sort((a, b) => 
                  a.name.localeCompare(b.name)
                );
                console.log('✅ Lista actualizada, total proveedores:', newProviders.length);
                return newProviders;
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ ACTUALIZANDO PROVIDER:', payload.new?.name);
            
            // 🔥 LÓGICA DE BORRADO LÓGICO EN REALTIME
            if (payload.new.active === false) {
              console.log('🗑️ DETECTADA DESACTIVACIÓN (active: false). Eliminando de la UI...');
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
            console.log('🗑️ ELIMINANDO FÍSICO (fallback):', payload.old?.id);
            setProviders((prev) => 
              prev.filter((provider) => provider.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción Realtime:', status);
      });

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
        console.error('❌ Error updating provider:', err.message);
        throw err;
      }
    }, []
  );

  // 🔥 FUNCIÓN DE BORRADO LÓGICO
  const deleteProvider = React.useCallback(async (id: string): Promise<boolean> => {
    try {
      console.log('🔄 Iniciando borrado lógico para id:', id);
      const { error: deleteError } = await supabase
        .from('profile')
        .update({ active: false }) // Cambiamos delete() por update
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Eliminación optimista
      setProviders((prev) => prev.filter((p) => p.id !== id));
      console.log('✅ Borrado lógico exitoso');

      return true;
    } catch (err: any) {
      console.error('❌ Error deleting provider:', err.message);
      throw err;
    }
  }, []);

  // 🔍 REFETCH CON LOGS DETALLADOS RESTAURADOS
  const refetch = React.useCallback(async () => {
    console.log('');
    console.log('🔄🔄🔄 REFETCH MANUAL INICIADO 🔄🔄🔄');
    await fetchProviders(true);
    console.log('🔄🔄🔄 REFETCH COMPLETADO 🔄🔄🔄');
    console.log('');
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
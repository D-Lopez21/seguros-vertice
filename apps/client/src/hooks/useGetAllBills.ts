/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { supabase } from '../lib/supabase';
import type { Bill } from '../components/bills-details/interfaces';
import { useAuth } from './useAuth';

interface Provider {
  id: string;
  name: string;
  rif?: string;
  role: string;
  active: boolean;
}

let cachedBills: Bill[] = [];
let cachedProviders: Provider[] = [];

// Función auxiliar para traer TODOS los registros sin límite de 1000
async function fetchAllRows<T>(query: any): Promise<T[]> {
  const batchSize = 1000;
  let from = 0;
  let all: T[] = [];

  while (true) {
    const { data, error } = await query.range(from, from + batchSize - 1);
    if (error) throw error;
    all = [...all, ...(data || [])];
    if ((data?.length ?? 0) < batchSize) break;
    from += batchSize;
  }

  return all;
}

export function useGetAllBills() {
  const { user } = useAuth();
  
  const [bills, setBills] = React.useState<Bill[]>(cachedBills);
  const [providers, setProviders] = React.useState<Provider[]>(cachedProviders);
  const [loading, setLoading] = React.useState(cachedBills.length === 0);
  const [error, setError] = React.useState<string | null>(null);

  const refetch = React.useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      let query = supabase.from('bills').select('*');
      const roles = user?.profile?.roles ?? [];
      const isProveedor = roles.includes('proveedor');
      if (isProveedor && user) {
        const providerIdentifier = user.profile?.suppliers_id || user.id;
        query = query.eq('suppliers_id', providerIdentifier);
      }
      query = query.order('arrival_date', { ascending: false });

      // Usa fetchAllRows para superar el límite de 1000 filas de Supabase
      const data = await fetchAllRows<Bill>(query);
      cachedBills = data;
      setBills(cachedBills);
    } catch (err: any) {
      console.error('Error en refetch:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      if (cachedBills.length === 0) setLoading(true);
      try {
        let billsQuery = supabase.from('bills').select('*');
        const roles = user?.profile?.roles ?? [];
        const isProveedor = roles.includes('proveedor');
        if (isProveedor && user) {
          const providerIdentifier = user.profile?.suppliers_id || user.id;
          billsQuery = billsQuery.eq('suppliers_id', providerIdentifier);
        }
        billsQuery = billsQuery.order('arrival_date', { ascending: false });

        // ✅ Usa fetchAllRows para superar el límite de 1000 filas de Supabase
        const [billsData, pRes] = await Promise.all([
          fetchAllRows<Bill>(billsQuery),
          supabase
            .from('profile')
            .select('id, name, rif, active, user_roles(roles(name))')
            .eq('active', true),
        ]);

        if (pRes.error) throw pRes.error;

        if (isMounted) {
          cachedBills = billsData;

          const mappedProviders: Provider[] = (pRes.data || [])
            .map((row: any) => {
              const rowRoles: string[] =
                row.user_roles?.map((ur: any) => ur.roles?.name).filter(Boolean) ?? [];
              return {
                id: row.id,
                name: row.name,
                rif: row.rif,
                role: rowRoles.includes('proveedor') ? 'proveedor' : '',
                active: row.active,
              };
            })
            .filter((p: Provider) => p.role === 'proveedor');

          cachedProviders = mappedProviders;
          setBills(cachedBills);
          setProviders(cachedProviders);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadInitialData();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isMounted) refetch(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const roles = user?.profile?.roles ?? [];
    const isProveedor = roles.includes('proveedor');
    const providerIdentifier = isProveedor
      ? (user?.profile?.suppliers_id || user?.id)
      : null;
    const channelName = providerIdentifier
      ? `bills-changes-${providerIdentifier}`
      : 'bills-changes';

    let channel = supabase.channel(channelName);
    if (providerIdentifier) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bills', filter: `suppliers_id=eq.${providerIdentifier}` },
        () => { if (isMounted) refetch(false); }
      );
    } else {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bills' },
        () => { if (isMounted) refetch(false); }
      );
    }
    channel.subscribe();

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      supabase.removeChannel(channel);
    };
  }, [refetch, user]);

  const deleteBill = React.useCallback(async (id: string) => {
    try {
      const { error: delError } = await supabase.from('bills').delete().eq('id', id);
      if (delError) throw delError;
      setBills(prev => {
        const filtered = prev.filter(b => b.id !== id);
        cachedBills = filtered;
        return filtered;
      });
      return true;
    } catch (err: any) {
      console.error('Error eliminando factura:', err);
      return false;
    }
  }, []);

  const getProviderName = React.useCallback((id?: string) => {
    if (!id) return 'Sin proveedor';
    if (providers.length === 0) return 'Cargando...';
    const p = providers.find(p => p.id === id);
    return p ? `${p.name}${p.rif ? ` - ${p.rif}` : ''}` : 'Proveedor no encontrado';
  }, [providers]);

  return { bills, providers, loading, error, getProviderName, deleteBill, refetch };
}
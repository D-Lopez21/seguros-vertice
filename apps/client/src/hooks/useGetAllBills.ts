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

export function useGetAllBills() {
  const { user } = useAuth();
  
  const [bills, setBills] = React.useState<Bill[]>(cachedBills);
  const [providers, setProviders] = React.useState<Provider[]>(cachedProviders);
  
  const [loading, setLoading] = React.useState(cachedBills.length === 0);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      console.log('👤 Usuario actual:', {
        id: user.id,
        email: user.email,
        roles: user.profile?.roles,
        suppliers_id: user.profile?.suppliers_id,
        name: user.profile?.name
      });
    }
  }, [user]);

  const refetch = React.useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError(null);
    
    try {
      console.log("🔄 Sincronizando datos...");
      
      let query = supabase
        .from('bills')
        .select('*');
      
      const roles = user?.profile?.roles ?? [];
      const isProveedor = roles.includes('proveedor');

      if (isProveedor && user) {
        const providerIdentifier = user.profile?.suppliers_id || user.id;
        console.log('🔒 FILTRO APLICADO - Proveedor ID:', providerIdentifier);
        query = query.eq('suppliers_id', providerIdentifier);
      } else {
        console.log('🔓 Sin filtro - Mostrando todas las facturas (admin u otros roles internos)');
      }
      
      query = query.order('arrival_date', { ascending: false });

      const { data, error: sbError } = await query;

      if (sbError) throw sbError;
      
      const result = data || [];
      
      console.log(`📦 Facturas obtenidas: ${result.length}`);
      if (isProveedor) {
        console.log('📋 Facturas del proveedor:', result.map(b => ({
          n_billing: b.n_billing,
          suppliers_id: b.suppliers_id
        })));
      }
      
      cachedBills = result;
      setBills(result);
    } catch (err: any) {
      console.error("❌ Error en refetch:", err.message);
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
        let billsQuery = supabase
          .from('bills')
          .select('*');
        
        const roles = user?.profile?.roles ?? [];
        const isProveedor = roles.includes('proveedor');

        if (isProveedor && user) {
          const providerIdentifier = user.profile?.suppliers_id || user.id;
          console.log('🔒 Aplicando filtro en carga inicial...');
          console.log('ID del proveedor:', providerIdentifier);
          billsQuery = billsQuery.eq('suppliers_id', providerIdentifier);
        }
        
        billsQuery = billsQuery.order('arrival_date', { ascending: false });

        const [bRes, pRes] = await Promise.all([
          billsQuery,
          supabase
            .from('profile')
            .select('id, name, rif, active, user_roles(roles(name))')
            .eq('active', true),
        ]);

        if (bRes.error) throw bRes.error;
        if (pRes.error) throw pRes.error;

        if (isMounted) {
          cachedBills = bRes.data || [];

          const mappedProviders: Provider[] = (pRes.data || [])
            .map((row: any) => {
              const roles: string[] =
                row.user_roles?.map((ur: any) => ur.roles?.name).filter(Boolean) ?? [];

              return {
                id: row.id,
                name: row.name,
                rif: row.rif,
                role: roles.includes('proveedor') ? 'proveedor' : '',
                active: row.active,
              };
            })
            

          cachedProviders = mappedProviders;

          setBills(cachedBills);
          setProviders(cachedProviders);
          setError(null);
          
          console.log(`✅ Carga inicial completada: ${cachedBills.length} facturas`);
          
          if (isProveedor && user) {
            const providerIdentifier = user.profile?.suppliers_id || user.id;
            console.log('🔍 Comparación de IDs:');
            console.log('Mi ID de proveedor:', providerIdentifier);
            console.log('Facturas cargadas:', cachedBills.map(b => ({
              factura: b.n_billing,
              suppliers_id: b.suppliers_id,
              coincide: b.suppliers_id === providerIdentifier
            })));
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadInitialData();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        refetch(false);
      }
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
        { 
          event: '*', 
          schema: 'public', 
          table: 'bills',
          filter: `suppliers_id=eq.${providerIdentifier}`
        }, 
        () => {
          if (isMounted) {
            console.log('🔔 Cambio detectado en facturas del proveedor');
            refetch(false);
          }
        }
      );
    } else {
      channel = channel.on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'bills' }, 
        () => {
          if (isMounted) {
            console.log('🔔 Cambio detectado en facturas');
            refetch(false);
          }
        }
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

  // ✅ CAMBIO: si los proveedores ya cargaron pero no se encuentra el ID,
  // muestra "Proveedor no encontrado" en lugar de quedarse en "Cargando..."
  const getProviderName = React.useCallback((id?: string) => {
    if (!id) return 'Sin proveedor';
    if (providers.length === 0) return 'Cargando...';
    const p = providers.find(p => p.id === id);
    return p ? `${p.name}${p.rif ? ` - ${p.rif}` : ''}` : 'Proveedor no encontrado';
  }, [providers]);

  return { bills, loading, error, getProviderName, deleteBill, refetch };
}
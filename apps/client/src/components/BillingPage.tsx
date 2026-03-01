import React from 'react';
import { Button, DashboardLayout } from './common';
import { PlusIcon } from './icons';
import BillsTable from './BillsTable';
import { useNavigate } from 'react-router';
import { useGetAllBills } from '../hooks/useGetAllBills';
import { useAuth } from '../hooks/useAuth';

type FilterType = 'claim' | 'provider' | 'lot' | 'state_sequence';

export default function BillingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { bills, loading, error, getProviderName, deleteBill } = useGetAllBills();
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<FilterType>('claim');

  const isProvider = user?.profile?.role === 'proveedor';

  // Valores técnicos coinciden con lo que guardas en BillsDetailsPage
  const states = [
    { label: 'Recepción', value: 'recepcion' },
    { label: 'Liquidación', value: 'liquidacion' },
    { label: 'Auditoría', value: 'auditoria' },
    { label: 'Programación', value: 'programacion' },
    { label: 'Pagos', value: 'pagos' },
    { label: 'Finiquito', value: 'finiquito' },
    { label: 'Devuelto', value: 'devuelto' },
  ];

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterType('claim');
  };

  return (
    <DashboardLayout title="Sistema Administrativo Vertice" returnTo="/">
      <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        
        <div className="flex bg-white border border-neutral-200 rounded-lg p-1 shadow-sm w-full md:w-auto items-center">
          <select 
            value={filterType}
            onChange={(e) => {
                setFilterType(e.target.value as FilterType);
                setSearchTerm(''); 
            }}
            className="bg-transparent text-sm font-medium px-3 outline-none border-r border-neutral-200 cursor-pointer text-neutral-600 h-9"
          >
            <option value="claim">N° Siniestro</option>
            {!isProvider && <option value="provider">Proveedor</option>}
            <option value="lot">Lote</option>
            <option value="state_sequence">Estado</option>
          </select>

          {filterType === 'state_sequence' ? (
            <select
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-sm px-4 py-1.5 outline-none w-full md:w-80 bg-transparent cursor-pointer text-neutral-500 h-9"
            >
              <option value="">Seleccionar estado...</option>
              {states.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-sm px-4 py-1.5 outline-none w-full md:w-80 bg-transparent h-9"
            />
          )}

          {searchTerm && (
            <button onClick={handleClearFilters} className="px-3 text-xs text-neutral-400 hover:text-red-500 font-bold">✕</button>
          )}
        </div>

        {!isProvider && (
          <Button icon={<PlusIcon className="size-5" />} onClick={() => navigate('create-bill')}>
            Nueva Factura
          </Button>
        )}
      </div>

      <BillsTable 
        bills={bills}
        loading={loading}
        error={error}
        searchTerm={searchTerm} 
        filterType={filterType} 
        getProviderName={getProviderName}
        onDelete={(id) => {
            if (window.confirm('¿Eliminar esta factura?')) deleteBill(id);
        }}
      />
    </DashboardLayout>
  );
}
import React from 'react';
import { Button, DashboardLayout, ConfirmDialog } from './common';
import { PlusIcon, DownloadIcon } from './icons';
import BillsTable from './BillsTable';
import BillModal from './bills-details/BillModal';
import { useNavigate } from 'react-router';
import { useGetAllBills } from '../hooks/useGetAllBills';
import { useAuth } from '../hooks/useAuth';

type FilterType = 'claim' | 'provider' | 'lot' | 'state_sequence';

export default function BillingPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const { bills, loading, error, deleteBill, getProviderName } = useGetAllBills();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<FilterType>('claim');

  const [confirmDialog, setConfirmDialog] = React.useState<{ isOpen: boolean; id: string; isLoading: boolean }>({
    isOpen: false, id: '', isLoading: false,
  });
  const [notification, setNotification] = React.useState<{ isOpen: boolean; message: string; type: 'error' | 'success' | 'warning' | 'info' }>({
    isOpen: false, message: '', type: 'error',
  });

  const roles = user?.profile?.roles ?? [];
  const isProvider = roles.includes('proveedor');
  const canCreateBill = !isProvider && (isAdmin || roles.includes('recepcion'));

  const states = [
    { label: 'Recepción',    value: 'recepcion' },
    { label: 'Liquidación',  value: 'liquidacion' },
    { label: 'Auditoría',    value: 'auditoria' },
    { label: 'Programación', value: 'programacion' },
    { label: 'Pagos',        value: 'pagos' },
    { label: 'Finiquito',    value: 'finiquito' },
    { label: 'Devuelto',     value: 'devuelto' },
  ];

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterType('claim');
  };

  const handleDeleteRequest = (id: string) => {
    setConfirmDialog({ isOpen: true, id, isLoading: false });
  };

  const handleConfirmDelete = async () => {
    setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      const success = await deleteBill(confirmDialog.id);
      setConfirmDialog({ isOpen: false, id: '', isLoading: false });
      if (!success) {
        setNotification({
          isOpen: true,
          message: 'Error al eliminar la factura. Inténtalo de nuevo.',
          type: 'error',
        });
      }
    } catch (err: any) {
      setConfirmDialog({ isOpen: false, id: '', isLoading: false });
      setNotification({
        isOpen: true,
        message: err.message || 'Error al eliminar la factura. Inténtalo de nuevo.',
        type: 'error',
      });
    }
  };

  return (
    <DashboardLayout title="Sistema Administrativo Vertice" returnTo="/">
      <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 mb-6">

        {/* Barra de búsqueda/filtro */}
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

        {/* Botones de acción */}
        <div className="flex items-center gap-2">

          {/* Exportar — solo admin y proveedor */}
          {(isAdmin || isProvider) && (
            <button
              onClick={() => navigate('export')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <DownloadIcon className="size-4" />
              Exportar facturas
            </button>
          )}

          {/* Nueva Factura — solo no-proveedores */}
          {!isProvider && (
            <Button
              icon={<PlusIcon className="size-5" />}
              onClick={() => canCreateBill && navigate('create-bill')}
              disabled={!canCreateBill}
              className={!canCreateBill ? 'opacity-50 cursor-not-allowed' : undefined}
              title={!canCreateBill ? 'Solo usuarios de Recepción o Admin pueden crear facturas' : undefined}
            >
              Nueva Factura
            </Button>
          )}

        </div>
      </div>

      <BillsTable
        bills={bills}
        loading={loading}
        error={error}
        searchTerm={searchTerm}
        filterType={filterType}
        getProviderName={getProviderName}
        onDelete={handleDeleteRequest}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, id: '', isLoading: false })}
        onConfirm={handleConfirmDelete}
        isLoading={confirmDialog.isLoading}
        title="Eliminar factura"
        message="¿Seguro que deseas eliminar esta factura? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
      />

      <BillModal
        isOpen={notification.isOpen}
        onClose={() => setNotification((prev) => ({ ...prev, isOpen: false }))}
        message={notification.message}
        type={notification.type}
      />
    </DashboardLayout>
  );
}

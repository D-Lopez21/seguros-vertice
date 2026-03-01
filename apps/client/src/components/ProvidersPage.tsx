import React from 'react';
import { DashboardLayout, Button } from './common';
import ProviderRegistrationModal from './ProviderRegistrationModal';
import ProvidersTable from './ProvidersTable';
import { useGetAllProviders } from '../hooks/useGetAllProviders';
import type { Profile } from '../contexts/AuthContext';

export default function ProvidersPage() {
  const { providers, loading, updateProvider, deleteProvider } = useGetAllProviders(); // ← SIN refetch
  
  const [modalIsOpen, setModalIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [providerToEdit, setProviderToEdit] = React.useState<Profile | null>(
    null
  );

  const handleEdit = (provider: Profile) => {
    setProviderToEdit(provider);
    setModalIsOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar a ${name}?`)) {
      try {
        await deleteProvider(id);
      } catch (error) {
        console.error('Error al eliminar:', error);
      }
    }
  };

  return (
    <DashboardLayout title="Gestión de Proveedores" returnTo="/">
      
      {/* SECCIÓN DE BOTÓN Y FILTRO */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        
        <div className="flex bg-white border border-neutral-200 rounded-lg p-1 shadow-sm w-full sm:w-auto">
          <div className="flex items-center px-3 text-neutral-400">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar proveedor o RIF..."
            className="text-sm px-2 py-1.5 outline-none w-full sm:w-80"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button 
          onClick={() => { setProviderToEdit(null); setModalIsOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-200"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>Nuevo Proveedor</span>
        </Button>
      </div>

      {/* Tabla de Proveedores */}
      <ProvidersTable
        providers={providers}
        loading={loading}
        searchTerm={searchTerm}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Modal - REALTIME AHORA FUNCIONA */}
      <ProviderRegistrationModal
        isOpen={modalIsOpen}
        onClose={() => setModalIsOpen(false)}
        providerToEdit={providerToEdit}
        onUpdate={updateProvider}
        onProviderRegistered={() => {
          console.log('');
          console.log('✅✅✅ PROVEEDOR GUARDADO EXITOSAMENTE ✅✅✅');
          console.log('   Esperando actualización automática vía Realtime...');
          console.log('');
          // NO llamar refetch - Realtime se encargará
        }}
      />
    </DashboardLayout>
  );
}

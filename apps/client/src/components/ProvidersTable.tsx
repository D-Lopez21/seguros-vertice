import { EditIcon, TrashIcon } from './icons';
import type { Profile } from '../contexts/AuthContext';

interface ProvidersTableProps {
  providers: Profile[];
  loading: boolean;
  searchTerm: string;
  onEdit: (provider: Profile) => void;
  onDelete: (id: string, name: string) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function ProvidersTable({ 
  providers, 
  loading, 
  searchTerm, 
  onEdit, 
  onDelete,
  page,
  pageSize,
  onPageChange,
}: ProvidersTableProps) {

  const filteredProviders = (providers || []).filter((provider) =>
    provider.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (provider.rif && provider.rif.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filteredProviders.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filteredProviders.slice(safePage * pageSize, safePage * pageSize + pageSize);

  if (loading) return <div className="py-10 text-center text-neutral-500 italic">Cargando proveedores...</div>;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-neutral-600">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 font-semibold">
            <tr>
              <th className="px-6 py-4">Nombre</th>
              <th className="px-6 py-4">RIF</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {paginated.length > 0 ? (
              paginated.map((provider) => (
                <tr key={provider.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-neutral-900">{provider.name}</td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded text-xs">
                      {provider.rif || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className={`h-2 w-2 rounded-full ${provider.active ? 'bg-green-500' : 'bg-neutral-300'}`} />
                      {provider.active ? 'Activo' : 'Inactivo'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => onEdit(provider)} className="p-1.5 hover:bg-blue-50 rounded-lg text-neutral-400 hover:text-blue-600 transition-colors">
                        <EditIcon className="size-5" />
                      </button>
                      <button onClick={() => onDelete(provider.id, provider.name || '')} className="p-1.5 hover:bg-red-50 rounded-lg text-neutral-400 hover:text-red-600 transition-colors">
                        <TrashIcon className="size-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-neutral-400">No se encontraron proveedores.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-100 bg-neutral-50/50">
        <span className="text-xs text-neutral-400">
          {filteredProviders.length === 0
            ? 'Sin resultados'
            : `${safePage * pageSize + 1}–${Math.min(safePage * pageSize + pageSize, filteredProviders.length)} de ${filteredProviders.length} proveedores`}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage === 0}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Anterior
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => onPageChange(i)}
              className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                i === safePage
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-500 hover:bg-neutral-100'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages - 1}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}
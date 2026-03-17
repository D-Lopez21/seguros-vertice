import { EditIcon, TrashIcon } from './icons';
import type { Profile } from '../contexts/AuthContext';

interface Props {
  users: Profile[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  filterType: 'name' | 'role';
  onEdit: (user: Profile) => void;
  onDelete: (id: string, name: string) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const ROLE_STYLES: Record<string, string> = {
  admin:        'bg-purple-100 text-purple-700',
  recepcion:    'bg-blue-100 text-blue-700',
  liquidacion:  'bg-yellow-100 text-yellow-700',
  auditoria:    'bg-red-100 text-red-700',
  pagos:        'bg-green-100 text-green-700',
  finiquito:    'bg-cyan-100 text-cyan-700',
  programacion: 'bg-indigo-100 text-indigo-700',
  proveedor:    'bg-orange-100 text-orange-700',
};

const ROLE_LABELS: Record<string, string> = {
  admin:        'Administrador',
  recepcion:    'Recepción',
  liquidacion:  'Liquidación',
  auditoria:    'Auditoría',
  pagos:        'Pagos',
  finiquito:    'Finiquito',
  programacion: 'Programación',
  proveedor:    'Proveedor',
};

export default function UsersTable({
  users, loading, error, searchTerm, filterType,
  onEdit, onDelete, page, pageSize, onPageChange,
}: Props) {
  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return filterType === 'name'
      ? user?.name?.toLowerCase().includes(term)
      : user?.roles?.some(r => r.toLowerCase().includes(term));
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filteredUsers.slice(safePage * pageSize, safePage * pageSize + pageSize);

  if (loading) return <div className="py-10 text-center text-neutral-500 italic">Cargando usuarios...</div>;
  if (error)   return <div className="py-10 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-neutral-600">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 font-semibold">
            <tr>
              <th className="px-6 py-4">Usuario</th>
              <th className="px-6 py-4">Roles</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-neutral-400 italic">
                  No se encontraron usuarios.
                </td>
              </tr>
            ) : (
              paginated.map((user) => (
                <tr key={user.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-neutral-900">{user.name || 'Sin nombre'}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">{user.id.slice(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.length > 0 ? (
                        user.roles.map(role => (
                          <span
                            key={role}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLES[role] ?? 'bg-neutral-100 text-neutral-600'}`}
                          >
                            {ROLE_LABELS[role] ?? role}
                          </span>
                        ))
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500">
                          Sin rol
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className={`h-2 w-2 rounded-full ${user.active ? 'bg-green-500' : 'bg-neutral-300'}`} />
                      {user.active ? 'Activo' : 'Inactivo'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => onEdit(user)} className="p-1.5 hover:bg-blue-50 rounded-lg text-neutral-400 hover:text-blue-600 transition-colors">
                        <EditIcon className="size-5" />
                      </button>
                      <button onClick={() => onDelete(user.id, user.name || '')} className="p-1.5 hover:bg-red-50 rounded-lg text-neutral-400 hover:text-red-600 transition-colors">
                        <TrashIcon className="size-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-100 bg-neutral-50/50">
        <span className="text-xs text-neutral-400">
          {filteredUsers.length === 0
            ? 'Sin resultados'
            : `${safePage * pageSize + 1}–${Math.min(safePage * pageSize + pageSize, filteredUsers.length)} de ${filteredUsers.length} usuarios`}
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
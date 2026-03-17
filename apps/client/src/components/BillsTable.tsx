import { EditIcon, TrashIcon } from './icons';
import { useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import React from 'react';

interface BillsTableProps {
  bills: any[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  filterType: 'claim' | 'provider' | 'lot' | 'state_sequence';
  getProviderName: (id: string) => string;
  onDelete: (id: string) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function BillsTable({ 
  bills, loading, error, searchTerm, filterType, getProviderName, onDelete 
}: BillsTableProps) {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const roles = user?.profile?.roles ?? [];
  const isProveedor = roles.includes('proveedor');

  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  // Resetear a página 1 cuando cambia el filtro o búsqueda
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  const stateStyles: Record<string, string> = {
    'recepcion':    'bg-blue-100 text-blue-700 border-blue-200',
    'liquidacion':  'bg-purple-100 text-purple-700 border-purple-200',
    'auditoria':    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'programacion': 'bg-orange-100 text-orange-700 border-orange-200',
    'pagos':        'bg-cyan-100 text-cyan-700 border-cyan-200',
    'finiquito':    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'devuelto':     'bg-red-100 text-red-700 border-red-200',
  };

  const stateLabels: Record<string, string> = {
    'recepcion':    'Recepción',
    'liquidacion':  'Liquidación',
    'auditoria':    'Auditoría',
    'programacion': 'Programación',
    'pagos':        'Pagos',
    'finiquito':    'Finiquito',
    'devuelto':     'Devuelto',
  };

  const filteredBills = bills.filter((bill) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase().trim();
    switch (filterType) {
      case 'claim':          return bill.n_claim?.toLowerCase().includes(term);
      case 'provider':       return getProviderName(bill.suppliers_id).toLowerCase().includes(term);
      case 'lot':            return bill.nomenclature_pile?.toLowerCase().includes(term);
      case 'state_sequence': return String(bill.state_sequence || '').toLowerCase().trim() === term;
      default: return true;
    }
  });

  // Cálculos de paginación
  const totalItems = filteredBills.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedBills = filteredBills.slice(startIndex, endIndex);

  // Genera el rango de páginas visibles (máx 5 botones)
  const getPageRange = () => {
    const delta = 2;
    const range: number[] = [];
    for (
      let i = Math.max(1, safePage - delta);
      i <= Math.min(totalPages, safePage + delta);
      i++
    ) {
      range.push(i);
    }
    return range;
  };

  if (loading) return <div className="py-10 text-center text-neutral-500 italic">Cargando...</div>;
  if (error)   return <div className="py-10 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-3">
      {/* Tabla */}
      <div className="w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500 font-semibold">
              <tr>
                <th className="px-6 py-4">N° Siniestro</th>
                <th className="px-6 py-4">Proveedor</th>
                <th className="px-6 py-4">Lote</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {paginatedBills.map((bill) => {
                const currentState = String(bill.state_sequence || 'recepcion').toLowerCase().trim();
                const currentStyle = stateStyles[currentState] || 'bg-gray-100 text-gray-700 border-gray-200';
                const label = stateLabels[currentState] || currentState;

                return (
                  <tr key={bill.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-neutral-900">{bill.n_claim || 'S/N'}</td>
                    <td className="px-6 py-4">{getProviderName(bill.suppliers_id)}</td>
                    <td className="px-6 py-4 text-xs font-medium text-blue-600">
                      {bill.nomenclature_pile || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${currentStyle}`}>
                        {label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => navigate(`/bills/${bill.id}`)} className="p-1.5 text-neutral-400 hover:text-blue-600">
                          <EditIcon className="size-5" />
                        </button>
                        {!isProveedor && (
                          <button
                            onClick={() => isAdmin && onDelete(bill.id)}
                            className={`p-1.5 ${isAdmin ? 'text-neutral-400 hover:text-red-600' : 'text-neutral-200 opacity-50 cursor-not-allowed'}`}
                            disabled={!isAdmin}
                          >
                            <TrashIcon className="size-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {paginatedBills.length === 0 && (
            <div className="py-20 text-center text-neutral-400 italic">
              No hay facturas en esta etapa.
            </div>
          )}
        </div>
      </div>

      {/* Controles de paginación */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">

          {/* Info + selector de tamaño */}
          <div className="flex items-center gap-3 text-sm text-neutral-500">
            <span>
              Mostrando <span className="font-semibold text-neutral-700">{startIndex + 1}–{endIndex}</span> de{' '}
              <span className="font-semibold text-neutral-700">{totalItems}</span> facturas
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs">por página:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-xs border border-neutral-200 rounded-md px-2 py-1 bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                {PAGE_SIZE_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Botones de página */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {/* Primera */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={safePage === 1}
                className="px-2 py-1 text-xs rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                «
              </button>
              {/* Anterior */}
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-2 py-1 text-xs rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ‹
              </button>

              {/* Páginas */}
              {getPageRange().map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-xs rounded-md border font-medium transition-colors ${
                    page === safePage
                      ? 'bg-[#1a56ff] border-[#1a56ff] text-white'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              {/* Siguiente */}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-2 py-1 text-xs rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ›
              </button>
              {/* Última */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage === totalPages}
                className="px-2 py-1 text-xs rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                »
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
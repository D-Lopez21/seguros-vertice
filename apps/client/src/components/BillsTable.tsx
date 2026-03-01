import { EditIcon, TrashIcon } from './icons';
import { useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';

interface BillsTableProps {
  bills: any[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  filterType: 'claim' | 'provider' | 'lot' | 'state_sequence';
  getProviderName: (id: string) => string;
  onDelete: (id: string) => void;
}

export default function BillsTable({ 
  bills, loading, error, searchTerm, filterType, getProviderName, onDelete 
}: BillsTableProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isProveedor = user?.profile?.role === 'proveedor';
  const isAdmin = user?.profile?.role === 'admin';

  // Mapeo de estilos basado estrictamente en state_sequence
  const stateStyles: Record<string, string> = {
    'recepcion':    'bg-blue-100 text-blue-700 border-blue-200',
    'liquidacion':  'bg-purple-100 text-purple-700 border-purple-200',
    'auditoria':    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'programacion': 'bg-orange-100 text-orange-700 border-orange-200',
    'pagos':        'bg-cyan-100 text-cyan-700 border-cyan-200',
    'finiquito':    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'devuelto':     'bg-red-100 text-red-700 border-red-200',
  };

  // Mapeo para mostrar nombres bonitos en lugar de las llaves técnicas
  const stateLabels: Record<string, string> = {
    'recepcion': 'Recepción',
    'liquidacion': 'Liquidación',
    'auditoria': 'Auditoría',
    'programacion': 'Programación',
    'pagos': 'Pagos',
    'finiquito': 'Finiquito',
    'devuelto': 'Devuelto'
  };

  const filteredBills = bills.filter((bill) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase().trim();

    switch (filterType) {
      case 'claim':           return bill.n_claim?.toLowerCase().includes(term);
      case 'provider':        return getProviderName(bill.suppliers_id).toLowerCase().includes(term);
      case 'lot':             return bill.nomenclature_pile?.toLowerCase().includes(term);
      case 'state_sequence':  return String(bill.state_sequence || '').toLowerCase().trim() === term;
      default: return true;
    }
  });

  if (loading) return <div className="py-10 text-center text-neutral-500 italic">Cargando...</div>;
  if (error)   return <div className="py-10 text-center text-red-500">Error: {error}</div>;

  return (
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
            {filteredBills.map((bill) => {
              // USAMOS STATE_SEQUENCE PARA TODO LO VISUAL
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
        {filteredBills.length === 0 && (
          <div className="py-20 text-center text-neutral-400 italic">No hay facturas en esta etapa.</div>
        )}
      </div>
    </div>
  );
}
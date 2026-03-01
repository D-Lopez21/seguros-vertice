import { Button, Input, Select } from '../common';

export default function ReceptionSection({
  data,
  setData,
  providers,
  allUsers,
  onSave,
  isNewBill,
  loading,
  canEdit,
  userRole,
  billState,
  currentBill,
}: any) {
  const isReadOnly = !canEdit && !isNewBill;
  const isDevuelto = billState === 'devuelto';

  const getAnalystName = () => {
    if (!currentBill?.analyst_receptor_id) return 'No asignado';
    const analyst = allUsers?.find((u: any) => u.id === currentBill.analyst_receptor_id);
    return analyst?.name || 'Desconocido';
  };

  const isFormValid = () => {
    return (
      data.arrival_date &&
      data.suppliers_id &&
      data.n_claim &&
      data.type &&
      data.n_billing &&
      data.currency_type &&
      data.total_billing &&
      parseFloat(data.total_billing) > 0
    );
  };

  const isDisabled = loading || isReadOnly || !isFormValid();

  const formatCurrency = (value: string | number) => {
    if (!value) return '';
    const number = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-VE', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isReadOnly) { alert('No tienes permisos para guardar cambios en esta sección'); return; }
        if (!isFormValid()) { alert('Por favor, completa todos los campos requeridos antes de guardar.'); return; }
        onSave(data);
      }}
      className="space-y-6"
    >
      {isReadOnly && !isDevuelto && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 shadow-sm rounded-r-lg flex items-center transition-all">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 115.636 5.636m12.728 12.728L5.636 5.636" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-amber-800">
              Usted está en modo <span className="font-bold">Vista Previa</span>. Su rol actual (<span className="font-mono bg-amber-100 px-1 rounded">{userRole}</span>) no permite editar esta sección.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Detalles de la Recepción
          </h3>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <Input
              label="Fecha de Recepción"
              type="date"
              value={data.arrival_date}
              onChange={(e) => setData({ ...data, arrival_date: e.target.value })}
              disabled={isReadOnly}
            />

            <Select
              label="Proveedor"
              value={data.suppliers_id}
              onChange={(e) => setData({ ...data, suppliers_id: e.target.value })}
              required
              disabled={isReadOnly}
              options={(providers || []).map((p: any) => ({
                value: p.id,
                label: `${p.name}${p.rif ? ` - ${p.rif}` : ''}`,
              }))}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="N° de Siniestro"
                value={data.n_claim}
                onChange={(e) => setData({ ...data, n_claim: e.target.value })}
                disabled={isReadOnly}
              />
              <Select
                label="Tipo (Fact / Prof)"
                value={data.type}
                onChange={(e) => setData({ ...data, type: e.target.value })}
                disabled={isReadOnly}
                options={[
                  { label: 'DNF', value: 'DNF' },
                  { label: 'FACTURA', value: 'FACTURA' },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="N° de Factura"
                value={data.n_billing}
                onChange={(e) => setData({ ...data, n_billing: e.target.value })}
                disabled={isReadOnly}
              />
              <Input
                label="N° de Control"
                value={data.n_control}
                onChange={(e) => setData({ ...data, n_control: e.target.value })}
                disabled={isReadOnly}
              />
            </div>

            <Select
              label="Moneda"
              value={data.currency_type}
              onChange={(e) => setData({ ...data, currency_type: e.target.value })}
              disabled={isReadOnly}
              options={[
                { label: 'Dólares (USD)', value: 'USD' },
                { label: 'Bolívares (VES)', value: 'VES' },
              ]}
            />

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto Total Facturado</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="0,00"
                  disabled={isReadOnly}
                  value={isReadOnly ? formatCurrency(data.total_billing) : data.total_billing}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setData({ ...data, total_billing: val });
                  }}
                  className={`w-full px-4 py-2.5 pr-12 bg-white border border-slate-200 rounded-lg outline-none transition-all
                    ${isReadOnly ? 'bg-slate-50 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}
                    appearance-none`}
                />
                <span className="absolute right-3 flex items-center pointer-events-none text-xs font-bold text-slate-400 uppercase">
                  {data.currency_type}
                </span>
              </div>
            </div>

            <div className="md:col-span-2 bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-tight mb-1">
                  Analista Receptor
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm font-semibold text-slate-700">
                    {currentBill ? getAnalystName() : 'Pendiente por asignar'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 italic max-w-[150px] text-right">
                Se asignará automáticamente al guardar la recepción.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isDisabled}
          className={`min-w-[200px] py-2.5 rounded-lg shadow-sm font-bold transition-all active:scale-95
            ${isDisabled
              ? 'bg-[#7EB2F8] text-white border-0 cursor-not-allowed'
              : 'hover:shadow-md bg-[#1a56ff] hover:bg-[#0044ff] text-white'
            }`}
        >
          {isReadOnly ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              MODO LECTURA
            </span>
          ) : (
            isNewBill ? 'Crear Factura' : 'Guardar Recepción'
          )}
        </Button>
      </div>
    </form>
  );
}
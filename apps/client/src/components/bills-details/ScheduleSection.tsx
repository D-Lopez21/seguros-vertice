import { Button, Select } from '../common';
import Modal from './BillModal';
import { useState } from 'react';

const ADMIN_DECISIONS = ['PROGRAMADO', 'DEVUELTO'];

export default function ScheduleSection({
  data,
  setData,
  onSave,
  billExists,
  loading,
  allUsers,
  canEdit,
  userRole,
  billState,
  currentBill,
}: any) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'info' | 'error' | 'success' | 'warning'>('info');

  const showModal = (message: string, type: 'info' | 'error' | 'success' | 'warning' = 'warning') => {
    setModalMessage(message);
    setModalType(type);
    setModalOpen(true);
  };

  if (!billExists) {
    return (
      <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
        <p className="text-sm font-medium">Primero crea la factura en la sección RECEPCIÓN</p>
      </div>
    );
  }

  const isReadOnly = !canEdit;
  const isDevuelto = billState === 'devuelto';
  const isDisabled = loading || isReadOnly || !data.decision_adm;

  const getProgramadorName = () => {
    if (!currentBill?.analyst_schedule) return 'No asignado';
    const programador = allUsers?.find((u: any) => u.id === currentBill.analyst_schedule);
    return programador?.name || 'Desconocido';
  };

  const getFechaProgramacion = () => {
    if (!currentBill?.programmed_date) return 'Pendiente';
    const fechaLimpia = currentBill.programmed_date.replace(/-/g, '\/');
    return new Date(fechaLimpia).toLocaleDateString('es-ES');
  };

  return (
    <>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} message={modalMessage} type={modalType} />
      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isReadOnly) { showModal('No tienes permisos para guardar cambios en esta sección', 'warning'); return; }
          if (!data.decision_adm) { showModal('Por favor, completa todos los campos requeridos antes de guardar.', 'warning'); return; }
          onSave(data);
        }}
        className="space-y-6"
      >
        {isReadOnly && !isDevuelto && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 shadow-sm rounded-r-lg flex items-center">
            <div className="ml-3">
              <p className="text-sm text-amber-800">
                Usted está en modo <span className="font-bold">Vista Previa</span>. Su rol actual (<span className="font-mono bg-amber-100 px-1 rounded">{userRole}</span>) no permite editar esta sección.
              </p>
            </div>
          </div>
        )}

        {isDevuelto && userRole === 'admin' && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 shadow-sm rounded-r-lg flex items-center">
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                <span className="font-bold">Privilegio de administrador:</span> Esta factura está marcada como DEVUELTA. 
                Puedes cambiar la decisión administrativa a PROGRAMADO si es necesario para reactivar el proceso.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-white px-6 py-4">
            <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Detalles de la Programación
            </h3>
          </div>

          <div className="p-8 space-y-7">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Fecha de Programación</label>
                <input
                  type="text"
                  value={getFechaProgramacion()}
                  readOnly
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed outline-none"
                />
              </div>

              <Select
                label="Decisión ADM *"
                value={data.decision_adm}
                onChange={(e) => setData({ ...data, decision_adm: e.target.value })}
                disabled={isReadOnly}
                options={ADMIN_DECISIONS.map(decision => ({ value: decision, label: decision }))}
              />

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Analista Programador</label>
                <div className="flex items-center gap-2 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                  <span className="text-sm font-bold text-slate-700">{getProgramadorName()}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-lg p-5">
              <p className="text-[11px] text-slate-400 italic text-center leading-tight">
                La fecha y el analista se asignan automáticamente al usuario que guarda la programación.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isDisabled}
            className={`min-w-[220px] py-3 rounded-lg shadow-sm font-bold transition-all
              ${isDisabled
                ? 'bg-[#7EB2F8] text-white border-0 cursor-not-allowed'
                : 'bg-[#1a56ff] hover:bg-[#0044ff] text-white'
              }`}
          >
            {isReadOnly ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                MODO LECTURA
              </span>
            ) : 'Guardar Programación'}
          </Button>
        </div>
      </form>
    </>
  );
}
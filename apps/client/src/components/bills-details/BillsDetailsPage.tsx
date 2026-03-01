import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, TabSelector } from '../common';
import BillModal from './BillModal';
import type {
  AuditoriaData,
  Bill,
  EjecucionData,
  FiniquitoData,
  LiquidacionData,
  ProgramacionData,
  RecepcionData,
  SectionId,
} from './interfaces';
import { useGetAllUsers } from '../../hooks/useGetAllUsers';
import { useGetAllProviders } from '../../hooks/useGetAllProviders';
import FinishSection from './FinishSection';
import PaymentSection from './PaymentSection';
import ScheduleSection from './ScheduleSection';
import AuditSection from './AuditSection';
import LiquidationSection from './LiquidationSection';
import ReceptionSection from './ReceptionSection';

const formatDateForInput = (dateString: string | null) => {
  if (!dateString) return '';
  return dateString.split('T')[0];
};

export default function BillsDetailsPage({
  billId,
}: {
  billId?: string | null;
}) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = React.useState<SectionId>('recepcion');
  const { providers } = useGetAllProviders();
  const { users: allUsers } = useGetAllUsers();

  const [currentUserRole, setCurrentUserRole] = React.useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [currentBill, setCurrentBill] = React.useState<Bill | null>(null);
  const [loading, setLoading] = React.useState(false);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMessage, setModalMessage] = React.useState('');
  const [modalType, setModalType] = React.useState<'info' | 'error' | 'success' | 'warning'>('info');

  const showModal = (message: string, type: 'info' | 'error' | 'success' | 'warning' = 'warning') => {
    setModalMessage(message);
    setModalType(type);
    setModalOpen(true);
  };

  // --- ESTADOS DE SECCIONES ---
  const [recepcionData, setRecepcionData] = React.useState<RecepcionData>({
    arrival_date: '',
    suppliers_id: '',
    n_claim: '',
    type: '',
    n_billing: '',
    n_control: '',
    currency_type: '',
    total_billing: '',
    analyst_receptor_id: '',
  });

  const [liquidacionData, setLiquidacionData] = React.useState<LiquidacionData>({
    fecha_liquidacion: '',
    tipo_siniestro: '',
    monto_fact: '',
    monto_amp: '0',
    gna: '0',
    honorarios_medic: '0',
    servicios_clinicos: '0',
    retention_rate: '0',
    monto_indemniz: '0',
    nomenclature_pile: '',
    analyst_liquidador: '',
  });

  const [auditoriaData, setAuditoriaData] = React.useState<AuditoriaData>({
    fecha_auditoria: '',
    auditor: '',
  });

  const [programacionData, setProgramacionData] = React.useState<ProgramacionData>({
    fecha_programacion: '',
    decision_adm: '',
    analyst_programador: '',
  });

  const [ejecucionData, setEjecucionData] = React.useState<EjecucionData>({
    fecha_pago: '',
    monto_bs: '',
    tcr: '',
    ref_en_dolares: '',
    ref_bancaria: '',
    diferencia_vertice: '',
    diferencia_proveedor: '',
    analyst_pagador: '',
  });

  const [finiquitoData, setFiniquitoData] = React.useState<FiniquitoData>({
    fecha_envio: '',
    analyst_finiquito: '',
  });

  // --- CARGA DE USUARIO Y PERMISOS ---
  React.useEffect(() => {
    const loadCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from('profile')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile) setCurrentUserRole(profile.role);
      }
    };
    loadCurrentUser();
  }, []);

  const canEditSection = (section: SectionId): boolean => {
    if (!currentUserRole) return false;
    if (currentBill?.state === 'devuelto') {
      if (currentUserRole === 'admin' && section === 'programacion') return true;
      return false;
    }
    if (currentUserRole === 'admin') return true;
    const sectionRoleMap: Record<SectionId, string[]> = {
      recepcion: ['recepcion'],
      liquidacion: ['liquidacion'],
      auditoria: ['auditoria'],
      programacion: ['programacion'],
      ejecucion: ['pagos'],
      finiquito: ['finiquito'],
    };
    return sectionRoleMap[section]?.includes(currentUserRole) || false;
  };

  const isPreviousSectionCompleted = (section: string): { valid: boolean; message: string } => {
    if (!currentBill) return { valid: true, message: '' };
    const validations: Record<string, { valid: boolean; message: string }> = {
      recepcion: { valid: true, message: '' },
      liquidacion: {
        valid: !!currentBill.analyst_receptor_id,
        message: 'Debes completar primero la sección de RECEPCIÓN.'
      },
      auditoria: {
        valid: !!currentBill.analyst_severance,
        message: 'Debes completar primero la sección de LIQUIDACIÓN.'
      },
      programacion: {
        valid: !!currentBill.auditor,
        message: 'Debes completar primero la sección de AUDITORÍA.'
      },
      ejecucion: {
        valid: !!currentBill.analyst_schedule,
        message: 'Debes completar primero la sección de PROGRAMACIÓN.'
      },
      finiquito: {
        valid: !!currentBill.analyst_paid,
        message: 'Debes completar primero la sección de EJECUCIÓN.'
      }
    };
    return validations[section] || { valid: true, message: '' };
  };

  const loadBillData = async (id: string) => {
    if (!id || id === 'create-bill') return;
    try {
      setLoading(true);
      const { data, error } = await supabase.from('bills').select('*').eq('id', id).single();
      if (error) throw error;
      if (data) {
        setCurrentBill(data);
        setRecepcionData({
          arrival_date: formatDateForInput(data.arrival_date),
          suppliers_id: data.suppliers_id || '',
          n_claim: data.n_claim || '',
          type: data.type || '',
          n_billing: data.n_billing || '',
          n_control: data.n_control || '',
          currency_type: data.currency_type || '',
          total_billing: data.total_billing || '',
          analyst_receptor_id: data.analyst_receptor_id || '',
        });

        setLiquidacionData({
          fecha_liquidacion: data.severance_date ? formatDateForInput(data.severance_date) : '',
          tipo_siniestro: data.claim_type || '',
          monto_fact: data.total_billing != null ? String(data.total_billing) : '',
          monto_amp: data.monto_amp != null ? String(data.monto_amp) : '0',
          gna: data.gna != null ? String(data.gna) : '0',
          honorarios_medic: data.medical_honoraries != null ? String(data.medical_honoraries) : '0',
          servicios_clinicos: data.clinical_services != null ? String(data.clinical_services) : '0',
          retention_rate: data.retention_rate != null ? String(data.retention_rate) : '0',
          monto_indemniz: data.indemnizable_rate != null ? String(data.indemnizable_rate) : '0',
          nomenclature_pile: data.nomenclature_pile || '',
          analyst_liquidador: data.analyst_severance || '',
        });

        setAuditoriaData({
          fecha_auditoria: data.audit_date ? formatDateForInput(data.audit_date) : '',
          auditor: data.auditor || '',
        });

        setProgramacionData({
          fecha_programacion: data.programmed_date ? formatDateForInput(data.programmed_date) : '',
          decision_adm: data.admin_decision || '',
          analyst_programador: data.analyst_schedule || '',
        });

        setEjecucionData({
          fecha_pago: data.paid_date ? formatDateForInput(data.paid_date) : '',
          monto_bs: data.bs_amount != null ? String(data.bs_amount) : '',
          tcr: data.tcr_amount != null ? String(data.tcr_amount) : '',
          ref_en_dolares: data.dollar_amount != null ? String(data.dollar_amount) : '',
          ref_bancaria: data.transfer_ref || '',
          diferencia_vertice: data.vertice_difference != null ? String(data.vertice_difference) : '',
          diferencia_proveedor: data.provider_difference != null ? String(data.provider_difference) : '',
          analyst_pagador: data.analyst_paid || '',
        });

        setFiniquitoData({
          fecha_envio: data.settlement_date ? formatDateForInput(data.settlement_date) : '',
          analyst_finiquito: data.analyst_settlement || '',
        });
      }
    } catch (error: any) {
      console.error('Error loading bill:', error.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (billId && billId !== 'create-bill') loadBillData(billId);
  }, [billId]);

  const handleSaveSection = async (section: string, sectionData: any) => {
    try {
      setLoading(true);
      const isCreating = !billId || billId === 'create-bill';

      if (!isCreating && section !== 'recepcion') {
        const validation = isPreviousSectionCompleted(section);
        if (!validation.valid) {
          showModal(validation.message, 'warning');
          setLoading(false);
          return;
        }
      }

      if (section === 'recepcion') {
        const amount = parseFloat(sectionData?.total_billing);
        if (isNaN(amount) || amount <= 0) {
          showModal('El monto debe ser mayor a 0.', 'error');
          setLoading(false);
          return;
        }

        // ─── Validación: n_billing único por proveedor ───────────────────────
        const { data: duplicates, error: dupError } = await supabase
          .from('bills')
          .select('id')
          .eq('n_billing', sectionData?.n_billing)
          .eq('suppliers_id', sectionData?.suppliers_id)
          .neq('id', billId ?? '')   // al editar, excluye la propia factura
          .limit(1);

        if (dupError) throw dupError;

        if (duplicates && duplicates.length > 0) {
          showModal(
            `El número de factura "${sectionData?.n_billing}" ya existe para este proveedor.`,
            'error'
          );
          setLoading(false);
          return;
        }
        // ────────────────────────────────────────────────────────────────────

        if (isCreating) {
          const { data: newBill, error } = await supabase
            .from('bills')
            .insert([{
              arrival_date: sectionData?.arrival_date || new Date().toISOString(),
              suppliers_id: sectionData?.suppliers_id || null,
              n_claim: sectionData?.n_claim || '',
              type: sectionData?.type === 'DNF' ? 'DNF' : 'FACTURA',
              n_billing: sectionData?.n_billing || '',
              n_control: sectionData?.n_control || '',
              currency_type: sectionData?.currency_type === 'USD' ? 'USD' : 'VES',
              total_billing: amount,
              analyst_receptor_id: currentUserId,
              state: 'recibida',
              state_sequence: 'recepcion',
              active: true,
            }])
            .select().single();
          if (error) throw error;
          showModal('Factura creada', 'success');
          navigate(`/bills/${newBill.id}`, { replace: true });
        } else {
          const { error } = await supabase
            .from('bills')
            .update({
              arrival_date: sectionData?.arrival_date,
              suppliers_id: sectionData?.suppliers_id,
              n_claim: sectionData?.n_claim,
              type: sectionData?.type === 'DNF' ? 'DNF' : 'FACTURA',
              n_billing: sectionData?.n_billing,
              n_control: sectionData?.n_control,
              currency_type: sectionData?.currency_type,
              total_billing: amount,
              analyst_receptor_id: currentUserId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', billId);
          if (error) throw error;
          showModal('RECEPCION actualizada', 'success');
          await loadBillData(billId);
        }
      } else if (!isCreating && billId) {
        let updatePayload = {};

        if (section === 'liquidacion') {
          updatePayload = {
            severance_date: new Date().toISOString(),
            claim_type: sectionData?.tipo_siniestro || null,
            monto_amp: parseFloat(sectionData?.monto_amp) || 0,
            gna: parseFloat(sectionData?.gna) || 0,
            medical_honoraries: parseFloat(sectionData?.honorarios_medic) || 0,
            clinical_services: parseFloat(sectionData?.servicios_clinicos) || 0,
            indemnizable_rate: parseFloat(sectionData?.monto_indemniz) || 0,
            nomenclature_pile: sectionData?.nomenclature_pile || null,
            analyst_severance: currentUserId,
            state: 'pendiente',
            state_sequence: 'liquidacion',
          };
        } else if (section === 'auditoria') {
          updatePayload = {
            audit_date: new Date().toISOString(),
            auditor: currentUserId,
            state: 'pendiente',
            state_sequence: 'auditoria',
          };
        } else if (section === 'programacion') {
          const newState = sectionData?.decision_adm === 'DEVUELTO' ? 'devuelto' : 'programado';
          updatePayload = {
            programmed_date: new Date().toISOString(),
            admin_decision: sectionData?.decision_adm || null,
            analyst_schedule: currentUserId,
            state: newState,
            state_sequence: 'programacion',
          };
        } else if (section === 'ejecucion') {
          updatePayload = {
            paid_date: new Date().toISOString(),
            bs_amount: parseFloat(sectionData?.monto_bs) || 0,
            tcr_amount: parseFloat(sectionData?.tcr) || 0,
            dollar_amount: parseFloat(sectionData?.ref_en_dolares) || 0,
            transfer_ref: sectionData?.ref_bancaria || null,
            vertice_difference: parseFloat(sectionData?.diferencia_vertice) || 0,
            provider_difference: parseFloat(sectionData?.diferencia_proveedor) || 0,
            analyst_paid: currentUserId,
            state: 'pagado',
            state_sequence: 'pagos',
          };
        } else if (section === 'finiquito') {
          updatePayload = {
            settlement_date: new Date().toISOString(),
            analyst_settlement: currentUserId,
            state: 'pagado',
            state_sequence: 'finiquito',
          };
        }

        const { error } = await supabase
          .from('bills')
          .update({ ...updatePayload, updated_at: new Date().toISOString() })
          .eq('id', billId);

        if (error) throw error;
        showModal(`${section.toUpperCase()} guardada`, 'success');
        await loadBillData(billId);
      }
    } catch (error: any) {
      showModal('Error al guardar: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'recepcion' as SectionId, label: 'RECEPCION' },
    { id: 'liquidacion' as SectionId, label: 'LIQUIDACION' },
    { id: 'auditoria' as SectionId, label: 'AUDITORIA' },
    { id: 'programacion' as SectionId, label: 'PROGRAMACION' },
    { id: 'ejecucion' as SectionId, label: 'EJECUCION' },
    { id: 'finiquito' as SectionId, label: 'FINIQUITO' },
  ];

  const billExists = !!billId && billId !== 'create-bill';

  // ── Título dinámico según rol ──────────────────────────────────────────────
  const isProveedor = currentUserRole === 'proveedor';
  const pageTitle = isProveedor
    ? 'Factura'
    : billExists ? 'Editar Factura' : 'Nueva Factura';

  return (
    <DashboardLayout title={pageTitle} returnTo="/bills">
      <BillModal isOpen={modalOpen} onClose={() => setModalOpen(false)} message={modalMessage} type={modalType} />
      <TabSelector sections={sections} activeSection={activeSection} onSectionChange={setActiveSection} />
      <div className="min-h-100 p-4">
        {currentBill?.state === 'devuelto' && (
          <div className="bg-red-50 border-2 border-red-400 rounded-lg p-6 mb-6 text-red-800">
            <h3 className="text-lg font-bold">⚠️ FACTURA DEVUELTA</h3>
            <p>Decision administrativa irreversible para analistas.</p>
          </div>
        )}

        {activeSection === 'recepcion' && (
          <ReceptionSection
            data={recepcionData}
            setData={setRecepcionData}
            providers={providers}
            allUsers={allUsers}
            onSave={(sectionData: any) => handleSaveSection('recepcion', sectionData)}
            isNewBill={!billExists}
            loading={loading}
            canEdit={canEditSection('recepcion')}
            userRole={currentUserRole}
            billState={currentBill?.state}
            currentUserId={currentUserId}
            currentBill={currentBill}
          />
        )}

        {activeSection === 'liquidacion' && (
          <LiquidationSection
            data={liquidacionData}
            setData={setLiquidacionData}
            onSave={(sectionData: any) => handleSaveSection('liquidacion', sectionData)}
            billExists={billExists}
            loading={loading}
            allUsers={allUsers}
            canEdit={canEditSection('liquidacion')}
            userRole={currentUserRole}
            billState={currentBill?.state}
            currentUserId={currentUserId}
            currentBill={currentBill}
          />
        )}

        {activeSection === 'auditoria' && (
          <AuditSection
            data={auditoriaData}
            setData={setAuditoriaData}
            onSave={(sectionData: any) => handleSaveSection('auditoria', sectionData)}
            billExists={billExists}
            loading={loading}
            allUsers={allUsers}
            canEdit={canEditSection('auditoria')}
            userRole={currentUserRole}
            billState={currentBill?.state}
            currentUserId={currentUserId}
            currentBill={currentBill}
          />
        )}

        {activeSection === 'programacion' && (
          <ScheduleSection
            data={programacionData}
            setData={setProgramacionData}
            onSave={(sectionData: any) => handleSaveSection('programacion', sectionData)}
            billExists={billExists}
            loading={loading}
            allUsers={allUsers}
            canEdit={canEditSection('programacion')}
            userRole={currentUserRole}
            billState={currentBill?.state}
            currentUserId={currentUserId}
            currentBill={currentBill}
          />
        )}

        {activeSection === 'ejecucion' && (
          <PaymentSection
            data={ejecucionData}
            setData={setEjecucionData}
            onSave={(sectionData: any) => handleSaveSection('ejecucion', sectionData)}
            billExists={billExists}
            loading={loading}
            allUsers={allUsers}
            canEdit={canEditSection('ejecucion')}
            userRole={currentUserRole}
            billState={currentBill?.state}
            currentUserId={currentUserId}
            currentBill={currentBill}
          />
        )}

        {activeSection === 'finiquito' && (
          <FinishSection
            data={finiquitoData}
            setData={setFiniquitoData}
            onSave={(sectionData: any) => handleSaveSection('finiquito', sectionData)}
            billExists={billExists}
            loading={loading}
            allUsers={allUsers}
            canEdit={canEditSection('finiquito')}
            userRole={currentUserRole}
            billState={currentBill?.state}
            currentUserId={currentUserId}
            currentBill={currentBill}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
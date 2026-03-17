export interface RecepcionData {
  arrival_date: string;
  suppliers_id: string;
  n_claim: string;
  type: string;
  n_billing: string;
  n_control: string;
  currency_type: string;
  total_billing: string;
  analyst_receptor_id: string;
}

export interface LiquidacionData {
  fecha_liquidacion: string;
  tipo_siniestro: string;
  monto_fact: string;
  monto_amp: string;
  gna: string;
  honorarios_medic: string;
  servicios_clinicos: string;
  retention_rate: string;
  monto_indemniz: string;
  nomenclature_pile: string;
  analyst_liquidador: string;
}

export interface AuditoriaData {
  fecha_auditoria: string;
  auditor: string;
}

export interface ProgramacionData {
  fecha_programacion: string;
  decision_adm: string;
  analyst_programador: string;
}

export interface EjecucionData {
  fecha_pago: string;
  monto_bs: string;
  tcr: string;
  ref_en_dolares: string;
  ref_bancaria: string;
  diferencia_vertice: string;
  diferencia_proveedor: string;
  analyst_pagador: string;
}

export interface FiniquitoData {
  fecha_envio: string;
  analyst_finiquito: string;
}

export type SectionId =
  | 'recepcion'
  | 'liquidacion'
  | 'auditoria'
  | 'programacion'
  | 'ejecucion'
  | 'finiquito';

export interface Bill {
  id: string;
  arrival_date?: string;
  suppliers_id?: string;
  n_claim?: string;
  type?: string;
  n_billing?: string;
  n_control?: string;
  currency_type?: string;
  total_billing?: string;
  analyst_receptor_id?: string;
  fecha_liquidacion?: string;
  tipo_siniestro?: string;
  monto_fact?: string;
  monto_amp?: string;
  gna?: string;
  honorarios_medic?: string;
  servicios_clinicos?: string;
  retention_rate?: string;
  monto_indemniz?: string;
  nomenclature_pile?: string;
  analyst_severance?: string;
  fecha_auditoria?: string;
  auditor?: string;
  fecha_programacion?: string;
  decision_adm?: string;
  analyst_schedule?: string;
  fecha_pago?: string;
  monto_bs?: string;
  tcr?: string;
  ref_en_dolares?: string;
  ref_bancaria?: string;
  diferencia_vertice?: string;
  diferencia_proveedor?: string;
  analyst_pagador?: string;
  fecha_envio?: string;
  analyst_paid?: string;
  analyst_settlement?: string;
  state?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Modal, Input, Button } from './common';
import type { Profile } from '../contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userToEdit: Profile | null;
  onUpdate: (id: string, data: any) => Promise<boolean>;
  onRefresh: () => void;
}

const ROLES = [
  { value: 'recepcion',    label: 'Recepción' },
  { value: 'liquidacion',  label: 'Liquidación' },
  { value: 'auditoria',    label: 'Auditoría' },
  { value: 'programacion', label: 'Programación' },
  { value: 'pagos',        label: 'Pagos' },
  { value: 'finiquito',    label: 'Finiquito' },
  { value: 'admin',        label: 'Administrador' },
];

export default function UserRegistrationModal({ isOpen, onClose, userToEdit, onUpdate, onRefresh }: Props) {

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [roles, setRoles] = React.useState<string[]>(['recepcion']);
  const [active, setActive] = React.useState(true);

  React.useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name || '');
      setRoles(userToEdit.roles?.length ? userToEdit.roles : ['recepcion']);
      setActive(userToEdit.active ?? true);
      setEmail((userToEdit as any).email || '');
    } else {
      setName('');
      setEmail('');
      setRoles(['recepcion']);
      setActive(true);
    }
    setError(null);
  }, [userToEdit, isOpen]);

  const toggleRole = (value: string) => {
    setRoles(prev =>
      prev.includes(value)
        ? prev.filter(r => r !== value)
        : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (roles.length === 0) {
      setError('Debes seleccionar al menos un rol.');
      return;
    }

    setLoading(true);

    try {
      if (userToEdit) {
        // --- EDITAR usuario existente ---
        const success = await onUpdate(userToEdit.id, { name, roles, active });
        if (success) onClose();

      } else {
        // --- INVITAR nuevo usuario via Edge Function ---
        const { data, error: fnError } = await supabase.functions.invoke('invite-user', {
          body: { email, name, roles, active },
        });

        if (fnError) {
          // Capturar mensaje detallado devuelto por la Edge Function (400 / 500)
          if (fnError instanceof FunctionsHttpError) {
            try {
              const details: any = await fnError.context.json();
              if (details?.error) {
                throw new Error(details.error);
              }
            } catch {
              // Si algo falla al leer el JSON, seguimos con el mensaje genérico
            }
          }
          throw new Error(fnError.message);
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        onRefresh();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={userToEdit ? 'Editar Usuario' : 'Nuevo Usuario'}>
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <Input
          label="Nombre Completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Ej. Juan Pérez"
        />

        <Input
          label="Correo Electrónico"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={!!userToEdit}
          placeholder="correo@ejemplo.com"
        />

        {/* Nota informativa — sin campo de contraseña porque se envía por correo */}
        {!userToEdit && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
            <svg className="size-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            </svg>
            El usuario recibirá un correo de invitación para establecer su propia contraseña.
          </div>
        )}

        {/* Checkboxes de roles múltiples */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-neutral-700">
            Roles del Sistema
            <span className="ml-1 text-xs font-normal text-neutral-400">(puedes seleccionar varios)</span>
          </label>
          <div className="grid grid-cols-2 gap-2 p-3 border border-neutral-200 rounded-xl bg-white">
            {ROLES.map(({ value, label }) => (
              <label
                key={value}
                className={`flex items-center gap-2 cursor-pointer text-sm px-2 py-1.5 rounded-lg transition-colors
                  ${roles.includes(value)
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={roles.includes(value)}
                  onChange={() => toggleRole(value)}
                  className="size-4 accent-blue-600 cursor-pointer"
                />
                {label}
              </label>
            ))}
          </div>
          {roles.length === 0 && (
            <p className="text-xs text-red-500 mt-1">Selecciona al menos un rol.</p>
          )}
        </div>

        <div className="flex items-center gap-3 p-2 bg-neutral-50 rounded-lg">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="size-4 accent-blue-600 cursor-pointer"
            id="active-check"
          />
          <label htmlFor="active-check" className="text-sm font-medium text-neutral-600 cursor-pointer select-none">
            Este usuario está activo en el sistema
          </label>
        </div>

        {/* Mensaje de error inline */}
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={loading} disabled={roles.length === 0}>
            {userToEdit ? 'Guardar Cambios' : 'Enviar Invitación'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

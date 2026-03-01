/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
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

export default function UserRegistrationModal({ isOpen, onClose, userToEdit, onUpdate, onRefresh }: Props) {
  const [loading, setLoading] = React.useState(false);
  
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<any>('recepcion');
  const [active, setActive] = React.useState(true);

  React.useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name || '');
      setRole(userToEdit.role || 'recepcion');
      setActive(userToEdit.active ?? true);
      setEmail((userToEdit as any).email || '');
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setRole('recepcion');
      setActive(true);
    }
  }, [userToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (userToEdit) {
        const success = await onUpdate(userToEdit.id, { name, role, active });
        if (success) onClose();
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, role } }
        });
        if (authError) throw authError;

        if (authData.user) {
          await supabase.from('profile').insert([{
            id: authData.user.id,
            name,
            email,
            role,
            active,
            password_change_required: true
          }]);
        }
        alert("¡Usuario creado exitosamente!");
        onRefresh();
        onClose();
      }
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={userToEdit ? "Editar Usuario" : "Nuevo Usuario"}>
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

        {!userToEdit && (
          <Input 
            label="Contraseña Temporal" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        )}
        
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-neutral-700">Rol del Sistema</label>
          <select 
            className="w-full h-11 rounded-xl border border-neutral-200 bg-white px-4 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all cursor-pointer"
            value={role} 
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="recepcion">Recepción</option>
            <option value="liquidacion">Liquidación</option>
            <option value="auditoria">Auditoría</option>
            <option value="programacion">Programación</option>
            <option value="pagos">Pagos</option>
            <option value="finiquito">Finiquito</option>
            <option value="admin">Administrador</option>
          </select>
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

        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={loading}>
            {userToEdit ? "Guardar Cambios" : "Crear Usuario"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
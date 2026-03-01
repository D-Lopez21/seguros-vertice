/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useCreateProvider } from '../hooks/useCreateProvider';
import { Button, Input, Modal } from './common';
import type { Profile } from '../contexts/AuthContext'; // 👈 Fíjate en el 'type'

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onProviderRegistered: () => void;
  providerToEdit?: Profile | null;
  onUpdate?: (id: string, data: Partial<Profile>) => Promise<boolean>;
};

export default function ProviderRegistrationModal({ isOpen, onClose, onProviderRegistered, providerToEdit, onUpdate }: Props) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [rif, setRif] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { inviteSupplier } = useCreateProvider();

  useEffect(() => {
    if (providerToEdit) {
      setFullName(providerToEdit.name || '');
      setEmail(providerToEdit.email || '');
      setRif(providerToEdit.rif || '');
    } else {
      setEmail(''); setFullName(''); setRif('');
    }
    setError(null);
  }, [providerToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (providerToEdit && onUpdate) {
        await onUpdate(providerToEdit.id, { name: fullName, rif });
        onClose();
      } else {
        await inviteSupplier({ email, fullName, rif });
        onProviderRegistered();
        onClose();
      }
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={providerToEdit ? "Editar Proveedor" : "Invitar Proveedor"}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {error && <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md">{error}</div>}
        <Input label="Nombre o Razón Social" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input type="email" label="Correo" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!providerToEdit} />
        <Input label="RIF" required value={rif} onChange={(e) => setRif(e.target.value.toUpperCase())} />
        <div className="flex justify-end gap-4 mt-4 border-t pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={loading}>{providerToEdit ? "Guardar" : "Enviar Invitación"}</Button>
        </div>
      </form>
    </Modal>
  );
}
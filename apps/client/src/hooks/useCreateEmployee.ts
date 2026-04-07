/* eslint-disable @typescript-eslint/no-explicit-any */
/* src/hooks/useCreateEmployee.ts */
import { useState } from 'react';

export const useCreateEmployee = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteUser = async (
    email: string, 
    fullName: string, 
    role: string,
    rif?: string // 👈 Nuevo parámetro opcional para proveedores
  ) => {
    setLoading(true);
    setError(null);

    try {
      const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
      const inviteSecret = import.meta.env.VITE_INVITE_SECRET;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Validación de variables de entorno
      if (!functionsUrl || !inviteSecret || !anonKey) {
        throw new Error('Faltan variables de entorno necesarias');
      }

      // Construir el body con el RIF solo si está presente
      const requestBody: {
        email: string;
        fullName: string;
        role: string;
        rif?: string;
      } = {
        email,
        fullName,
        role,
      };

      // Agregar RIF solo si se proporciona
      if (rif) {
        requestBody.rif = rif;
      }

      const res = await fetch(`${functionsUrl}/invite-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
          "x-invite-secret": inviteSecret
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        let errorMessage = 'Error al invitar al usuario';
        try {
          const data = await res.json();
          errorMessage = data.error || data.message || errorMessage;
        } catch {
          errorMessage = `Error ${res.status}: ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      return data;

    } catch (err: any) {
      console.error('Error invitando usuario:', err);
      const errorMsg = err.message || 'Error desconocido';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { inviteUser, loading, error };
};
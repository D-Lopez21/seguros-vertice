/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import { supabase } from '../lib/supabase';

export const useRegistration = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const signUp = async (email: string, pass: string, fullName: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            name: fullName,
            role: 'admin', 
          },
        },
      });

      if (signUpError) throw signUpError;
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { signUp, loading, error };
};

import { supabase } from '../lib/supabase';

export function useSignOut() {
  const signOutFunction = async () => {
    try {
      // 1. Intentamos cerrar sesión en Supabase
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
    } finally {
      // 2. PASE LO QUE PASE, limpiamos el rastro local
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/sign-in';
    }
  };
  return signOutFunction;
}

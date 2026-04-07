/* src/pages/ResetPassword.tsx */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatingToken, setValidatingToken] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const handleAuth = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        // Capturar sesión desde el hash de la URL (flujo de recuperación/invitación)
        if (accessToken && refreshToken && (type === 'recovery' || type === 'invite')) {
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (setSessionError) throw setSessionError;

          if (data.session && isMounted) {
            setIsReady(true);
            setValidatingToken(false);
            // Limpiar hash para seguridad
            window.history.replaceState(null, '', window.location.pathname);
            return;
          }
        }

        // Verificar si ya existe una sesión activa
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          setIsReady(true);
          setValidatingToken(false);
          return;
        }

        if (isMounted) {
          setError('El enlace ha expirado o es inválido. Solicita uno nuevo.');
          setValidatingToken(false);
        }
      } catch (err: any) {
        if (!isMounted) return;

        // AbortError suele ocurrir cuando la petición se cancela por el navegador.
        const isAbort =
          err?.name === 'AbortError' ||
          typeof err?.message === 'string' && err.message.toLowerCase().includes('aborted');

        if (isAbort) {
          setValidatingToken(false);
          return;
        }

        setError(err?.message || 'Error al validar la sesión');
        setValidatingToken(false);
      }
    };

    // Escuchar cambios de estado - AQUÍ DETECTAMOS EL USER_UPDATED Y REDIRIGIMOS
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && isMounted && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) {
        setIsReady(true);
        setValidatingToken(false);
      }
      
      // Cuando detectamos USER_UPDATED, significa que la contraseña se actualizó exitosamente
      if (event === 'USER_UPDATED' && session && isMounted) {
        if (session.user?.id) {
          supabase
            .from('profile')
            .update({ password_change_required: false })
            .eq('id', session.user.id);
        }

        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
    });

    handleAuth();
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones básicas de cliente
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Llamar a updateUser - NO esperamos la respuesta
      // porque onAuthStateChange manejará el evento USER_UPDATED
      supabase.auth.updateUser({
        password: password,
      }).then((result) => {
        if (result.error) {
          console.error('Error al actualizar contraseña:', result.error);
          setError(result.error.message);
          setLoading(false);
        }
        // Si es exitoso, el onAuthStateChange manejará la redirección
      }).catch((err) => {
        // AbortError suele ocurrir cuando la petición se cancela al cambiar de página o pestaña.
        const isAbort =
          err?.name === 'AbortError' ||
          typeof err?.message === 'string' && err.message.toLowerCase().includes('aborted');

        if (isAbort) {
          setLoading(false);
          return;
        }

        console.error('Error en updateUser:', err);
        setError(err?.message || 'Error al actualizar la contraseña');
        setLoading(false);
      });

    } catch (err: any) {
      console.error('Error en el proceso:', err);
      setError(err.message || 'Ocurrió un error al actualizar la contraseña');
      setLoading(false);
    }
  };

  // Pantalla de carga inicial
  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Validando acceso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Nueva Contraseña</h2>
          <p className="mt-2 text-sm text-gray-600">Introduce tu nueva clave de acceso</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
          <div className="rounded-md shadow-sm space-y-4">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Nueva contraseña"
            />
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Confirmar contraseña"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isReady}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 transition-colors"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </span>
            ) : 'Establecer Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
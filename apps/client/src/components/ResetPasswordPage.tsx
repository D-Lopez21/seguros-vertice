/* src/pages/ResetPassword.tsx */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CloseEyeIcon, OpenEyeIcon } from './icons';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatingToken, setValidatingToken] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const handleAuth = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (accessToken && refreshToken && (type === 'recovery' || type === 'invite')) {
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (setSessionError) throw setSessionError;

          if (data.session && isMounted) {
            setIsReady(true);
            setValidatingToken(false);
            window.history.replaceState(null, '', window.location.pathname);
            return;
          }
        }

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && isMounted && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) {
        setIsReady(true);
        setValidatingToken(false);
      }

      if (event === 'USER_UPDATED' && session && isMounted) {
        if (session.user?.id) {
          supabase
            .from('profile')
            .update({ password_change_required: false })
            .eq('id', session.user.id);
        }

        setSuccess(true);
        setLoading(false);

        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
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
      supabase.auth.updateUser({ password }).then((result) => {
        if (result.error) {
          setError(result.error.message);
          setLoading(false);
        }
      }).catch((err) => {
        const isAbort =
          err?.name === 'AbortError' ||
          typeof err?.message === 'string' && err.message.toLowerCase().includes('aborted');

        if (isAbort) {
          setLoading(false);
          return;
        }

        setError(err?.message || 'Error al actualizar la contraseña');
        setLoading(false);
      });

    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al actualizar la contraseña');
      setLoading(false);
    }
  };

  /* ── Fondo compartido ── */
  const background = (
    <>
      <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl animate-blob" />
      <div className="absolute top-40 right-20 w-40 h-40 bg-cyan-400/20 rounded-full blur-2xl animate-blob animation-delay-2000" />
      <div className="absolute bottom-20 left-1/3 w-36 h-36 bg-sky-400/20 rounded-full blur-2xl animate-blob animation-delay-4000" />
      <div className="absolute top-10 right-1/4 w-4 h-4 border-2 border-blue-400/40 rounded-full" />
      <div className="absolute bottom-1/4 left-10 w-6 h-6 border-2 border-cyan-400/40 rounded-full" />
      <div className="absolute top-1/3 right-10 w-3 h-3 bg-sky-400/40 rounded-full" />
    </>
  );

  /* ── Estado: validando token ── */
  if (validatingToken) {
    return (
      <div className="w-full h-dvh flex justify-center items-center bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 relative overflow-hidden">
        {background}
        <div className="relative flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Validando acceso...</p>
        </div>
      </div>
    );
  }

  /* ── Estado: token inválido/expirado ── */
  if (error && !isReady) {
    return (
      <div className="w-full h-dvh flex justify-center items-center p-4 bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 relative overflow-hidden">
        {background}
        <div className="relative w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl shadow-blue-500/10 p-8 sm:p-10 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Enlace inválido</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">{error}</p>
            <a
              href="/sign-in"
              className="inline-block w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-2xl shadow-lg transition-all duration-300"
            >
              Ir al inicio de sesión
            </a>
          </div>
        </div>
        {styles}
      </div>
    );
  }

  /* ── Estado: contraseña actualizada con éxito ── */
  if (success) {
    return (
      <div className="w-full h-dvh flex justify-center items-center p-4 bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 relative overflow-hidden">
        {background}
        <div className="relative w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl shadow-blue-500/10 p-8 sm:p-10 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">¡Contraseña actualizada!</h2>
            <p className="text-slate-500 text-sm leading-relaxed">Redirigiendo al sistema en unos segundos...</p>
            <div className="mt-5 flex justify-center">
              <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" />
            </div>
          </div>
        </div>
        {styles}
      </div>
    );
  }

  /* ── Estado principal: formulario ── */
  return (
    <div className="w-full h-dvh flex justify-center items-center p-4 bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 relative overflow-hidden">
      {background}

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl shadow-blue-500/10 p-8 sm:p-10 relative overflow-hidden transform hover:scale-[1.02] transition-transform duration-500">
          {/* Decorative corner accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-transparent rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-cyan-400/10 to-transparent rounded-tr-full" />

          {/* Header */}
          <div className="text-center mb-8 relative z-10">
            <div className="inline-block mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
              Nueva contraseña
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Introduce tu nueva clave de acceso
            </p>
          </div>

          <form className="space-y-4 relative z-10" onSubmit={handleResetPassword}>

            {/* Error */}
            {error && (
              <div className="p-4 text-sm text-red-700 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-3">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Campo: nueva contraseña */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 pr-11 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 focus:outline-none transition-colors"
                >
                  {passwordVisible ? <OpenEyeIcon /> : <CloseEyeIcon />}
                </button>
              </div>
            </div>

            {/* Campo: confirmar contraseña */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Confirmar contraseña</label>
              <div className="relative">
                <input
                  type={confirmVisible ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full px-4 py-3 pr-11 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setConfirmVisible(!confirmVisible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 focus:outline-none transition-colors"
                >
                  {confirmVisible ? <OpenEyeIcon /> : <CloseEyeIcon />}
                </button>
              </div>
            </div>

            {/* Botón */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !isReady}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Guardando...
                  </>
                ) : 'Establecer contraseña'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {styles}
    </div>
  );
}

const styles = (
  <style>{`
    @keyframes blob {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(30px, -30px) scale(1.1); }
      66% { transform: translate(-20px, 20px) scale(0.9); }
    }
    .animate-blob { animation: blob 7s infinite ease-in-out; }
    .animation-delay-2000 { animation-delay: 2s; }
    .animation-delay-4000 { animation-delay: 4s; }
  `}</style>
);

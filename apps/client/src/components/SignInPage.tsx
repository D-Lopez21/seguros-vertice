import React from 'react';
import { Button, Input } from './common';
import { CloseEyeIcon, OpenEyeIcon } from './icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function SignInPagePlayful() {
  const navigate = useNavigate();
  const { isLoading: authLoading } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [passwordVisible, setPasswordVisible] = React.useState(false);

  // Estados para UX
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // ✅ PASO 1: Limpiar cualquier sesión anterior
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      
      // ✅ PASO 2: Pequeño delay para asegurar que se limpió todo
      await new Promise(resolve => setTimeout(resolve, 300));

      // ✅ PASO 3: Iniciar sesión con las nuevas credenciales
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // ✅ PASO 4: Guardar el ID del nuevo usuario
      if (data.user) {
        localStorage.setItem('current_user_id', data.user.id);
      }

      console.log('✅ Login exitoso');
      navigate('/');
    } catch (error: any) {
      setErrorMsg(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-blue-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-dvh flex justify-center items-center p-4 bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 relative overflow-hidden">
      {/* Playful background shapes */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl animate-blob" />
      <div className="absolute top-40 right-20 w-40 h-40 bg-cyan-400/20 rounded-full blur-2xl animate-blob animation-delay-2000" />
      <div className="absolute bottom-20 left-1/3 w-36 h-36 bg-sky-400/20 rounded-full blur-2xl animate-blob animation-delay-4000" />
      
      {/* Decorative circles */}
      <div className="absolute top-10 right-1/4 w-4 h-4 border-2 border-blue-400/40 rounded-full" />
      <div className="absolute bottom-1/4 left-10 w-6 h-6 border-2 border-cyan-400/40 rounded-full" />
      <div className="absolute top-1/3 right-10 w-3 h-3 bg-sky-400/40 rounded-full" />

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl shadow-blue-500/10 p-8 sm:p-10 relative overflow-hidden transform hover:scale-[1.02] transition-transform duration-500">
          {/* Decorative corner accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-transparent rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-cyan-400/10 to-transparent rounded-tr-full" />
          
          {/* Header */}
          <div className="text-center mb-8 relative z-10">
            <div className="inline-block mb-4 animate-bounce-slow">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl rotate-12 flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white transform -rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
              ¡Hola de nuevo!
            </h1>
            <p className="text-slate-600 text-sm font-medium">
              Qué bueno verte por aquí
            </p>
          </div>

          <form className="space-y-5 relative z-10" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="p-4 text-sm text-blue-700 bg-blue-50 border-2 border-blue-200 rounded-2xl animate-wiggle flex items-start gap-3">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              <Input
                type="email"
                label="Correo electrónico"
                placeholder="tu@correo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                type={passwordVisible ? 'text' : 'password'}
                label="Contraseña"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="text-slate-400 hover:text-blue-500 focus:outline-none transition-all duration-200 hover:scale-110 active:scale-90"
                  >
                    {passwordVisible ? <OpenEyeIcon /> : <CloseEyeIcon />}
                  </button>
                }
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                isLoading={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0"
              >
                Entrar
              </Button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -30px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-2deg); }
          75% { transform: rotate(2deg); }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-blob {
          animation: blob 7s infinite ease-in-out;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-wiggle {
          animation: wiggle 0.5s ease-in-out;
        }

        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
import { useState } from 'react';
import { Button, DashboardLayout, Input } from './common';
import { useUpdatePassword } from '../hooks/useUpdatePassword';

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const { updatePassword, loading, error, success } = useUpdatePassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // 1. Validar que no estén vacíos
    if (!password || !confirmPassword) {
      setLocalError('Por favor, completa todos los campos.');
      return;
    }

    // 2. Validar longitud mínima
    if (password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    // 3. Validar coincidencia
    if (password !== confirmPassword) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }

    await updatePassword(password);
  };

  if (success) {
    return (
      <DashboardLayout title="¡Éxito!" subtitle="Tu cuenta ha sido activada">
        <div className="p-6 text-center bg-white rounded-xl shadow-sm border border-neutral-100">
          <div className="mb-4 text-5xl text-green-500">✅</div>
          <h2 className="text-xl font-bold mb-2">¡Contraseña actualizada!</h2>
          <p className="text-neutral-600 mb-6">
            Tu perfil ha sido desbloqueado correctamente. Ya puedes acceder al sistema.
          </p>
          <Button onClick={() => window.location.href = '/'} variant="primary">
            Ir a la pagina principal
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Cambiar Contraseña"
      subtitle="Establece tu nueva contraseña para activar tu cuenta"
    >
      <div className="max-w-md bg-white p-6 rounded-xl shadow-sm border border-neutral-100">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Nueva Contraseña"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setLocalError(null);
            }}
            required
          />
          <Input
            label="Confirmar Nueva Contraseña"
            type="password"
            placeholder="Repite tu contraseña"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setLocalError(null);
            }}
            required
          />
          
          {/* Mostramos errores locales o del servidor */}
          {(localError || error) && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md">
              {localError || error}
            </div>
          )}

          <Button type="submit" isLoading={loading} className="w-full">
            Activar Cuenta y Entrar
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
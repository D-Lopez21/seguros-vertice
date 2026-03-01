import './App.css';
import React, { useEffect } from 'react'; // ← Agrega useEffect aquí
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import {
  Home,
  NotFound,
  SignIn,
  SignUp,
  UsersPage,
  ChangePassword,
  ResetPassword,
  CreateBillPage,
  BillDetailsPage,
  BillsPage,
  ProvidersPage,
} from './pages';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabase'; // ← Agrega esta importación

const PublicRoute = ({
  children,
  ignoreAuth = false,
}: {
  children: React.ReactNode;
  ignoreAuth?: boolean;
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!ignoreAuth && user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// 🔍 NUEVO: Componente interno para debugging
function AppWithDebug() {
  // 🔍 DEBUGGING 1: Monitorear canales activos
  useEffect(() => {
    console.log('🚀 App montada - Iniciando monitoreo de canales');
    
    const interval = setInterval(() => {
      const channels = supabase.getChannels();
      console.log('📡 Canales activos:', channels.length);
      
      if (channels.length > 0) {
        console.log('📋 Nombres de canales:', channels.map(ch => ch.topic));
      }
      
      // ⚠️ Alerta si hay demasiados canales
      if (channels.length > 3) {
        console.warn('⚠️ ADVERTENCIA: Demasiados canales activos!', channels.length);
      }
    }, 3000); // Cada 3 segundos

    return () => {
      console.log('🛑 App desmontada - Deteniendo monitoreo');
      clearInterval(interval);
    };
  }, []);

  // 🔍 DEBUGGING 2: Detectar cambios de pestaña
  useEffect(() => {
    const handleVisibilityChange = () => {
      const channels = supabase.getChannels();
      
      if (document.hidden) {
        console.log('👁️ ===== PESTAÑA OCULTA =====');
        console.log('📡 Canales antes de ocultar:', channels.length);
      } else {
        console.log('👁️ ===== PESTAÑA VISIBLE =====');
        console.log('📡 Canales al volver:', channels.length);
        console.log('📋 Canales activos:', channels.map(ch => ch.topic));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const router = createBrowserRouter([
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      ),
    },
    {
      path: '/bills',
      element: (
        <ProtectedRoute>
          <BillsPage />
        </ProtectedRoute>
      ),
    },
    {
      path: 'bills/:id',
      element: (
        <ProtectedRoute>
          <BillDetailsPage />
        </ProtectedRoute>
      ),
    },
    {
      path: '/create-bill',
      element: (
        <ProtectedRoute>
          <CreateBillPage />
        </ProtectedRoute>
      ),
    },
    {
      path: '/reset-password',
      element: <ResetPassword />,
    },
    {
      path: '/sign-in',
      element: (
        <PublicRoute>
          <SignIn />
        </PublicRoute>
      ),
    },
    {
      path: '/sign-up',
      element: (
        <PublicRoute>
          <SignUp />
        </PublicRoute>
      ),
    },
    {
      path: '/users',
      element: (
        <ProtectedRoute>
          <UsersPage />
        </ProtectedRoute>
      ),
    },
    {
      path: '/change-password',
      element: (
        <ProtectedRoute>
          <ChangePassword />
        </ProtectedRoute>
      ),
    },
    {
      path: '/providers',
      element: (
        <ProtectedRoute>
          <ProvidersPage />
        </ProtectedRoute>
      ),
    },
    {
      path: '/not-found',
      element: <NotFound />,
    },
    {
      path: '*',
      element: <NotFound />,
    },
  ]);

  return (
    <div className="h-full w-full">
      <RouterProvider router={router} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppWithDebug />
    </AuthProvider>
  );
}

export default App;
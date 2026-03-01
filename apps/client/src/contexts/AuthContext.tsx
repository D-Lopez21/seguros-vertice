/* eslint-disable react-refresh/only-export-components */
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import React from 'react';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'recepcion' | 'liquidacion' | 'auditoria' | 'programacion' | 'pagos' | 'finiquito' | 'proveedor' | 'user';
  rif: string | null;
  suppliers_id: string | null;
  password_change_required: boolean;
  active: boolean;
}

export type AuthUser = User & { profile?: Profile | null };

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
}

export const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const ACTIVE_TAB_KEY = 'active_tab_id';
const TAB_HEARTBEAT_KEY = 'tab_heartbeat';
const TAB_TIMESTAMP_KEY = 'tab_timestamp';
const HEARTBEAT_INTERVAL = 2000;
const HEARTBEAT_TIMEOUT = 5000;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isActiveTab, setIsActiveTab] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(true);

  const heartbeatIntervalRef = React.useRef<number | null>(null);
  const checkActiveTabIntervalRef = React.useRef<number | null>(null);
  const hasAttemptedActivation = React.useRef(false);
  const isActiveTabRef = React.useRef(false);
  const authInitializedRef = React.useRef(false);
  const hasSessionRef = React.useRef(false);

  const fetchProfile = React.useCallback(async (currentUser: User): Promise<AuthUser> => {
    try {
      const { data, error } = await supabase
        .from('profile')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.warn('Perfil no encontrado:', error.message);
        return currentUser;
      }

      return { ...currentUser, profile: data as Profile };
    } catch (e) {
      console.error('Error cargando perfil:', e);
      return currentUser;
    }
  }, []);

  const canBeActiveTab = React.useCallback((): boolean => {
    const activeTabId = localStorage.getItem(ACTIVE_TAB_KEY);
    const lastHeartbeat = localStorage.getItem(TAB_HEARTBEAT_KEY);

    if (!activeTabId) return true;
    if (activeTabId === TAB_ID) return true;

    if (lastHeartbeat) {
      const timeSinceLastHeartbeat = Date.now() - parseInt(lastHeartbeat);
      if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
        console.log('⚠️ Pestaña anterior está muerta');
        return true;
      }
    }

    return false;
  }, []);

  const sendHeartbeat = React.useCallback(() => {
    const activeTabId = localStorage.getItem(ACTIVE_TAB_KEY);
    if (activeTabId === TAB_ID) {
      localStorage.setItem(TAB_HEARTBEAT_KEY, Date.now().toString());
    }
  }, []);

  const tryTakeControl = React.useCallback(() => {
    if (canBeActiveTab()) {
      const now = Date.now();
      localStorage.setItem(ACTIVE_TAB_KEY, TAB_ID);
      localStorage.setItem(TAB_HEARTBEAT_KEY, now.toString());

      if (!localStorage.getItem(TAB_TIMESTAMP_KEY)) {
        localStorage.setItem(TAB_TIMESTAMP_KEY, now.toString());
      }

      console.log('✅ Esta pestaña tomó el control:', TAB_ID);
      return true;
    }
    return false;
  }, [canBeActiveTab]);

  const validateUserSession = React.useCallback(async (currentUserId: string): Promise<boolean> => {
    const storedUserId = localStorage.getItem('current_user_id');

    if (storedUserId && storedUserId !== currentUserId) {
      console.warn('⚠️ Detectado cambio de usuario. Cerrando sesión...');
      localStorage.clear();
      sessionStorage.clear();
      await supabase.auth.signOut();
      window.location.href = '/login';
      return false;
    }

    localStorage.setItem('current_user_id', currentUserId);
    return true;
  }, []);

  const initializeAuth = React.useCallback(async () => {
    if (authInitializedRef.current) return;
    authInitializedRef.current = true;

    try {
      const { data: { session: initialSession } } = await supabase.auth.getSession();

      if (initialSession?.user) {
        hasSessionRef.current = true;
        const isValid = await validateUserSession(initialSession.user.id);
        if (!isValid) return;

        const userWithProfile = await fetchProfile(initialSession.user);
        setSession(initialSession);
        setUser(userWithProfile);
      }
    } catch (error) {
      console.error('Error inicializando auth:', error);
    } finally {
      setIsLoading(false);
    }

    supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('🔔 Auth event:', event);

      if (event === 'SIGNED_IN' && hasSessionRef.current) {
        console.log('ℹ️ SIGNED_IN ignorado - sesión ya activa');
        return;
      }

      if (currentSession) {
        hasSessionRef.current = true;
      } else {
        hasSessionRef.current = false;
      }

      setSession(currentSession);

      if (currentSession?.user) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const isValid = await validateUserSession(currentSession.user.id);
          if (!isValid) return;
        }

        if (event === 'SIGNED_IN') {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        const userWithProfile = await fetchProfile(currentSession.user);
        setUser(userWithProfile);
      } else {
        setUser(null);
        localStorage.removeItem('current_user_id');
      }

      setIsLoading(false);
    });
  }, [fetchProfile, validateUserSession]);

  const forceBeActiveTab = React.useCallback(() => {
    const now = Date.now();
    localStorage.setItem(ACTIVE_TAB_KEY, TAB_ID);
    localStorage.setItem(TAB_HEARTBEAT_KEY, now.toString());
    localStorage.setItem(TAB_TIMESTAMP_KEY, now.toString());

    console.log('🔨 FORZANDO esta pestaña como activa:', TAB_ID);

    isActiveTabRef.current = true;
    setIsActiveTab(true);
    setIsChecking(false);

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    heartbeatIntervalRef.current = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    initializeAuth();
  }, [sendHeartbeat, initializeAuth]);

  React.useEffect(() => {
    // ✅ Limpiar el control al cerrar o recargar la página
    const handleBeforeUnload = () => {
      const activeTabId = localStorage.getItem(ACTIVE_TAB_KEY);
      if (activeTabId === TAB_ID) {
        localStorage.removeItem(ACTIVE_TAB_KEY);
        localStorage.removeItem(TAB_HEARTBEAT_KEY);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    if (!hasAttemptedActivation.current) {
      hasAttemptedActivation.current = true;

      const gotControl = tryTakeControl();
      isActiveTabRef.current = gotControl;
      setIsActiveTab(gotControl);
      setIsChecking(false);

      if (gotControl) {
        initializeAuth();
        heartbeatIntervalRef.current = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

        checkActiveTabIntervalRef.current = window.setInterval(() => {
          const activeTabId = localStorage.getItem(ACTIVE_TAB_KEY);
          if (activeTabId !== TAB_ID && isActiveTabRef.current) {
            console.log('⚠️ Otra pestaña tomó el control');
            isActiveTabRef.current = false;
            setIsActiveTab(false);
            if (heartbeatIntervalRef.current) {
              clearInterval(heartbeatIntervalRef.current);
              heartbeatIntervalRef.current = null;
            }
          }
        }, HEARTBEAT_INTERVAL);

      } else {
        console.warn('⚠️ Esta pestaña NO es activa. Esperando...');
        setIsLoading(false);

        checkActiveTabIntervalRef.current = window.setInterval(() => {
          if (!isActiveTabRef.current && canBeActiveTab()) {
            const gotControl = tryTakeControl();
            if (gotControl) {
              console.log('✅ Tomando control de pestaña inactiva');
              isActiveTabRef.current = true;
              setIsActiveTab(true);
              heartbeatIntervalRef.current = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
              initializeAuth();
            }
          }
        }, HEARTBEAT_INTERVAL);
      }
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ACTIVE_TAB_KEY) {
        const newActiveTab = e.newValue;
        if (newActiveTab !== TAB_ID && newActiveTab !== null && isActiveTabRef.current) {
          console.log('⚠️ Otra pestaña tomó el control vía storage');
          isActiveTabRef.current = false;
          setIsActiveTab(false);
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('storage', handleStorageChange);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (checkActiveTabIntervalRef.current) clearInterval(checkActiveTabIntervalRef.current);
      const activeTabId = localStorage.getItem(ACTIVE_TAB_KEY);
      if (activeTabId === TAB_ID) {
        localStorage.removeItem(ACTIVE_TAB_KEY);
        localStorage.removeItem(TAB_HEARTBEAT_KEY);
      }
    };
  }, []);

  if (isChecking) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  if (!isActiveTab) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-amber-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-slate-800">
                Sesión Activa en Otra Pestaña
              </h2>

              <p className="text-slate-600">
                Ya tienes una sesión abierta en otra pestaña del navegador.
                Cierra la otra pestaña primero, o fuerza el uso de esta.
              </p>

              <div className="flex flex-col gap-3 w-full mt-4">
                <button
                  onClick={forceBeActiveTab}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  🔨 Usar Esta Pestaña (Forzar)
                </button>

                <button
                  onClick={() => window.close()}
                  className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Cerrar Esta Pestaña
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-xs text-blue-700">
                  💡 <strong>Consejo:</strong> Cierra las demás pestañas primero. Si usas "Forzar", la otra pestaña se volverá inactiva.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAdmin:
          user?.profile?.role === 'admin' ||
          user?.user_metadata?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
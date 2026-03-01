import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ChevronLeftIcon, LogOutIcon } from '../icons';
import { useSignOut } from '../../hooks/useSignOut';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  returnTo?: string;
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

  .dl-root {
    min-height: 100dvh;
    width: 100%;
    display: flex;
    flex-direction: column;
    font-family: 'DM Sans', sans-serif;
    background: #f1f5f9;
    position: relative;
  }

  /* ── Navbar ── */
  .dl-nav {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
    height: 64px;
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
    box-shadow: 0 1px 8px rgba(0,0,0,0.05);
  }

  .dl-nav-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    text-decoration: none;
  }

  .dl-nav-logo {
    width: 38px;
    height: 38px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 14px rgba(99,102,241,0.28);
    transition: transform 0.2s, box-shadow 0.2s;
    flex-shrink: 0;
  }

  .dl-nav-brand:hover .dl-nav-logo {
    transform: scale(1.08);
    box-shadow: 0 6px 20px rgba(99,102,241,0.38);
  }

  .dl-nav-logo svg {
    width: 18px;
    height: 18px;
    stroke: white;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .dl-nav-brand-name {
    font-size: 17px;
    font-weight: 700;
    color: #1e293b;
    letter-spacing: -0.3px;
  }

  .dl-nav-brand-name span {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .dl-nav-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .dl-nav-user {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 6px 12px 6px 6px;
  }

  .dl-nav-avatar {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    color: white;
    flex-shrink: 0;
  }

  .dl-nav-user-info {
    display: flex;
    flex-direction: column;
  }

  .dl-nav-user-name {
    font-size: 13px;
    font-weight: 600;
    color: #1e293b;
    line-height: 1;
  }

  .dl-nav-user-email {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
  }

  .dl-logout-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 14px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    color: #64748b;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }

  .dl-logout-btn:hover {
    background: #fef2f2;
    color: #dc2626;
    border-color: #fecaca;
  }

  /* ── Main content ── */
  .dl-main {
    flex: 1;
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    padding: 32px 32px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    animation: dl-fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both;
  }

  @media (max-width: 768px) {
    .dl-main { padding: 20px 16px; }
    .dl-nav { padding: 0 16px; }
    .dl-nav-user-info { display: none; }
  }

  /* ── Back button ── */
  .dl-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #6366f1;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 8px 14px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    align-self: flex-start;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  }

  .dl-back-btn:hover {
    background: #f8fafc;
    border-color: #c7d2fe;
    color: #4f46e5;
  }

  .dl-back-btn svg {
    transition: transform 0.15s;
  }

  .dl-back-btn:hover svg {
    transform: translateX(-3px);
  }

  /* ── Page header card ── */
  .dl-header-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    padding: 24px 28px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    position: relative;
    overflow: hidden;
  }

  .dl-header-card::after {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(to bottom, #6366f1, #8b5cf6);
    border-radius: 4px 0 0 4px;
  }

  .dl-header-title {
    font-family: 'DM Serif Display', serif;
    font-size: 26px;
    color: #0f172a;
    line-height: 1.2;
    margin-bottom: 6px;
  }

  .dl-header-subtitle {
    font-size: 14px;
    color: #64748b;
    line-height: 1.6;
    max-width: 520px;
  }

  /* ── Footer ── */
  .dl-footer {
    text-align: center;
    padding: 24px 16px;
    background: #ffffff;
    border-top: 1px solid #e2e8f0;
  }

  .dl-footer p {
    font-size: 13px;
    font-weight: 600;
    color: #475569;
  }

  .dl-footer span {
    font-size: 12px;
    color: #94a3b8;
    display: block;
    margin-top: 3px;
  }

  /* ── Loading ── */
  .dl-loading {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    gap: 20px;
  }

  .dl-spinner {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 3px solid #e2e8f0;
    border-top-color: #6366f1;
    animation: dl-spin 0.7s linear infinite;
  }

  .dl-loading p {
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
    letter-spacing: 0.5px;
    font-family: 'DM Sans', sans-serif;
  }

  @keyframes dl-spin    { to { transform: rotate(360deg); } }
  @keyframes dl-fadeUp  {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

export const DashboardLayout = ({
  children,
  title,
  subtitle,
  returnTo,
}: DashboardLayoutProps) => {
  const signOut = useSignOut();
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/sign-in');
  };

  if (isLoading) {
    return (
      <>
        <style>{css}</style>
        <div className="dl-loading">
          <div className="dl-spinner" />
          <p>Cargando Panel</p>
        </div>
      </>
    );
  }

  const fullName =
    user?.user_metadata?.name || user?.user_metadata?.full_name || 'Usuario';
  const initial = fullName.charAt(0).toUpperCase();

  return (
    <>
      <style>{css}</style>
      <div className="dl-root">

        {/* Navbar */}
        <nav className="dl-nav">
          <div className="dl-nav-brand" onClick={() => navigate('/')}>
            <div className="dl-nav-logo">
              <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <span className="dl-nav-brand-name">
              Seguros<span>Vértice</span>
            </span>
          </div>

          <div className="dl-nav-right">
            <div className="dl-nav-user">
              <div className="dl-nav-avatar">{initial}</div>
              <div className="dl-nav-user-info">
                <span className="dl-nav-user-name">{fullName}</span>
                <span className="dl-nav-user-email">{user?.email}</span>
              </div>
            </div>

            <button className="dl-logout-btn" onClick={handleLogout}>
              <LogOutIcon style={{ width: 14, height: 14 }} />
              <span>Salir</span>
            </button>
          </div>
        </nav>

        {/* Main */}
        <main className="dl-main">

          {/* Back button */}
          {returnTo && (
            <button className="dl-back-btn" onClick={() => navigate(returnTo)}>
              <ChevronLeftIcon style={{ width: 14, height: 14 }} />
              Volver
            </button>
          )}

          {/* Header card */}
          {(title || subtitle) && (
            <div className="dl-header-card">
              {title    && <div className="dl-header-title">{title}</div>}
              {subtitle && <div className="dl-header-subtitle">{subtitle}</div>}
            </div>
          )}

          {/* Children */}
          {children}
        </main>

        {/* Footer */}
        <footer className="dl-footer">
          <p>© {new Date().getFullYear()} Diego Lopez</p>
          <span>Panel de Administración · Todos los derechos reservados</span>
        </footer>

      </div>
    </>
  );
};
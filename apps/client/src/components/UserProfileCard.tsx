import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { EditIcon } from './icons';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

  .upc-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    overflow: hidden;
    font-family: 'DM Sans', sans-serif;
    animation: upc-fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both;
    position: relative;
    display: flex;
    align-items: center;
    padding: 24px 28px;
    gap: 20px;
  }

  /* Línea índigo izquierda */
  .upc-card::after {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 4px; height: 100%;
    background: linear-gradient(to bottom, #6366f1, #8b5cf6);
    border-radius: 4px 0 0 4px;
  }

  .upc-avatar {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 700;
    color: white;
    box-shadow: 0 4px 20px rgba(99,102,241,0.28);
    letter-spacing: 1px;
    user-select: none;
    flex-shrink: 0;
  }

  .upc-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }

  .upc-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    border-radius: 99px;
    padding: 3px 10px;
    border: 1px solid transparent;
    align-self: flex-start;
    margin-bottom: 2px;
  }

  .upc-badge svg { flex-shrink: 0; }

  .upc-badge-admin        { background: rgba(99,102,241,0.08);  color: #6366f1; border-color: rgba(99,102,241,0.2); }
  .upc-badge-recepcion    { background: rgba(139,92,246,0.08);  color: #7c3aed; border-color: rgba(139,92,246,0.2); }
  .upc-badge-liquidacion  { background: rgba(245,158,11,0.08);  color: #d97706; border-color: rgba(245,158,11,0.2); }
  .upc-badge-auditoria    { background: rgba(239,68,68,0.08);   color: #dc2626; border-color: rgba(239,68,68,0.2); }
  .upc-badge-pagos        { background: rgba(16,185,129,0.08);  color: #059669; border-color: rgba(16,185,129,0.2); }
  .upc-badge-finiquito    { background: rgba(6,182,212,0.08);   color: #0891b2; border-color: rgba(6,182,212,0.2); }
  .upc-badge-programacion { background: rgba(99,102,241,0.08);  color: #4f46e5; border-color: rgba(99,102,241,0.2); }
  .upc-badge-proveedor    { background: rgba(249,115,22,0.08);  color: #ea580c; border-color: rgba(249,115,22,0.2); }
  .upc-badge-default      { background: rgba(100,116,139,0.08); color: #475569; border-color: rgba(100,116,139,0.2); }

  .upc-name {
    font-family: 'DM Serif Display', serif;
    font-size: 26px;
    color: #0f172a;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .upc-email {
    font-size: 13px;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .upc-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 10px 18px;
    border-radius: 11px;
    font-size: 13px;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    color: #64748b;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .upc-btn:hover { background: #f1f5f9; color: #334155; border-color: #cbd5e1; }
  .upc-btn:hover .upc-edit-icon { color: #6366f1; }

  .upc-edit-icon {
    color: #94a3b8;
    transition: color 0.15s;
    width: 14px;
    height: 14px;
  }

  @keyframes upc-fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 600px) {
    .upc-card { flex-wrap: wrap; }
    .upc-btn  { width: 100%; justify-content: center; }
  }
`;

const roleLabels: Record<string, { label: string; cls: string }> = {
  admin:        { label: 'Administrador', cls: 'upc-badge-admin' },
  recepcion:    { label: 'Recepción',     cls: 'upc-badge-recepcion' },
  liquidacion:  { label: 'Liquidación',   cls: 'upc-badge-liquidacion' },
  auditoria:    { label: 'Auditoría',     cls: 'upc-badge-auditoria' },
  pagos:        { label: 'Pagos',         cls: 'upc-badge-pagos' },
  finiquito:    { label: 'Finiquito',     cls: 'upc-badge-finiquito' },
  programacion: { label: 'Programación',  cls: 'upc-badge-programacion' },
  proveedor:    { label: 'Proveedor',     cls: 'upc-badge-proveedor' },
};

export default function UserProfileCard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const name  = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuario';
  const email = user?.email || '';
  const role  = user?.user_metadata?.role || user?.profile?.role || 'usuario';

  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const roleInfo = roleLabels[role] ?? { label: role, cls: 'upc-badge-default' };

  return (
    <>
      <style>{css}</style>
      <div className="upc-card">

        <div className="upc-avatar">{initials}</div>

        <div className="upc-info">
          <div className={`upc-badge ${roleInfo.cls}`}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            {roleInfo.label}
          </div>
          <div className="upc-name">Bienvenido, {name.split(' ')[0]}</div>
          <div className="upc-email">{email}</div>
        </div>

        <button className="upc-btn" onClick={() => navigate('/change-password')}>
          <EditIcon className="upc-edit-icon" />
          Cambiar contraseña
        </button>

      </div>
    </>
  );
}
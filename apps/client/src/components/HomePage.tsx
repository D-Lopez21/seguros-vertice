import { DashboardLayout } from './common';
import { BriefcaseIcon, ReceiptIcon, UserIcon } from './icons';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import UserProfileCard from './UserProfileCard';

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  accent: string;
  accentBg: string;
  btnGradient: string;
  features: string[];
}

const ActionCard = ({
  title,
  description,
  icon: Icon,
  onClick,
  accent,
  accentBg,
  btnGradient,
  features,
}: ActionCardProps) => (
  <div style={{
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 20,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    height: '100%',
    transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
  }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.09)';
      (e.currentTarget as HTMLDivElement).style.borderColor = '#cbd5e1';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)';
      (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0';
    }}
  >
    {/* Header */}
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: accentBg, color: accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon style={{ width: 20, height: 20 }} />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5 }}>{description}</div>
      </div>
    </div>

    {/* Divider */}
    <div style={{ height: 1, background: '#f1f5f9' }} />

    {/* Features */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
      {features.map(f => (
        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#64748b' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: accent, flexShrink: 0 }} />
          {f}
        </div>
      ))}
    </div>

    {/* Button */}
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '11px', borderRadius: 11,
        fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
        cursor: 'pointer', border: 'none', color: 'white',
        background: btnGradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        transition: 'filter 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.07)')}
      onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
    >
      Ver tabla
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </button>
  </div>
);

const MODULE_CARDS = [
  {
    key: 'usuarios',
    title: 'Usuarios',
    description: 'Administra los roles y permisos del sistema.',
    icon: UserIcon,
    accent: '#6366f1',
    accentBg: 'rgba(99,102,241,0.08)',
    btnGradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    route: '/users',
    adminOnly: true,
    features: ['Crear y editar usuarios', 'Asignar roles y permisos', 'Activar o desactivar cuentas'],
  },
  {
    key: 'proveedores',
    title: 'Proveedores',
    description: 'Gestiona el directorio de proveedores.',
    icon: BriefcaseIcon,
    accent: '#f59e0b',
    accentBg: 'rgba(245,158,11,0.08)',
    btnGradient: 'linear-gradient(135deg,#f59e0b,#d97706)',
    route: '/providers',
    adminOnly: true,
    features: ['Registrar nuevos proveedores', 'Editar información de contacto', 'Consultar historial de facturas'],
  },
  {
    key: 'facturas',
    title: 'Facturas',
    description: 'Controla el historial de facturación.',
    icon: ReceiptIcon,
    accent: '#10b981',
    accentBg: 'rgba(16,185,129,0.08)',
    btnGradient: 'linear-gradient(135deg,#10b981,#059669)',
    route: '/bills',
    adminOnly: false,
    features: ['Crear y gestionar facturas', 'Filtrar por N° de Siniestro, Proveedor, Lote o estado', 'Acceder a detalles y auditoría de cada factura'],
  },
];

export default function HomePage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const visibleCards = MODULE_CARDS.filter(c => !c.adminOnly || isAdmin);

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Profile card — fila completa arriba */}
        <div style={{ animation: 'hp-fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both' }}>
          <UserProfileCard />
        </div>

        {/* Label de módulos */}
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 2,
          textTransform: 'uppercase', color: '#94a3b8',
        }}>
          Módulos del sistema
        </div>

        {/* Cards de módulos — fila de 3 (o las que correspondan al rol) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${visibleCards.length}, 1fr)`,
          gap: 16,
          alignItems: 'stretch',
        }}>
          {visibleCards.map((card, i) => (
            <div
              key={card.key}
              style={{ animation: `hp-fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) ${(i + 1) * 70}ms both` }}
            >
              <ActionCard
                title={card.title}
                description={card.description}
                icon={card.icon}
                accent={card.accent}
                accentBg={card.accentBg}
                btnGradient={card.btnGradient}
                onClick={() => navigate(card.route)}
                features={card.features}
              />
            </div>
          ))}
        </div>

      </div>

      <style>{`
        @keyframes hp-fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .hp-modules-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
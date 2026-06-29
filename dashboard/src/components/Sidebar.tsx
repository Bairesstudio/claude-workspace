import { NavLink } from 'react-router-dom';
import { Calendar, CalendarRange, History, BarChart3, LogOut, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const clientLinks = [
  { to: '/', label: 'Hoy', icon: Calendar },
  { to: '/proximos', label: 'Próximos', icon: CalendarRange },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/metricas', label: 'Métricas', icon: BarChart3 },
];

export function Sidebar() {
  const { signOut, negocioNombre, role } = useAuth();
  const links = role === 'admin' ? [{ to: '/admin', label: 'Clientes', icon: Building2 }] : clientLinks;

  return (
    <>
      {/* Desktop: sidebar fija a la izquierda */}
      <aside className="hidden h-full w-56 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="px-6 py-6">
          <p className="text-lg font-semibold text-gray-900">{role === 'admin' ? 'Baires Studio' : (negocioNombre || '—')}</p>
          <p className="text-sm text-gray-500">{role === 'admin' ? 'Panel admin' : 'Panel de turnos'}</p>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-light text-primary-dark'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-3 pb-6">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <LogOut size={18} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile: barra superior + tabs inferiores */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <p className="text-base font-semibold text-gray-900">{role === 'admin' ? 'Baires Studio' : (negocioNombre || '—')}</p>
        <button
          onClick={signOut}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          aria-label="Cerrar sesión"
        >
          <LogOut size={20} aria-hidden="true" />
        </button>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                isActive ? 'text-primary-dark' : 'text-gray-500'
              }`
            }
          >
            <Icon size={20} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

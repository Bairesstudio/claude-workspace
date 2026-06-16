import { NavLink } from 'react-router-dom';
import { Calendar, CalendarRange, History, BarChart3, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Hoy', icon: Calendar },
  { to: '/proximos', label: 'Próximos', icon: CalendarRange },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/metricas', label: 'Métricas', icon: BarChart3 },
];

export function Sidebar() {
  const { signOut } = useAuth();

  return (
    <aside className="flex h-full w-56 flex-col border-r border-gray-200 bg-white">
      <div className="px-6 py-6">
        <p className="text-lg font-semibold text-gray-900">Pajaro Loco</p>
        <p className="text-sm text-gray-500">Panel de turnos</p>
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
  );
}

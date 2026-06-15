import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Hoy', icon: '📅' },
  { to: '/proximos', label: 'Próximos', icon: '🗓️' },
  { to: '/historial', label: 'Historial', icon: '🕓' },
  { to: '/metricas', label: 'Métricas', icon: '📊' },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-56 flex-col border-r border-gray-200 bg-white">
      <div className="px-6 py-6">
        <p className="text-lg font-semibold text-gray-900">Pajaro Loco</p>
        <p className="text-sm text-gray-500">Panel de turnos</p>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <span aria-hidden="true">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

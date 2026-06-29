import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, CalendarRange, History, BarChart3, LogOut, Building2, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const clientLinks = [
  { to: '/', label: 'Hoy', icon: Calendar },
  { to: '/proximos', label: 'Próximos', icon: CalendarRange },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/metricas', label: 'Métricas', icon: BarChart3 },
];

export function Sidebar() {
  const { signOut, negocioNombre, role } = useAuth();
  const [open, setOpen] = useState(false);
  const links = role === 'admin' ? [{ to: '/admin', label: 'Clientes', icon: Building2 }] : clientLinks;

  return (
    <>
      {/* Desktop: sidebar fija */}
      <aside className="hidden lg:flex h-full w-56 flex-col border-r border-gray-200 bg-white">
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
                  isActive ? 'bg-primary-light text-primary-dark' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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

      {/* Mobile: header con hamburger */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <p className="text-base font-semibold text-gray-900">
          {role === 'admin' ? 'Baires Studio' : (negocioNombre || '—')}
        </p>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Abrir menú"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
      </header>

      {/* Mobile: drawer */}
      {open && (
        <>
          {/* Fondo oscuro */}
          <div
            className="fixed inset-0 z-20 bg-black/40 lg:hidden"
            onClick={() => setOpen(false)}
          />

          {/* Panel lateral */}
          <div className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-white shadow-xl lg:hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <p className="font-semibold text-gray-900">
                  {role === 'admin' ? 'Baires Studio' : (negocioNombre || '—')}
                </p>
                <p className="text-xs text-gray-500">
                  {role === 'admin' ? 'Panel admin' : 'Panel de turnos'}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                aria-label="Cerrar menú"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <nav className="flex flex-col gap-1 p-3">
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive ? 'bg-primary-light text-primary-dark' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto border-t border-gray-100 p-3">
              <button
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                <LogOut size={18} aria-hidden="true" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTurnos } from '../hooks/useTurnos';
import { calcularMetricas } from '../lib/metrics';

const formatoPrecio = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function Metricas() {
  const { turnos, loading, error } = useTurnos();

  if (loading) return <p className="text-sm text-gray-500">Cargando métricas…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const ahora = new Date();
  const turnosDelMes = turnos.filter((t) => {
    const fecha = new Date(t.fecha);
    return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
  });

  const metricas = calcularMetricas(turnosDelMes);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Métricas</h1>
      <p className="mt-1 text-sm text-gray-500">Resumen del mes en curso.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Facturación total</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatoPrecio.format(metricas.totalFacturado)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Turnos confirmados</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{metricas.cantidadTurnos}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700">Por servicio</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricas.porServicio}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => formatoPrecio.format(value)} />
                <Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700">Por empleado</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricas.porEmpleado}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => formatoPrecio.format(value)} />
                <Bar dataKey="total" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

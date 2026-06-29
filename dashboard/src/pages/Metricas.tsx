import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Wallet, CalendarCheck } from 'lucide-react';
import { useTurnos } from '../hooks/useTurnos';
import { calcularMetricas } from '../lib/metrics';
import { StatCard } from '../components/StatCard';
import { Skeleton } from '../components/Skeleton';

const formatoPrecio = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function Metricas() {
  const { turnos, loading, error } = useTurnos();

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
        {loading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
            <StatCard
              label="Facturación total"
              value={formatoPrecio.format(metricas.totalFacturado)}
              icon={Wallet}
            />
            <StatCard
              label="Turnos confirmados"
              value={String(metricas.cantidadTurnos)}
              icon={CalendarCheck}
            />
          </>
        )}
      </div>

      <div className="mt-6">
        {loading ? (
          <Skeleton className="h-80" />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700">Por servicio</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricas.porServicio}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="nombre"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={55}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11 }} width={65} tickFormatter={(v) => formatoPrecio.format(v)} />
                  <Tooltip formatter={(value) => formatoPrecio.format(Number(value))} />
                  <Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useTurnos } from '../hooks/useTurnos';
import { isPasado, agruparPorFecha, formatFecha } from '../lib/date';
import { TurnoCard } from '../components/TurnoCard';
import { EmptyState } from '../components/EmptyState';

export function Historial() {
  const { turnos, loading, error } = useTurnos();

  const pasados = turnos.filter((t) => isPasado(t.fecha));
  const grupos = agruparPorFecha(pasados).reverse();

  if (loading) return <p className="text-sm text-gray-500">Cargando turnos…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Historial</h1>
      <p className="mt-1 text-sm text-gray-500">Turnos pasados, confirmados o cancelados.</p>

      <div className="mt-6 flex flex-col gap-6">
        {grupos.length === 0 ? (
          <EmptyState message="Todavía no hay turnos en el historial." />
        ) : (
          grupos.map(({ fecha, turnos }) => (
            <div key={fecha}>
              <h2 className="mb-2 text-sm font-semibold capitalize text-gray-500">
                {formatFecha(fecha)}
              </h2>
              <div className="flex flex-col gap-3">
                {turnos.map((turno) => (
                  <TurnoCard key={turno.id} turno={turno} showEstado />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

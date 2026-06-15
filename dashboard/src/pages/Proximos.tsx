import { useState } from 'react';
import { useTurnos } from '../hooks/useTurnos';
import { isFuturo, agruparPorFecha, formatFecha } from '../lib/date';
import { TurnoCard } from '../components/TurnoCard';
import { TurnoCardSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { CancelarModal } from '../components/CancelarModal';
import { ReprogramarModal } from '../components/ReprogramarModal';
import type { TurnoConNombres } from '../types';

export function Proximos() {
  const { turnos, loading, error, refetch } = useTurnos();
  const [cancelando, setCancelando] = useState<TurnoConNombres | null>(null);
  const [reprogramando, setReprogramando] = useState<TurnoConNombres | null>(null);

  const proximos = turnos.filter((t) => isFuturo(t.fecha) && t.estado === 'confirmado');
  const grupos = agruparPorFecha(proximos);

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Próximos</h1>
      <p className="mt-1 text-sm text-gray-500">Turnos confirmados para los próximos días.</p>

      <div className="mt-6 flex flex-col gap-6">
        {loading ? (
          <div className="flex flex-col gap-3">
            <TurnoCardSkeleton />
            <TurnoCardSkeleton />
            <TurnoCardSkeleton />
          </div>
        ) : grupos.length === 0 ? (
          <EmptyState message="No hay turnos próximos." />
        ) : (
          grupos.map(({ fecha, turnos }) => (
            <div key={fecha}>
              <h2 className="mb-2 text-sm font-semibold capitalize text-gray-500">
                {formatFecha(fecha)}
              </h2>
              <div className="flex flex-col gap-3">
                {turnos.map((turno) => (
                  <TurnoCard
                    key={turno.id}
                    turno={turno}
                    onCancelar={setCancelando}
                    onReprogramar={setReprogramando}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {cancelando && (
        <CancelarModal
          turno={cancelando}
          onClose={() => setCancelando(null)}
          onSuccess={refetch}
        />
      )}
      {reprogramando && (
        <ReprogramarModal
          turno={reprogramando}
          onClose={() => setReprogramando(null)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}

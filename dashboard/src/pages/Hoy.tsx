import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTurnos } from '../hooks/useTurnos';
import { isHoyFecha } from '../lib/date';
import { TurnoCard } from '../components/TurnoCard';
import { TurnoCardSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { CancelarModal } from '../components/CancelarModal';
import { ReprogramarModal } from '../components/ReprogramarModal';
import { NuevoTurnoModal } from '../components/NuevoTurnoModal';
import type { TurnoConNombres } from '../types';

export function Hoy() {
  const { turnos, loading, error, refetch } = useTurnos();
  const [cancelando, setCancelando] = useState<TurnoConNombres | null>(null);
  const [reprogramando, setReprogramando] = useState<TurnoConNombres | null>(null);
  const [nuevoTurno, setNuevoTurno] = useState(false);

  const turnosHoy = turnos
    .filter((t) => isHoyFecha(t.fecha) && t.estado === 'confirmado')
    .sort((a, b) => a.hora.localeCompare(b.hora));

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Hoy</h1>
          <p className="mt-1 text-sm text-gray-500">Turnos confirmados para hoy.</p>
        </div>
        <button
          onClick={() => setNuevoTurno(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          <Plus size={16} />
          Nuevo turno
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {loading ? (
          <>
            <TurnoCardSkeleton />
            <TurnoCardSkeleton />
            <TurnoCardSkeleton />
          </>
        ) : turnosHoy.length === 0 ? (
          <EmptyState message="No hay turnos para hoy." />
        ) : (
          turnosHoy.map((turno) => (
            <TurnoCard
              key={turno.id}
              turno={turno}
              onCancelar={setCancelando}
              onReprogramar={setReprogramando}
            />
          ))
        )}
      </div>

      {nuevoTurno && (
        <NuevoTurnoModal
          onClose={() => setNuevoTurno(false)}
          onSuccess={refetch}
        />
      )}
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

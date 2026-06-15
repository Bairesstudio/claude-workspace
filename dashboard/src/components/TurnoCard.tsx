import type { TurnoConNombres } from '../types';

interface TurnoCardProps {
  turno: TurnoConNombres;
  onCancelar?: (turno: TurnoConNombres) => void;
  onReprogramar?: (turno: TurnoConNombres) => void;
  showEstado?: boolean;
}

const formatoPrecio = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function TurnoCard({ turno, onCancelar, onReprogramar, showEstado }: TurnoCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-16 flex-col items-center justify-center rounded-lg bg-violet-50 text-violet-700">
          <span className="text-sm font-semibold">{turno.hora}</span>
        </div>
        <div>
          <p className="font-medium text-gray-900">
            {turno.mascota_nombre}
            <span className="text-gray-400"> · {turno.mascota_raza} ({turno.mascota_tamano})</span>
          </p>
          <p className="text-sm text-gray-500">{turno.nombre_cliente}</p>
          <p className="text-sm text-gray-500">
            {turno.servicio_nombre} · {turno.empleado_nombre} ·{' '}
            {formatoPrecio.format(turno.precio_servicio)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showEstado && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              turno.estado === 'confirmado'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {turno.estado === 'confirmado' ? 'Confirmado' : 'Cancelado'}
          </span>
        )}
        {onReprogramar && (
          <button
            onClick={() => onReprogramar(turno)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Reprogramar
          </button>
        )}
        {onCancelar && (
          <button
            onClick={() => onCancelar(turno)}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

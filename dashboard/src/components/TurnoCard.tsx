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
  const tieneAcciones = showEstado || onReprogramar || onCancelar;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-light text-primary-dark">
          <span className="text-sm font-semibold leading-tight">{turno.hora}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-gray-900">
            {turno.mascota_nombre}
            <span className="font-normal text-gray-400"> · {turno.mascota_raza} ({turno.mascota_tamano})</span>
          </p>
          <p className="truncate text-sm text-gray-500">{turno.nombre_cliente}</p>
          <p className="truncate text-sm text-gray-500">
            {turno.servicio_nombre} · {turno.empleado_nombre}
          </p>
          <p className="text-sm font-semibold text-gray-700">
            {formatoPrecio.format(turno.precio_servicio)}
          </p>
        </div>
      </div>

      {tieneAcciones && (
        <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
          {showEstado && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                turno.estado === 'confirmado'
                  ? 'bg-success-light text-success-dark'
                  : 'bg-danger-light text-danger-dark'
              }`}
            >
              {turno.estado === 'confirmado' ? 'Confirmado' : 'Cancelado'}
            </span>
          )}
          {onReprogramar && (
            <button
              onClick={() => onReprogramar(turno)}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Reprogramar
            </button>
          )}
          {onCancelar && (
            <button
              onClick={() => onCancelar(turno)}
              className="flex-1 rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

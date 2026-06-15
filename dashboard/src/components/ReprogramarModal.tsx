import { useState } from 'react';
import type { TurnoConNombres } from '../types';
import { modificarTurno } from '../lib/webhooks';
import { useToast } from './ToastContext';

interface ReprogramarModalProps {
  turno: TurnoConNombres;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReprogramarModal({ turno, onClose, onSuccess }: ReprogramarModalProps) {
  const { showToast } = useToast();
  const [fecha, setFecha] = useState(turno.fecha);
  const [hora, setHora] = useState(turno.hora);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const res = await modificarTurno(turno.id, fecha, hora);
    setLoading(false);
    if (res.ok) {
      showToast('Turno reprogramado correctamente.');
      onSuccess();
      onClose();
    } else {
      setError(res.message || 'No se pudo reprogramar el turno.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Reprogramar turno</h2>
        <p className="mt-2 text-sm text-gray-600">
          {turno.mascota_nombre} ({turno.nombre_cliente}) · {turno.servicio_nombre}
        </p>
        <div className="mt-4 flex gap-3">
          <label className="flex-1 text-sm text-gray-700">
            Fecha
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </label>
          <label className="flex-1 text-sm text-gray-700">
            Hora
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Volver
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

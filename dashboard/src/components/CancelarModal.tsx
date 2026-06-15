import { useState } from 'react';
import type { TurnoConNombres } from '../types';
import { cancelarTurno } from '../lib/webhooks';
import { useToast } from './ToastContext';

interface CancelarModalProps {
  turno: TurnoConNombres;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelarModal({ turno, onClose, onSuccess }: CancelarModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const res = await cancelarTurno(turno.id);
    setLoading(false);
    if (res.ok) {
      showToast('Turno cancelado correctamente.');
      onSuccess();
      onClose();
    } else {
      setError(res.message || 'No se pudo cancelar el turno.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Cancelar turno</h2>
        <p className="mt-2 text-sm text-gray-600">
          ¿Confirmás cancelar el turno de <strong>{turno.mascota_nombre}</strong> (
          {turno.nombre_cliente}) del {turno.fecha} a las {turno.hora}?
        </p>
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
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Cancelando…' : 'Cancelar turno'}
          </button>
        </div>
      </div>
    </div>
  );
}

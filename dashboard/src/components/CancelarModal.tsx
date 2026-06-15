import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
  const [visible, setVisible] = useState(true);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const res = await cancelarTurno(turno.id);
    setLoading(false);
    if (res.ok) {
      showToast('Turno cancelado correctamente.');
      onSuccess();
      setVisible(false);
    } else {
      setError(res.message || 'No se pudo cancelar el turno.');
    }
  }

  return (
    <AnimatePresence onExitComplete={onClose}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.15 }}
          >
            <h2 className="text-lg font-semibold text-gray-900">Cancelar turno</h2>
            <p className="mt-2 text-sm text-gray-600">
              ¿Confirmás cancelar el turno de <strong>{turno.mascota_nombre}</strong> (
              {turno.nombre_cliente}) del {turno.fecha} a las {turno.hora}?
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setVisible(false)}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Volver
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger-dark disabled:opacity-50"
              >
                {loading ? 'Cancelando…' : 'Cancelar turno'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

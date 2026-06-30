import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { TurnoConNombres } from '../types';
import { modificarTurno } from '../lib/webhooks';
import { useToast } from './ToastContext';
import { supabase } from '../lib/supabase';

interface ReprogramarModalProps {
  turno: TurnoConNombres;
  onClose: () => void;
  onSuccess: () => void;
}

interface HorarioEmpleado {
  empleado_id: string;
  fecha_referencia: string;
  dias_semana_a: string[];
  dias_semana_b: string[];
}

const JS_DIA: Record<number, string> = {
  0: 'domingo', 1: 'lunes', 2: 'martes', 3: 'miercoles',
  4: 'jueves', 5: 'viernes', 6: 'sabado',
};

function esSemanaA(fechaISO: string, fechaReferenciaISO: string): boolean {
  const ref = new Date(fechaReferenciaISO + 'T00:00:00');
  const target = new Date(fechaISO + 'T00:00:00');
  const diffDias = Math.round((target.getTime() - ref.getTime()) / (24 * 60 * 60 * 1000));
  const diffSemanas = Math.floor(diffDias / 7);
  return diffSemanas % 2 === 0;
}

function validarDiaHorario(fechaISO: string, horario: HorarioEmpleado): string | null {
  const fecha = new Date(fechaISO + 'T00:00:00');
  const diaNombre = JS_DIA[fecha.getDay()];
  const semanaA = esSemanaA(fechaISO, horario.fecha_referencia);
  const diasDisponibles = semanaA ? horario.dias_semana_a : horario.dias_semana_b;
  if (!diasDisponibles.includes(diaNombre)) {
    const semanaLabel = semanaA ? 'A' : 'B';
    return `Este empleado no trabaja los ${diaNombre}s (Semana ${semanaLabel})`;
  }
  return null;
}

export function ReprogramarModal({ turno, onClose, onSuccess }: ReprogramarModalProps) {
  const { showToast } = useToast();
  const [fecha, setFecha] = useState(turno.fecha);
  const [hora, setHora] = useState(turno.hora ?? '09:00');
  const [horario, setHorario] = useState<HorarioEmpleado | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    supabase
      .from('horarios_empleado')
      .select('empleado_id, fecha_referencia, dias_semana_a, dias_semana_b')
      .eq('empleado_id', turno.empleado_id)
      .maybeSingle()
      .then(({ data }) => { if (data) setHorario(data); });
  }, [turno.empleado_id]);

  const horaH = hora.split(':')[0];
  const horaM = hora.split(':')[1] ?? '00';
  const avisoHorario = horario ? validarDiaHorario(fecha, horario) : null;

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const res = await modificarTurno(turno.id, fecha, hora, turno.duracion_minutos);
    setLoading(false);
    if (res.ok) {
      showToast('Turno reprogramado correctamente.');
      onSuccess();
      setVisible(false);
    } else {
      setError(res.message || 'No se pudo reprogramar el turno.');
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
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </label>

              <div className="flex-1 text-sm text-gray-700">
                Hora
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <select
                    value={horaH}
                    onChange={e => {
                      const h = e.target.value;
                      const m = h === '18' ? '00' : horaM;
                      setHora(`${h}:${m}`);
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {[9,10,11,12,13,14,15,16,17,18].map(h => (
                      <option key={h} value={h.toString().padStart(2,'0')}>{h.toString().padStart(2,'0')}hs</option>
                    ))}
                  </select>
                  <select
                    value={horaM}
                    disabled={horaH === '18'}
                    onChange={e => setHora(`${horaH}:${e.target.value}`)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100"
                  >
                    <option value="00">:00</option>
                    <option value="30">:30</option>
                  </select>
                </div>
              </div>
            </div>

            {avisoHorario && (
              <p className="mt-3 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-700">
                ⚠️ {avisoHorario}
              </p>
            )}

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
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
              >
                {loading ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

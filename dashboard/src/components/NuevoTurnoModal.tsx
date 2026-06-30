import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase, getClienteId } from '../lib/supabase';

interface Servicio { id: string; nombre: string; precio: number; duracion_minutos: number; tamano: string | null; }
interface Empleado { id: string; nombre: string; }

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export function NuevoTurnoModal({ onClose, onSuccess }: Props) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nombre_cliente: '',
    email: '',
    mascota_nombre: '',
    mascota_raza: '',
    servicio_id: '',
    empleado_id: '',
    fecha: new Date().toISOString().slice(0, 10),
    hora: '09:00',
  });

  useEffect(() => {
    async function cargarDatos() {
      const clienteId = await getClienteId();
      const [{ data: svcs }, { data: emps }] = await Promise.all([
        supabase.from('servicios').select('id, nombre, precio, duracion_minutos, tamano').eq('cliente_id', clienteId).eq('activo', true).order('nombre'),
        supabase.from('empleados').select('id, nombre').eq('cliente_id', clienteId).eq('activo', true).order('nombre'),
      ]);
      setServicios(svcs ?? []);
      setEmpleados(emps ?? []);
      if (svcs && svcs.length > 0) setForm(f => ({ ...f, servicio_id: svcs[0].id }));
      if (emps && emps.length > 0) setForm(f => ({ ...f, empleado_id: emps[0].id }));
      setLoadingDatos(false);
    }
    cargarDatos();
  }, []);

  const servicioSeleccionado = servicios.find(s => s.id === form.servicio_id);

  // Muestra una sola entrada por nombre de servicio (evita duplicados de "Corte de uñas" por tamaño)
  const serviciosUnicos = servicios.filter((s, i, arr) =>
    arr.findIndex(x => x.nombre === s.nombre) === i
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre_cliente.trim() || !form.mascota_nombre.trim()) return;
    if (!form.servicio_id || !form.empleado_id) return;

    setSaving(true);
    setError(null);

    try {
      const clienteId = await getClienteId();
      const inicio = horaAMinutos(form.hora);
      const duracion = servicioSeleccionado?.duracion_minutos ?? 60;
      const precio = servicioSeleccionado?.precio ?? 0;

      const { error: err } = await supabase.from('turnos').insert({
        cliente_id: clienteId,
        empleado_id: form.empleado_id,
        servicio_id: form.servicio_id,
        fecha: form.fecha,
        inicio_minutos: inicio,
        fin_minutos: inicio + duracion,
        duracion_minutos: duracion,
        estado: 'confirmado',
        precio_servicio: precio,
        email: form.email.trim() || '',
        nombre_cliente: form.nombre_cliente.trim(),
        mascota_nombre: form.mascota_nombre.trim(),
        mascota_raza: form.mascota_raza.trim() || 'Sin especificar',
        mascota_tamano: servicioSeleccionado?.tamano ?? 'sin especificar',
        calendar_event_id: null,
      });

      if (err) throw err;
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el turno.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Nuevo turno</h2>
            <p className="text-xs text-gray-500">Turno cargado manualmente</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {loadingDatos ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-gray-400">Cargando...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto">
            <div className="space-y-5 px-5 py-4">

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Dueño</p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Nombre <span className="text-red-500">*</span></label>
                    <input
                      required
                      type="text"
                      value={form.nombre_cliente}
                      onChange={e => setForm(f => ({ ...f, nombre_cliente: e.target.value }))}
                      placeholder="Juan Pérez"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Email <span className="font-normal text-gray-400">(opcional)</span></label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="juan@email.com"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Mascota</p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Nombre <span className="text-red-500">*</span></label>
                    <input
                      required
                      type="text"
                      value={form.mascota_nombre}
                      onChange={e => setForm(f => ({ ...f, mascota_nombre: e.target.value }))}
                      placeholder="Firulais"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Raza <span className="font-normal text-gray-400">(opcional)</span></label>
                    <input
                      type="text"
                      value={form.mascota_raza}
                      onChange={e => setForm(f => ({ ...f, mascota_raza: e.target.value }))}
                      placeholder="Labrador"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Turno</p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Servicio</label>
                    <select
                      value={form.servicio_id}
                      onChange={e => setForm(f => ({ ...f, servicio_id: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      {serviciosUnicos.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}{s.tamano ? ` (${s.tamano})` : ''} — ${Number(s.precio).toLocaleString('es-AR')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Empleado</label>
                    <select
                      value={form.empleado_id}
                      onChange={e => setForm(f => ({ ...f, empleado_id: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      {empleados.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Fecha</label>
                      <input
                        required
                        type="date"
                        value={form.fecha}
                        onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Hora</label>
                      <input
                        required
                        type="time"
                        value={form.hora}
                        onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <div className="flex gap-3 border-t border-gray-100 px-5 py-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar turno'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

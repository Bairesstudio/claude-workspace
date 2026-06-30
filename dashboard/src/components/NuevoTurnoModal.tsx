import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase, getClienteId } from '../lib/supabase';

interface Servicio { id: string; nombre: string; duracion_minutos: number; }
interface Empleado { id: string; nombre: string; }
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

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const CATALOGO = [
  {
    tipo: 'Baño',
    pesos: [
      { label: 'Hasta 4 kg',    precio: 18000 },
      { label: 'Hasta 10 kg',   precio: 20000 },
      { label: 'Hasta 20 kg',   precio: 23000 },
      { label: 'Hasta 30 kg',   precio: 30000 },
      { label: 'Más de 30 kg',  precio: 40000 },
    ],
  },
  {
    tipo: 'Baño + Corte',
    pesos: [
      { label: 'Hasta 4 kg',    precio: 25000 },
      { label: 'Hasta 10 kg',   precio: 28000 },
      { label: 'Hasta 20 kg',   precio: 31000 },
      { label: 'Hasta 30 kg',   precio: 35000 },
      { label: 'Más de 30 kg',  precio: 45000 },
    ],
  },
  {
    tipo: 'Baño (Gatos)',
    pesos: [{ label: 'Precio fijo', precio: 25000 }],
  },
  {
    tipo: 'Corte de uñas',
    pesos: [{ label: 'Precio fijo', precio: 6000 }],
  },
];

function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function resolverServicioId(tipo: string, servicios: Servicio[]): string {
  const t = tipo.toLowerCase();
  const match = servicios.find(s => {
    const n = s.nombre.toLowerCase();
    if (t.includes('uña'))  return n.includes('uña');
    if (t.includes('gato')) return n.includes('gato');
    if (t.includes('corte')) return n.includes('corte') && !n.includes('uña');
    return n.includes('baño') && !n.includes('corte') && !n.includes('gato');
  });
  return match?.id ?? servicios[0]?.id ?? '';
}

const formatoPrecio = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export function NuevoTurnoModal({ onClose, onSuccess }: Props) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [horarios, setHorarios] = useState<Record<string, HorarioEmpleado>>({});
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nombre_cliente: '',
    telefono: '',
    mascota_nombre: '',
    mascota_raza: '',
    tipo_servicio: CATALOGO[0].tipo,
    peso_idx: 0,
    empleado_id: '',
    fecha: new Date().toISOString().slice(0, 10),
    hora: '09:30',
  });

  useEffect(() => {
    async function cargarDatos() {
      const clienteId = await getClienteId();
      const [{ data: svcs }, { data: emps }, { data: hors }] = await Promise.all([
        supabase.from('servicios').select('id, nombre, duracion_minutos').eq('cliente_id', clienteId).eq('activo', true).order('nombre'),
        supabase.from('empleados').select('id, nombre').eq('cliente_id', clienteId).eq('activo', true).order('nombre'),
        supabase.from('horarios_empleado').select('empleado_id, fecha_referencia, dias_semana_a, dias_semana_b'),
      ]);
      setServicios(svcs ?? []);
      setEmpleados(emps ?? []);
      const horariosMap: Record<string, HorarioEmpleado> = {};
      for (const h of hors ?? []) horariosMap[h.empleado_id] = h;
      setHorarios(horariosMap);
      if (emps && emps.length > 0) setForm(f => ({ ...f, empleado_id: emps[0].id }));
      setLoadingDatos(false);
    }
    cargarDatos();
  }, []);

  const catalogoActual = CATALOGO.find(c => c.tipo === form.tipo_servicio) ?? CATALOGO[0];
  const pesoActual = catalogoActual.pesos[form.peso_idx] ?? catalogoActual.pesos[0];
  const precioBonito = formatoPrecio.format(pesoActual.precio);
  const esPrecioFijo = catalogoActual.pesos.length === 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre_cliente.trim() || !form.mascota_nombre.trim()) return;
    if (!form.empleado_id) return;

    setSaving(true);
    setError(null);

    try {
      const clienteId = await getClienteId();
      const servicioId = resolverServicioId(form.tipo_servicio, servicios);
      const duracion = servicios.find(s => s.id === servicioId)?.duracion_minutos ?? 60;
      const inicio = horaAMinutos(form.hora);

      const { error: err } = await supabase.from('turnos').insert({
        cliente_id: clienteId,
        empleado_id: form.empleado_id,
        servicio_id: servicioId,
        fecha: form.fecha,
        inicio_minutos: inicio,
        fin_minutos: inicio + duracion,
        duracion_minutos: duracion,
        estado: 'confirmado',
        precio_servicio: pesoActual.precio,
        email: form.telefono.trim() || '',
        nombre_cliente: form.nombre_cliente.trim(),
        mascota_nombre: form.mascota_nombre.trim(),
        mascota_raza: form.mascota_raza.trim() || 'Sin especificar',
        mascota_tamano: esPrecioFijo ? 'sin especificar' : pesoActual.label.toLowerCase(),
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

              {/* Dueño */}
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
                    <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono <span className="font-normal text-gray-400">(opcional)</span></label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={form.telefono}
                      maxLength={10}
                      onChange={e => setForm(f => ({ ...f, telefono: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      placeholder="1123456789"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>

              {/* Mascota */}
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

              {/* Turno */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Turno</p>
                <div className="space-y-3">

                  {/* Tipo de servicio */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Servicio</label>
                    <select
                      value={form.tipo_servicio}
                      onChange={e => setForm(f => ({ ...f, tipo_servicio: e.target.value, peso_idx: 0 }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      {CATALOGO.map(c => (
                        <option key={c.tipo} value={c.tipo}>{c.tipo}</option>
                      ))}
                    </select>
                  </div>

                  {/* Peso / precio — solo si tiene variantes */}
                  {!esPrecioFijo ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Peso del animal</label>
                      <select
                        value={form.peso_idx}
                        onChange={e => setForm(f => ({ ...f, peso_idx: Number(e.target.value) }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        {catalogoActual.pesos.map((p, i) => (
                          <option key={i} value={i}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {/* Precio resultante */}
                  <div className="flex items-center justify-between rounded-lg bg-primary-light px-4 py-2.5">
                    <span className="text-sm font-medium text-primary-dark">Precio</span>
                    <span className="text-base font-bold text-primary-dark">{precioBonito}</span>
                  </div>

                  {/* Empleado */}
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

                  {/* Fecha y hora */}
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
                      <select
                        required
                        value={form.hora}
                        onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        {Array.from({ length: 18 }, (_, i) => {
                          const totalMinutos = 9 * 60 + 30 + i * 30;
                          const h = Math.floor(totalMinutos / 60).toString().padStart(2, '0');
                          const m = (totalMinutos % 60).toString().padStart(2, '0');
                          const valor = `${h}:${m}`;
                          return <option key={valor} value={valor}>{valor}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {form.empleado_id && form.fecha && horarios[form.empleado_id] && (() => {
                const aviso = validarDiaHorario(form.fecha, horarios[form.empleado_id]);
                return aviso ? (
                  <p className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-700">
                    ⚠️ {aviso}
                  </p>
                ) : null;
              })()}

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

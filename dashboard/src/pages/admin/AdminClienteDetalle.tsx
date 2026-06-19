import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Cliente {
  id: string;
  nombre: string;
  slug: string;
  mail_dueno: string;
  calendar_id: string | null;
  n8n_activo: boolean;
  n8n_workflow_ids: { wf1: string; wf2: string; wf3: string; wf4: string; wf5: string } | null;
}
interface Empleado { id: string; nombre: string; activo: boolean; }
interface Servicio { id: string; nombre: string; tamano: string | null; precio: number; duracion_minutos: number; activo: boolean; }
interface HorarioEmpleado {
  id: string;
  empleado_id: string;
  fecha_referencia: string;
  dias_semana_a: string[];
  dias_semana_b: string[];
}

const DIAS: { value: string; label: string }[] = [
  { value: 'lunes', label: 'Lun' },
  { value: 'martes', label: 'Mar' },
  { value: 'miercoles', label: 'Mié' },
  { value: 'jueves', label: 'Jue' },
  { value: 'viernes', label: 'Vie' },
  { value: 'sabado', label: 'Sáb' },
  { value: 'domingo', label: 'Dom' },
];

function mismosDias(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((d, i) => d === sortedB[i]);
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function normalizarNombre(str: string) {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s_]/g, '')
    .replace(/\s+/g, '_');
}

export function AdminClienteDetalle() {
  const { id } = useParams<{ id: string }>();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);

  const [showEmpForm, setShowEmpForm] = useState(false);
  const [empNombre, setEmpNombre] = useState('');
  const [savingEmp, setSavingEmp] = useState(false);

  const [showSvcForm, setShowSvcForm] = useState(false);
  const [svcForm, setSvcForm] = useState({ nombre: '', tamano: 'chico', precio: '', duracion_minutos: '60' });
  const [savingSvc, setSavingSvc] = useState(false);

  const [horarios, setHorarios] = useState<Record<string, HorarioEmpleado>>({});
  const [editingHorarioFor, setEditingHorarioFor] = useState<string | null>(null);
  const [horarioForm, setHorarioForm] = useState<{
    diasA: string[];
    diasB: string[];
    alterna: boolean;
    fechaReferencia: string;
  }>({ diasA: [], diasB: [], alterna: false, fechaReferencia: hoyISO() });
  const [savingHorario, setSavingHorario] = useState(false);

  const [activando, setActivando] = useState(false)
  const [n8nError, setN8nError] = useState<string | null>(null)

  useEffect(() => { if (id) load(id); }, [id]);

  async function load(clienteId: string) {
    setLoading(true);
    const [{ data: cl }, { data: emps }, { data: svcs }] = await Promise.all([
      supabase.from('clientes').select('*').eq('id', clienteId).single(),
      supabase.from('empleados').select('*').eq('cliente_id', clienteId).order('nombre'),
      supabase.from('servicios').select('*').eq('cliente_id', clienteId).order('nombre'),
    ]);
    setCliente(cl);
    setEmpleados(emps ?? []);
    setServicios(svcs ?? []);

    const empIds = (emps ?? []).map(e => e.id);
    if (empIds.length > 0) {
      const { data: hors } = await supabase
        .from('horarios_empleado')
        .select('*')
        .in('empleado_id', empIds);
      const map: Record<string, HorarioEmpleado> = {};
      for (const h of hors ?? []) map[h.empleado_id] = h;
      setHorarios(map);
    } else {
      setHorarios({});
    }

    setLoading(false);
  }

  async function addEmpleado(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSavingEmp(true);
    await supabase.from('empleados').insert({ cliente_id: id, nombre: empNombre });
    setEmpNombre('');
    setShowEmpForm(false);
    setSavingEmp(false);
    load(id);
  }

  function abrirHorario(empleadoId: string) {
    const existente = horarios[empleadoId];
    if (existente) {
      setHorarioForm({
        diasA: existente.dias_semana_a,
        diasB: existente.dias_semana_b,
        alterna: !mismosDias(existente.dias_semana_a, existente.dias_semana_b),
        fechaReferencia: existente.fecha_referencia,
      });
    } else {
      setHorarioForm({ diasA: [], diasB: [], alterna: false, fechaReferencia: hoyISO() });
    }
    setEditingHorarioFor(empleadoId);
  }

  function toggleDia(grupo: 'diasA' | 'diasB', dia: string) {
    setHorarioForm(f => {
      const actual = f[grupo];
      const nuevo = actual.includes(dia) ? actual.filter(d => d !== dia) : [...actual, dia];
      return { ...f, [grupo]: nuevo };
    });
  }

  async function guardarHorario(empleadoId: string) {
    setSavingHorario(true);
    const diasB = horarioForm.alterna ? horarioForm.diasB : horarioForm.diasA;
    await supabase.from('horarios_empleado').upsert(
      {
        empleado_id: empleadoId,
        fecha_referencia: horarioForm.fechaReferencia,
        dias_semana_a: horarioForm.diasA,
        dias_semana_b: diasB,
      },
      { onConflict: 'empleado_id' }
    );
    setSavingHorario(false);
    setEditingHorarioFor(null);
    if (id) load(id);
  }

  async function addServicio(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSavingSvc(true);
    await supabase.from('servicios').insert({
      cliente_id: id,
      nombre: svcForm.nombre,
      nombre_normalizado: normalizarNombre(svcForm.nombre),
      tamano: svcForm.tamano,
      precio: parseFloat(svcForm.precio) || 0,
      duracion_minutos: parseInt(svcForm.duracion_minutos) || 60,
    });
    setSvcForm({ nombre: '', tamano: 'chico', precio: '', duracion_minutos: '60' });
    setShowSvcForm(false);
    setSavingSvc(false);
    load(id);
  }

  async function activarEnN8n() {
    if (!id) return
    setActivando(true)
    setN8nError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setN8nError('Sesión expirada. Recargá la página.')
        setActivando(false)
        return
      }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clonar-workflows`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ cliente_id: id }),
        }
      )
      if (!res.ok) {
        const contentType = res.headers.get('content-type') ?? ''
        if (!contentType.includes('application/json')) {
          setN8nError(`Error del servidor: ${res.status}`)
          return
        }
      }
      const data = await res.json()
      if (data.ok) {
        load(id)
      } else {
        setN8nError(data.error ?? 'Error desconocido')
      }
    } catch (e) {
      setN8nError(String(e))
    } finally {
      setActivando(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />)}
      </div>
    );
  }
  if (!cliente) return <p className="text-sm text-gray-500">Cliente no encontrado.</p>;

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <Link to="/admin" className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft size={16} /> Volver a clientes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{cliente.nombre}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {cliente.mail_dueno} · webhook: <span className="font-mono">{cliente.slug}-reservas</span>
        </p>
      </div>

      {/* Empleados */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Empleados <span className="ml-1 text-sm font-normal text-gray-400">({empleados.length})</span>
          </h2>
          <button
            onClick={() => setShowEmpForm(v => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark"
          >
            <Plus size={14} /> Agregar
          </button>
        </div>

        {showEmpForm && (
          <form onSubmit={addEmpleado} className="mb-3 flex gap-2">
            <input
              required
              value={empNombre}
              onChange={e => setEmpNombre(e.target.value)}
              placeholder="Nombre del empleado"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              disabled={savingEmp}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {savingEmp ? '...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => setShowEmpForm(false)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </form>
        )}

        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {empleados.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Sin empleados todavía</p>
          ) : (
            empleados.map(emp => (
              <div key={emp.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{emp.nombre}</span>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${emp.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {emp.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    <button
                      onClick={() => editingHorarioFor === emp.id ? setEditingHorarioFor(null) : abrirHorario(emp.id)}
                      className="text-sm font-medium text-primary hover:text-primary-dark"
                    >
                      {horarios[emp.id] ? 'Horario' : 'Sin horario (todos los días)'}
                    </button>
                  </div>
                </div>

                {editingHorarioFor === emp.id && (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        {horarioForm.alterna ? 'Días - Semana A' : 'Días que trabaja'}
                      </label>
                      <div className="flex gap-1.5">
                        {DIAS.map(d => (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => toggleDia('diasA', d.value)}
                            className={`rounded-md px-2 py-1 text-xs font-medium ${
                              horarioForm.diasA.includes(d.value)
                                ? 'bg-primary text-white'
                                : 'bg-white text-gray-600 border border-gray-300'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={horarioForm.alterna}
                        onChange={e => setHorarioForm(f => ({ ...f, alterna: e.target.checked }))}
                      />
                      ¿Alterna semanas? (semana A / semana B)
                    </label>

                    {horarioForm.alterna && (
                      <>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">Días - Semana B</label>
                          <div className="flex gap-1.5">
                            {DIAS.map(d => (
                              <button
                                key={d.value}
                                type="button"
                                onClick={() => toggleDia('diasB', d.value)}
                                className={`rounded-md px-2 py-1 text-xs font-medium ${
                                  horarioForm.diasB.includes(d.value)
                                    ? 'bg-primary text-white'
                                    : 'bg-white text-gray-600 border border-gray-300'
                                }`}
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Fecha de referencia (un día que sabés que fue semana A)
                          </label>
                          <input
                            type="date"
                            value={horarioForm.fechaReferencia}
                            onChange={e => setHorarioForm(f => ({ ...f, fechaReferencia: e.target.value }))}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => guardarHorario(emp.id)}
                        disabled={savingHorario || horarioForm.diasA.length === 0}
                        className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
                      >
                        {savingHorario ? '...' : 'Guardar horario'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingHorarioFor(null)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Servicios */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Servicios <span className="ml-1 text-sm font-normal text-gray-400">({servicios.length})</span>
          </h2>
          <button
            onClick={() => setShowSvcForm(v => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark"
          >
            <Plus size={14} /> Agregar
          </button>
        </div>

        {showSvcForm && (
          <form onSubmit={addServicio} className="mb-3 rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Nombre del servicio</label>
                <input
                  required
                  value={svcForm.nombre}
                  onChange={e => setSvcForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Baño y corte"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Tamaño</label>
                <select
                  value={svcForm.tamano}
                  onChange={e => setSvcForm(f => ({ ...f, tamano: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="chico">Chico</option>
                  <option value="mediano">Mediano</option>
                  <option value="grande">Grande</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Duración (min)</label>
                <input
                  required
                  type="number"
                  min="15"
                  step="15"
                  value={svcForm.duracion_minutos}
                  onChange={e => setSvcForm(f => ({ ...f, duracion_minutos: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Precio ($)</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={svcForm.precio}
                  onChange={e => setSvcForm(f => ({ ...f, precio: e.target.value }))}
                  placeholder="2500"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingSvc}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
              >
                {savingSvc ? '...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setShowSvcForm(false)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {servicios.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Sin servicios todavía</p>
          ) : (
            servicios.map(svc => (
              <div key={svc.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-gray-900">{svc.nombre}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {svc.tamano} · {svc.duracion_minutos} min
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  ${Number(svc.precio).toLocaleString('es-AR')}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Estado n8n */}
      <section>
        {cliente.n8n_activo ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <h2 className="text-sm font-semibold text-green-800">Activo en n8n</h2>
            </div>
            <ul className="space-y-1 text-sm text-green-700 font-mono">
              <li>/webhook/<strong>{cliente.slug}</strong>-reservas</li>
              <li>/webhook/<strong>{cliente.slug}</strong>-cancelar-turno</li>
              <li>/webhook/<strong>{cliente.slug}</strong>-modificar-turno</li>
            </ul>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="mb-2 text-sm font-semibold text-amber-800">Próximo paso: activar en n8n</h2>
            <p className="text-sm text-amber-700 mb-4">
              Clona y configura los 5 workflows automáticamente para{' '}
              <span className="font-mono font-semibold">{cliente.slug}</span>.
            </p>
            {n8nError && (
              <p className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {n8nError}
              </p>
            )}
            <button
              onClick={activarEnN8n}
              disabled={activando}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
            >
              {activando ? (
                <>
                  <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Activando workflows...
                </>
              ) : (
                'Activar en n8n'
              )}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

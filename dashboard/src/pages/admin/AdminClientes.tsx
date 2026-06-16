import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Cliente {
  id: string;
  nombre: string;
  slug: string;
  mail_dueno: string;
  calendar_id: string | null;
  plan: string;
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function AdminClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: '', mail_dueno: '', calendar_id: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadClientes(); }, []);

  async function loadClientes() {
    setLoading(true);
    const { data } = await supabase.from('clientes').select('*').order('created_at');
    setClientes(data ?? []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const slug = slugify(form.nombre);
    const { error: err } = await supabase.from('clientes').insert({
      nombre: form.nombre,
      slug,
      mail_dueno: form.mail_dueno,
      calendar_id: form.calendar_id || form.mail_dueno,
    });
    if (err) {
      setError(err.message);
    } else {
      setForm({ nombre: '', mail_dueno: '', calendar_id: '' });
      setShowForm(false);
      loadClientes();
    }
    setSaving(false);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="mt-1 text-sm text-gray-500">
            {clientes.length} negocio{clientes.length !== 1 ? 's' : ''} en el sistema
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          <Plus size={16} />
          Nuevo cliente
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
        >
          <h2 className="text-base font-semibold text-gray-900">Nuevo cliente</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nombre del negocio</label>
              <input
                required
                type="text"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Peluquería Feliz"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {form.nombre && (
                <p className="mt-1 text-xs text-gray-400">
                  Webhook: /webhook/<strong>{slugify(form.nombre)}</strong>-reservas
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email del dueño</label>
              <input
                required
                type="email"
                value={form.mail_dueno}
                onChange={e => setForm(f => ({ ...f, mail_dueno: e.target.value }))}
                placeholder="dueno@negocio.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Gmail del negocio <span className="font-normal text-gray-400">(para Google Calendar)</span>
              </label>
              <input
                type="email"
                value={form.calendar_id}
                onChange={e => setForm(f => ({ ...f, calendar_id: e.target.value }))}
                placeholder="Igual al email del dueño si usa Gmail"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1 text-xs text-gray-400">
                El dueño debe compartir su Google Calendar con la cuenta de n8n antes de activar.
                Si se deja vacío se usa el email del dueño.
              </p>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Crear cliente'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null); }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          [1, 2].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />)
        ) : clientes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
            <Building2 size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-400">No hay clientes todavía</p>
          </div>
        ) : (
          clientes.map(c => (
            <Link
              key={c.id}
              to={`/admin/clientes/${c.id}`}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div>
                <p className="font-semibold text-gray-900">{c.nombre}</p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {c.mail_dueno} · <span className="font-mono">{c.slug}</span>
                </p>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

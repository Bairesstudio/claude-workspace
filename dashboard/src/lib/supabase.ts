import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

let clienteIdCache: string | null = null;

export async function getClienteId(): Promise<string> {
  if (clienteIdCache) return clienteIdCache;

  const slug = import.meta.env.VITE_CLIENTE_SLUG;
  const { data, error } = await supabase
    .from('clientes')
    .select('id')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    throw new Error(`No se encontró el cliente con slug "${slug}".`);
  }

  clienteIdCache = data.id;
  return data.id;
}

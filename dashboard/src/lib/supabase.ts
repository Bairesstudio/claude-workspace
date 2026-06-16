import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

let clienteIdCache: string | null = null;

export function clearClienteIdCache() {
  clienteIdCache = null;
}

export async function getClienteId(): Promise<string> {
  if (clienteIdCache) return clienteIdCache;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data, error } = await supabase
    .from('user_profiles')
    .select('cliente_id')
    .eq('user_id', user.id)
    .single();

  if (error || !data) throw new Error('Perfil de usuario no encontrado.');

  clienteIdCache = data.cliente_id;
  return data.cliente_id;
}

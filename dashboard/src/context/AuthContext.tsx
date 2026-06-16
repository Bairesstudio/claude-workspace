import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, clearClienteIdCache } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  negocioNombre: string;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchNegocioNombre(userId: string): Promise<string> {
  const { data } = await supabase
    .from('user_profiles')
    .select('clientes(nombre)')
    .eq('user_id', userId)
    .single();
  return (data?.clientes as unknown as { nombre: string } | null)?.nombre ?? '';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [negocioNombre, setNegocioNombre] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setNegocioNombre(await fetchNegocioNombre(session.user.id));
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setNegocioNombre(await fetchNegocioNombre(session.user.id));
      } else {
        setNegocioNombre('');
        clearClienteIdCache();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    clearClienteIdCache();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, negocioNombre, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, clearClienteIdCache } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  negocioNombre: string;
  role: string;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchUserProfile(userId: string): Promise<{ negocioNombre: string; role: string }> {
  const { data } = await supabase
    .from('user_profiles')
    .select('role, clientes(nombre)')
    .eq('user_id', userId)
    .single();
  const negocioNombre = (data?.clientes as unknown as { nombre: string } | null)?.nombre ?? '';
  const role = (data as { role?: string } | null)?.role ?? 'client';
  return { negocioNombre, role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [negocioNombre, setNegocioNombre] = useState('');
  const [role, setRole] = useState('client');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        setNegocioNombre(profile.negocioNombre);
        setRole(profile.role);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        setNegocioNombre(profile.negocioNombre);
        setRole(profile.role);
      } else {
        setNegocioNombre('');
        setRole('client');
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
    <AuthContext.Provider value={{ user, negocioNombre, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

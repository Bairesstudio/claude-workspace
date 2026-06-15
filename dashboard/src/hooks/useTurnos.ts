import { useCallback, useEffect, useState } from 'react';
import { supabase, getClienteId } from '../lib/supabase';
import type { TurnoConNombres } from '../types';

interface UseTurnosResult {
  turnos: TurnoConNombres[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function minutosAHora(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function useTurnos(): UseTurnosResult {
  const [turnos, setTurnos] = useState<TurnoConNombres[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTurnos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const clienteId = await getClienteId();
      const { data, error: queryError } = await supabase
        .from('turnos')
        .select('*, servicios(nombre), empleados(nombre)')
        .eq('cliente_id', clienteId)
        .order('fecha', { ascending: true })
        .order('inicio_minutos', { ascending: true });

      if (queryError) throw queryError;

      const mapeados: TurnoConNombres[] = (data ?? []).map((fila) => {
        const { servicios, empleados, ...turno } = fila as typeof fila & {
          servicios: { nombre: string } | null;
          empleados: { nombre: string } | null;
        };

        return {
          ...turno,
          hora: minutosAHora(turno.inicio_minutos),
          servicio_nombre: servicios?.nombre ?? '',
          empleado_nombre: empleados?.nombre ?? '',
        };
      });

      setTurnos(mapeados);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los turnos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTurnos();
  }, [fetchTurnos]);

  return { turnos, loading, error, refetch: fetchTurnos };
}

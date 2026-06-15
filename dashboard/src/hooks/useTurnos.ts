import { useCallback, useState } from 'react';
import { mockTurnos } from '../data/mockData';
import type { TurnoConNombres } from '../types';

interface UseTurnosResult {
  turnos: TurnoConNombres[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTurnos(): UseTurnosResult {
  const [turnos] = useState<TurnoConNombres[]>(mockTurnos);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const refetch = useCallback(() => {
    // Mock data: nothing to refetch yet.
  }, []);

  return { turnos, loading, error, refetch };
}

import type { TurnoConNombres } from '../types';

export interface MetricaItem {
  nombre: string;
  cantidad: number;
  total: number;
}

export interface Metricas {
  totalFacturado: number;
  cantidadTurnos: number;
  porServicio: MetricaItem[];
  porEmpleado: MetricaItem[];
}

function agruparPor(
  turnos: TurnoConNombres[],
  key: 'servicio_nombre' | 'empleado_nombre',
): MetricaItem[] {
  const grupos = new Map<string, MetricaItem>();
  for (const turno of turnos) {
    const nombre = turno[key];
    const actual = grupos.get(nombre) ?? { nombre, cantidad: 0, total: 0 };
    actual.cantidad += 1;
    actual.total += turno.precio_servicio;
    grupos.set(nombre, actual);
  }
  return Array.from(grupos.values()).sort((a, b) => b.total - a.total);
}

export function calcularMetricas(turnos: TurnoConNombres[]): Metricas {
  const confirmados = turnos.filter((t) => t.estado === 'confirmado');
  return {
    totalFacturado: confirmados.reduce((acc, t) => acc + t.precio_servicio, 0),
    cantidadTurnos: confirmados.length,
    porServicio: agruparPor(confirmados, 'servicio_nombre'),
    porEmpleado: agruparPor(confirmados, 'empleado_nombre'),
  };
}

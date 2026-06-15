import { format, parseISO, isSameDay, isBefore, isAfter, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Turno, TurnoConNombres } from '../types';

export function formatFecha(fecha: string): string {
  return format(parseISO(fecha), "EEEE d 'de' MMMM", { locale: es });
}

export function isHoyFecha(fecha: string, hoy: Date = new Date()): boolean {
  return isSameDay(parseISO(fecha), hoy);
}

export function isFuturo(fecha: string, hoy: Date = new Date()): boolean {
  return isAfter(startOfDay(parseISO(fecha)), startOfDay(hoy));
}

export function isPasado(fecha: string, hoy: Date = new Date()): boolean {
  return isBefore(startOfDay(parseISO(fecha)), startOfDay(hoy));
}

export function agruparPorFecha<T extends Turno>(turnos: T[]): Array<{ fecha: string; turnos: T[] }> {
  const grupos = new Map<string, T[]>();
  for (const turno of turnos) {
    const lista = grupos.get(turno.fecha) ?? [];
    lista.push(turno);
    grupos.set(turno.fecha, lista);
  }
  return Array.from(grupos.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, turnos]) => ({
      fecha,
      turnos: turnos.sort((a, b) => a.hora.localeCompare(b.hora)),
    }));
}

export type { TurnoConNombres };

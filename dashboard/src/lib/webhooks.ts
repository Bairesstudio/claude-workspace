import type { WebhookResponse } from '../types';
import { supabase } from './supabase';


export async function cancelarTurno(turnoId: string): Promise<WebhookResponse> {
  const { error } = await supabase
    .from('turnos')
    .update({ estado: 'cancelado' })
    .eq('id', turnoId);
  if (error) return { ok: false, message: 'No se pudo cancelar el turno.' };
  return { ok: true, message: 'Turno cancelado.' };
}

export async function modificarTurno(
  turnoId: string,
  fecha: string,
  hora: string,
  duracionMinutos: number,
): Promise<WebhookResponse> {
  const [h, m] = hora.split(':').map(Number);
  const inicioMinutos = h * 60 + m;
  const { error } = await supabase
    .from('turnos')
    .update({
      fecha,
      inicio_minutos: inicioMinutos,
      fin_minutos: inicioMinutos + duracionMinutos,
    })
    .eq('id', turnoId)
    .select('id');
  if (error) return { ok: false, message: 'No se pudo reprogramar el turno.' };
  return { ok: true, message: 'Turno reprogramado.' };
}

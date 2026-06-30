import type { WebhookResponse } from '../types';
import { supabase } from './supabase';

const BASE_URL = import.meta.env.VITE_N8N_BASE_URL as string;

async function postWebhook(path: string, body: unknown): Promise<WebhookResponse> {
  try {
    const res = await fetch(`${BASE_URL}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as WebhookResponse;
    return data;
  } catch {
    return { ok: false, message: 'No se pudo conectar con el servidor. Intentá de nuevo.' };
  }
}

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

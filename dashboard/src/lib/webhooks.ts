import type { WebhookResponse } from '../types';

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

export function cancelarTurno(turnoId: string): Promise<WebhookResponse> {
  return postWebhook('pajaro-loco-cancelar-turno', { turno_id: turnoId });
}

export function modificarTurno(
  turnoId: string,
  fecha: string,
  hora: string,
): Promise<WebhookResponse> {
  return postWebhook('pajaro-loco-modificar-turno', { turno_id: turnoId, fecha, hora });
}

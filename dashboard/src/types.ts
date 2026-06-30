export interface Cliente {
  id: string;
  slug: string;
  nombre: string;
  mail_dueno: string;
}

export interface Turno {
  id: string;
  cliente_id: string;
  empleado_id: string;
  servicio_id: string;
  fecha: string; // 'YYYY-MM-DD'
  hora: string; // 'HH:MM'
  inicio_minutos: number;
  fin_minutos: number;
  duracion_minutos: number;
  estado: 'confirmado' | 'cancelado';
  precio_servicio: number;
  email: string | null;
  telefono: string | null;
  nombre_cliente: string;
  mascota_nombre: string;
  mascota_raza: string;
  mascota_tamano: string;
  calendar_event_id: string | null;
}

export interface Servicio {
  id: string;
  cliente_id: string;
  nombre: string;
}

export interface Empleado {
  id: string;
  cliente_id: string;
  nombre: string;
}

export interface TurnoConNombres extends Turno {
  servicio_nombre: string;
  empleado_nombre: string;
}

export interface WebhookResponse {
  ok: boolean;
  message: string;
}

import type { OpenRoom } from '@devoh/protocol';
import { API_BASE } from '../../../shared/lib/env';

/** Salas públicas esperando oponente (GET /api/rooms no servidor de duelos). */
export async function fetchOpenRooms(signal?: AbortSignal): Promise<OpenRoom[]> {
  const res = await fetch(`${API_BASE}/rooms`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as OpenRoom[];
}

/** "há 2 min", "agora há pouco". */
export function waitingLabel(ms: number) {
  const min = Math.floor(ms / 60000);
  return min < 1 ? 'agora há pouco' : `há ${min} min`;
}

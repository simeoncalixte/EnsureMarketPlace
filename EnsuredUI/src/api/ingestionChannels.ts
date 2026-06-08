// Ingestion channels API — requests under `/api/ingestion-channels`.
//
// Channel CRUD returns parsed JSON; queue/broker operations whose callers branch
// on the response body or status (RabbitMQ listing/test/create, queue deletes,
// per-queue config) return the raw `Response`. Queue names are URL-encoded here.
import { apiRequest, getJson, postJson, patchJson } from './client';

export interface ApiChannel {
  id: number;
  organizationId?: number | null;
  type: string;
  label: string;
  enabled: boolean;
  status: string;
  meta: string | null;
  config: Record<string, unknown>;
  submissionCount?: number;
}

export type CreateChannelInput = {
  type: string;
  label?: string;
  organizationId?: number | null;
  enabled?: boolean;
  status?: string;
  meta?: string;
  config?: Record<string, unknown>;
};

export type ChannelPatch = Partial<Pick<ApiChannel, 'enabled' | 'status' | 'meta' | 'config' | 'label'>>;

const ROOT = '/api/ingestion-channels';

// ─── Channel CRUD ──────────────────────────────────────────────────────────────
/** GET /api/ingestion-channels (optionally scoped to an organization). */
export function listChannels(organizationId?: number): Promise<ApiChannel[]> {
  const path = organizationId !== undefined ? `${ROOT}?organizationId=${organizationId}` : ROOT;
  return getJson<ApiChannel[]>(path);
}

/** GET /api/ingestion-channels/{id}. */
export function getChannel(id: number | string): Promise<ApiChannel> {
  return getJson<ApiChannel>(`${ROOT}/${id}`);
}

/** POST /api/ingestion-channels. */
export function createChannel(body: CreateChannelInput): Promise<ApiChannel> {
  return postJson<ApiChannel>(ROOT, body);
}

/** PATCH /api/ingestion-channels/{id}. */
export function patchChannel(id: number | string, patch: ChannelPatch): Promise<ApiChannel> {
  return patchJson<ApiChannel>(`${ROOT}/${id}`, patch);
}

/** DELETE /api/ingestion-channels/{id}. Raw Response (caller tolerates 204). */
export function deleteChannel(id: number | string): Promise<Response> {
  return apiRequest(`${ROOT}/${id}`, { method: 'DELETE' });
}

// ─── Connection testing ────────────────────────────────────────────────────────
/** POST /api/ingestion-channels/{id}/test-connection — test a saved channel. Raw Response. */
export function testConnection(id: number | string): Promise<Response> {
  return apiRequest(`${ROOT}/${id}/test-connection`, { method: 'POST' });
}

/** POST /api/ingestion-channels/test-connection — test unsaved RabbitMQ settings. Raw Response. */
export function testConnectionAdhoc(body: { clusterUrl: string; port: string; vhost: string }): Promise<Response> {
  return apiRequest(`${ROOT}/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Queues ────────────────────────────────────────────────────────────────────
/** GET /api/ingestion-channels/{id}/queues — management listing. Raw Response (caller checks Array.isArray). */
export function listQueues(id: number | string): Promise<Response> {
  return apiRequest(`${ROOT}/${id}/queues`, { method: 'GET' });
}

/** POST /api/ingestion-channels/{id}/queues — stats-by-name fallback. Raw Response. */
export function queueStatsByNames(id: number | string, queueNames: string[]): Promise<Response> {
  return apiRequest(`${ROOT}/${id}/queues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queueNames }),
  });
}

/** POST /api/ingestion-channels/{id}/queues/create — create a broker queue. Raw Response (caller reads body.error). */
export function createQueue(
  id: number | string,
  body: { queueName: string; durable: boolean; autoDelete: boolean },
): Promise<Response> {
  return apiRequest(`${ROOT}/${id}/queues/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** DELETE /api/ingestion-channels/{id}/queues/{name} — delete a broker queue. Raw Response (caller tolerates 204). */
export function deleteQueue(id: number | string, queueName: string): Promise<Response> {
  return apiRequest(`${ROOT}/${id}/queues/${encodeURIComponent(queueName)}`, { method: 'DELETE' });
}

/** PATCH /api/ingestion-channels/{id}/queues-config — drop a queue from saved config. Raw Response. */
export function updateQueuesConfig(id: number | string, body: { queueName: string }): Promise<Response> {
  return apiRequest(`${ROOT}/${id}/queues-config`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** PATCH /api/ingestion-channels/{id}/queues/{name}/config — per-queue routing config. Raw Response. */
export function updateQueueConfig(id: number | string, queueName: string, body: unknown): Promise<Response> {
  return apiRequest(`${ROOT}/${id}/queues/${encodeURIComponent(queueName)}/config`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Submissions ───────────────────────────────────────────────────────────────
/** GET /api/ingestion-channels/{id}/submissions — submissions for a channel. Raw Response. */
export function getChannelSubmissions(id: number | string): Promise<Response> {
  return apiRequest(`${ROOT}/${id}/submissions`, { method: 'GET' });
}

import { useState, useEffect, useCallback } from 'react';
import { getApiBase } from '../lib/api';

export type ChannelType   = 'rabbitmq' | 'email-sso' | 'cloud-storage' | 'sftp' | 'webhooks';
export type ChannelStatus = 'active' | 'syncing' | 'idle' | 'error';

export interface Channel {
  id: string;
  dbId: number;
  type: ChannelType;
  enabled: boolean;
  status: ChannelStatus;
  meta: string;
  config: Record<string, unknown>;
  organizationId?: number | null;
}

interface ApiChannel {
  id: number;
  organizationId?: number | null;
  type: string;
  label: string;
  enabled: boolean;
  status: string;
  meta: string | null;
  config: Record<string, unknown>;
}

function toChannel(a: ApiChannel): Channel {
  const orgId = a.organizationId ?? (a as any).tenantId ?? null;
  return {
    id:     `ch-${a.id}`,
    dbId:   a.id,
    type:   a.type as ChannelType,
    enabled: a.enabled,
    status: (a.status as ChannelStatus) ?? 'idle',
    meta:   a.meta ?? '',
    config: a.config ?? {},
    organizationId: orgId,
  };
}

export interface UseIngestionChannelsResult {
  channels:       Channel[];
  loading:        boolean;
  error:          string | null;
  addChannel:     (type: ChannelType, label: string, meta: string, organizationId?: number) => Promise<Channel>;
  toggleChannel:  (id: string, enabled: boolean) => Promise<void>;
  updateStatus:   (id: string, status: ChannelStatus) => Promise<void>;
  removeChannel:  (id: string) => Promise<void>;
  saveConfig:     (id: string, config: Record<string, unknown>) => Promise<void>;
}

export function useIngestionChannels(organizationId?: number): UseIngestionChannelsResult {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const base = getApiBase();

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = organizationId !== undefined
        ? `${base}/api/ingestion-channels?organizationId=${organizationId}`
        : `${base}/api/ingestion-channels`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to load channels: ${res.status}`);
      const data: ApiChannel[] = await res.json();
      setChannels(data.map(toChannel));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [base, organizationId]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const addChannel = useCallback(
    async (type: ChannelType, label: string, meta: string, orgId?: number): Promise<Channel> => {
      const res = await fetch(`${base}/api/ingestion-channels`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId ?? organizationId ?? undefined,
          type,
          label,
          enabled: false,
          status:  'idle',
          meta,
          config:  {},
        }),
      });
      if (!res.ok) throw new Error(`Failed to create channel: ${res.status}`);
      const data: ApiChannel = await res.json();
      const ch = toChannel(data);
      setChannels((prev) => [...prev, ch]);
      return ch;
    },
    [base, organizationId]
  );

  const patchChannel = useCallback(
    async (id: string, patch: Partial<Pick<ApiChannel, 'enabled' | 'status' | 'meta' | 'config' | 'label'>>) => {
      const ch = channels.find((c) => c.id === id);
      if (!ch) return;
      const res = await fetch(`${base}/api/ingestion-channels/${ch.dbId}`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`Failed to update channel: ${res.status}`);
      const data: ApiChannel = await res.json();
      const updated = toChannel(data);
      setChannels((prev) => prev.map((c) => (c.id === id ? updated : c)));
    },
    [base, channels]
  );

  const toggleChannel = useCallback(
    async (id: string, enabled: boolean) => {
      await patchChannel(id, { enabled, status: enabled ? 'active' : 'idle' });
    },
    [patchChannel]
  );

  const updateStatus = useCallback(
    async (id: string, status: ChannelStatus) => {
      await patchChannel(id, { status });
    },
    [patchChannel]
  );

  const saveConfig = useCallback(
    async (id: string, config: Record<string, unknown>) => {
      await patchChannel(id, { config });
    },
    [patchChannel]
  );

  const removeChannel = useCallback(
    async (id: string) => {
      const ch = channels.find((c) => c.id === id);
      if (!ch) return;
      const res = await fetch(`${base}/api/ingestion-channels/${ch.dbId}`, {
        method:      'DELETE',
        credentials: 'include',
      });
      if (!res.ok && res.status !== 204) throw new Error(`Failed to delete channel: ${res.status}`);
      setChannels((prev) => prev.filter((c) => c.id !== id));
    },
    [base, channels]
  );

  return { channels, loading, error, addChannel, toggleChannel, updateStatus, removeChannel, saveConfig };
}

import { useState, useEffect, useCallback } from 'react';
import {
  listChannels,
  createChannel,
  patchChannel as apiPatchChannel,
  deleteChannel,
  type ApiChannel,
} from '../api/ingestionChannels';

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
  submissionCount: number;
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
    submissionCount: a.submissionCount ?? 0,
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

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listChannels(organizationId);
      setChannels(data.map(toChannel));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const addChannel = useCallback(
    async (type: ChannelType, label: string, meta: string, orgId?: number): Promise<Channel> => {
      const data = await createChannel({
        organizationId: orgId ?? organizationId ?? undefined,
        type,
        label,
        enabled: false,
        status:  'idle',
        meta,
        config:  {},
      });
      const ch = toChannel(data);
      setChannels((prev) => [...prev, ch]);
      return ch;
    },
    [organizationId]
  );

  const patchChannel = useCallback(
    async (id: string, patch: Partial<Pick<ApiChannel, 'enabled' | 'status' | 'meta' | 'config' | 'label'>>) => {
      const ch = channels.find((c) => c.id === id);
      if (!ch) return;
      const data = await apiPatchChannel(ch.dbId, patch);
      const updated = toChannel(data);
      setChannels((prev) => prev.map((c) => (c.id === id ? updated : c)));
    },
    [channels]
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
      const res = await deleteChannel(ch.dbId);
      if (!res.ok && res.status !== 204) throw new Error(`Failed to delete channel: ${res.status}`);
      setChannels((prev) => prev.filter((c) => c.id !== id));
    },
    [channels]
  );

  return { channels, loading, error, addChannel, toggleChannel, updateStatus, removeChannel, saveConfig };
}

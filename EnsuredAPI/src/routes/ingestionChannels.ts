import { FastifyPluginAsync } from 'fastify';
import { IngestionChannel } from '../db/models';
import { resolveOrganizationIdFromRequest } from '../lib/org';

export const ingestionChannelsRoute: FastifyPluginAsync = async (app) => {
  // List all channels for a tenant
  app.get(
    '/ingestion-channels',
    {
      schema: {
        description: 'List ingestion channels',
        querystring: {
          type: 'object',
          properties: {
            organizationId: { type: 'integer' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                organizationId: { type: ['integer', 'null'] },
                type: { type: 'string' },
                label: { type: 'string' },
                enabled: { type: 'boolean' },
                status: { type: 'string' },
                meta: { type: ['string', 'null'] },
                config: { type: 'object' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const { organizationId } = request.query as { organizationId?: number };
      const where: Record<string, unknown> = {};

      // If caller didn't provide an explicit organizationId, try to derive
      // it from the Authorization token (JWT -> user -> organizationId).
      let resolvedOrg: number | null | undefined = organizationId;
      if (resolvedOrg === undefined || resolvedOrg === null) {
        try {
          // resolveOrganizationIdFromRequest returns null on missing/invalid token
          // eslint-disable-next-line no-await-in-loop
          const fromToken = await resolveOrganizationIdFromRequest(request);
          if (fromToken != null) resolvedOrg = fromToken;
        } catch (err) {
          // ignore resolution errors and proceed without organization filter
        }
      }

      if (resolvedOrg !== undefined && resolvedOrg !== null) {
        // store organization id in the tenantId DB column (legacy column)
        where['tenantId'] = resolvedOrg;
      }

      const channels = await IngestionChannel.findAll({ where, order: [['id', 'ASC']] });
      return channels.map((c) => {
        const json = c.toJSON() as Record<string, unknown>;
        // expose organizationId while preserving legacy tenantId in DB
        // prefer existing organizationId property if set, otherwise map tenantId
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        json.organizationId = json.organizationId ?? json.tenantId ?? null;
        return json;
      });
    }
  );

  // Create a new channel
  app.post(
    '/ingestion-channels',
    {
      schema: {
        description: 'Create an ingestion channel',
        body: {
          type: 'object',
          required: ['type', 'label'],
          properties: {
            organizationId: { type: 'integer' },
            type: { type: 'string' },
            label: { type: 'string' },
            enabled: { type: 'boolean' },
            status: { type: 'string' },
            meta: { type: 'string' },
            config: { type: 'object' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              organizationId: { type: ['integer', 'null'] },
              type: { type: 'string' },
              label: { type: 'string' },
              enabled: { type: 'boolean' },
              status: { type: 'string' },
              meta: { type: ['string', 'null'] },
              config: { type: 'object' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        organizationId?: number;
        type: string;
        label: string;
        enabled?: boolean;
        status?: string;
        meta?: string;
        config?: Record<string, unknown>;
      };
      // Determine which organization to associate with this channel. If the
      // caller provided `organizationId` in the body, prefer it. Otherwise try
      // to resolve it from the Authorization token.
      let orgToPersist: number | null = body.organizationId ?? null;
      if (orgToPersist == null) {
        try {
          const fromToken = await resolveOrganizationIdFromRequest(request);
          if (fromToken != null) orgToPersist = fromToken;
        } catch (err) {
          // ignore and allow null tenantId (admin callers may provide explicit org)
        }
      }

      const channel = await IngestionChannel.create({
        // persist organization id into the existing tenantId column for compatibility
        tenantId: orgToPersist,
        type: body.type,
        label: body.label,
        enabled: body.enabled ?? false,
        status: body.status ?? 'idle',
        meta: body.meta ?? null,
        config: body.config ?? {},
      });
      reply.code(201);
      const created = channel.toJSON() as Record<string, unknown>;
      // expose organizationId alias
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      created.organizationId = created.organizationId ?? created.tenantId ?? null;
      return created;
    }
  );

  // Get a single channel by id
  app.get(
    '/ingestion-channels/:id',
    {
      schema: {
        description: 'Get an ingestion channel by id',
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              organizationId: { type: ['integer', 'null'] },
              type: { type: 'string' },
              label: { type: 'string' },
              enabled: { type: 'boolean' },
              status: { type: 'string' },
              meta: { type: ['string', 'null'] },
              config: { type: 'object' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const channel = await IngestionChannel.findByPk(id);
      if (!channel) {
        reply.code(404);
        return { error: 'Channel not found' };
      }
      const json = channel.toJSON() as Record<string, unknown>;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      json.organizationId = json.organizationId ?? json.tenantId ?? null;
      return json;
    }
  );

  // Update a channel (toggle enabled, status, meta, config)
  app.patch(
    '/ingestion-channels/:id',
    {
      schema: {
        description: 'Update an ingestion channel',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer' },
          },
        },
        body: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
            enabled: { type: 'boolean' },
            status: { type: 'string' },
            label: { type: 'string' },
            meta: { type: 'string' },
            config: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              tenantId: { type: ['integer', 'null'] },
              type: { type: 'string' },
              label: { type: 'string' },
              enabled: { type: 'boolean' },
              status: { type: 'string' },
              meta: { type: ['string', 'null'] },
              config: { type: 'object' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const body = request.body as {
        organizationId?: number | null;
        enabled?: boolean;
        status?: string;
        label?: string;
        meta?: string;
        config?: Record<string, unknown>;
      };
      const channel = await IngestionChannel.findByPk(id);
      if (!channel) {
        reply.code(404);
        return { error: 'Channel not found' };
      }
      const updatePayload: Record<string, unknown> = { ...(body as any) };
      if (Object.prototype.hasOwnProperty.call(body, 'organizationId')) {
        // map organizationId to tenantId column for compatibility
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        updatePayload.tenantId = body.organizationId ?? null;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete updatePayload.organizationId;
      }
      await channel.update(updatePayload);
      const updated = channel.toJSON() as Record<string, unknown>;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      updated.organizationId = updated.organizationId ?? updated.tenantId ?? null;
      return updated;
    }
  );

  // Delete a channel
  app.delete(
    '/ingestion-channels/:id',
    {
      schema: {
        description: 'Delete an ingestion channel',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer' },
          },
        },
        response: {
          204: { type: 'null' },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const channel = await IngestionChannel.findByPk(id);
      if (!channel) {
        reply.code(404);
        return { error: 'Channel not found' };
      }
      await channel.destroy();
      reply.code(204);
    }
  );

  // Test connection using posted config (form values)
  app.post(
    '/ingestion-channels/test-connection',
    {
      schema: {
        description: 'Test an AMQP connection using posted config',
        body: {
          type: 'object',
          properties: {
            uri: { type: 'string' },
            clusterUrl: { type: 'string' },
            port: { type: ['string', 'integer'] },
            vhost: { type: 'string' },
            username: { type: 'string' },
            password: { type: 'string' },
          },
        },
        response: {
          200: { type: 'object', properties: { ok: { type: 'boolean' }, error: { type: 'string' } } },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as Record<string, unknown>;
      const uriCandidate = typeof body.uri === 'string' ? String(body.uri) : undefined;

      function buildUriFromBody(): string {
        if (uriCandidate) return uriCandidate;
        const clusterUrl = typeof body.clusterUrl === 'string' ? String(body.clusterUrl) : '';
        const port = body.port ? String(body.port) : '';
        const vhost = typeof body.vhost === 'string' ? String(body.vhost) : '';
        const username = typeof body.username === 'string' ? String(body.username) : '';
        const password = typeof body.password === 'string' ? String(body.password) : '';

        try {
          const parsed = new URL(clusterUrl);
          if (username) parsed.username = username;
          if (password) parsed.password = password;
          if (port) parsed.port = port;
          if (vhost) parsed.pathname = vhost.startsWith('/') ? vhost : `/${vhost}`;
          return parsed.toString();
        } catch (e) {
          const proto = clusterUrl.startsWith('amqp') ? '' : 'amqp://';
          const auth = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
          const portPart = port ? `:${port}` : '';
          const path = vhost ? `/${encodeURIComponent(vhost)}` : '';
          return `${proto}${auth}${clusterUrl}${portPart}${path}`;
        }
      }

      const uri = buildUriFromBody();

      const amqpTest = async (testUri: string) => {
        // @ts-ignore: amqplib is an optional runtime dependency without types here
        const amqplib = await import('amqplib');
        let conn: any = null;
        const connectPromise = (async () => {
          conn = await (amqplib as any).connect(testUri);
          await conn.close();
        })();
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out')), 7000));
        await Promise.race([connectPromise, timeout]);
      };

      try {
        await amqpTest(uri);
        return { ok: true };
      } catch (err: any) {
        reply.code(400);
        return { ok: false, error: err?.message ?? String(err) };
      }
    }
  );

  // Test connection for an existing saved channel by id
  app.post(
    '/ingestion-channels/:id/test-connection',
    {
      schema: {
        description: 'Test saved channel connection by id',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
        response: { 200: { type: 'object', properties: { ok: { type: 'boolean' }, error: { type: 'string' } } } },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const channel = await IngestionChannel.findByPk(id);
      if (!channel) {
        reply.code(404);
        return { ok: false, error: 'Channel not found' };
      }

      // Build URI from stored meta and config
      const meta = (channel.get('meta') as string) ?? '';
      const config = (channel.get('config') as Record<string, unknown>) ?? {};

      const bodyLike: Record<string, unknown> = { uri: meta, ...config };

      // Reuse test logic
      function buildUriFromStored(): string {
        const uriCandidate = typeof bodyLike.uri === 'string' ? String(bodyLike.uri) : undefined;
        if (uriCandidate) return uriCandidate;
        const clusterUrl = typeof bodyLike.clusterUrl === 'string' ? String(bodyLike.clusterUrl) : '';
        const port = bodyLike.port ? String(bodyLike.port) : '';
        const vhost = typeof bodyLike.vhost === 'string' ? String(bodyLike.vhost) : '';
        const username = typeof bodyLike.username === 'string' ? String(bodyLike.username) : '';
        const password = typeof bodyLike.password === 'string' ? String(bodyLike.password) : '';

        try {
          const parsed = new URL(clusterUrl);
          if (username) parsed.username = username;
          if (password) parsed.password = password;
          if (port) parsed.port = port;
          if (vhost) parsed.pathname = vhost.startsWith('/') ? vhost : `/${vhost}`;
          return parsed.toString();
        } catch (e) {
          const proto = clusterUrl.startsWith('amqp') ? '' : 'amqp://';
          const auth = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
          const portPart = port ? `:${port}` : '';
          const path = vhost ? `/${encodeURIComponent(vhost)}` : '';
          return `${proto}${auth}${clusterUrl}${portPart}${path}`;
        }
      }

      const uri = buildUriFromStored();

      try {
        // @ts-ignore: amqplib is an optional runtime dependency without types here
        const amqplib = await import('amqplib');
        let conn: any = null;
        const connectPromise = (async () => {
          conn = await (amqplib as any).connect(uri);
          await conn.close();
        })();
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out')), 7000));
        await Promise.race([connectPromise, timeout]);
        return { ok: true };
      } catch (err: any) {
        reply.code(400);
        return { ok: false, error: err?.message ?? String(err) };
      }
    }
  );

  // List all queues for a saved channel using the RabbitMQ Management HTTP API
  app.get(
    '/ingestion-channels/:id/queues',
    {
      schema: {
        description: 'List all queues for a saved channel via RabbitMQ Management API',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                messages: { type: 'integer' },
                consumers: { type: 'integer' },
                vhost: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const channel = await IngestionChannel.findByPk(id);
      if (!channel) {
        reply.code(404);
        return { error: 'Channel not found' };
      }

      const config = (channel.get('config') as Record<string, unknown>) ?? {};
      const meta = (channel.get('meta') as string) ?? '';

      // Allow explicit override for management API in config
      const mgmtOverride = typeof config.managementApiUrl === 'string' ? String(config.managementApiUrl) : undefined;
      let managementBase: string | undefined = mgmtOverride;
      let authHeader: string | undefined;

      if (!managementBase) {
        // Build from AMQP URI in meta or config
        const uriCandidate = typeof config.uri === 'string' ? String(config.uri) : (typeof meta === 'string' ? meta : '');
        if (!uriCandidate) {
          reply.code(400);
          return { error: 'No management API URL or AMQP URI available for this channel' };
        }
        try {
          const parsed = new URL(uriCandidate);
          const host = parsed.hostname;
          const username = parsed.username;
          const password = parsed.password;
          const vhost = parsed.pathname && parsed.pathname !== '/' ? decodeURIComponent(parsed.pathname.slice(1)) : undefined;
          const isSecure = parsed.protocol === 'amqps:';
          const mgmtProto = isSecure ? 'https' : 'http';
          const mgmtPort = (config.managementPort as number) ?? (isSecure ? 15671 : 15672);
          managementBase = `${mgmtProto}://${host}:${mgmtPort}`;
          if (username) authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
        } catch (err: any) {
          reply.code(400);
          return { error: 'Invalid AMQP URI for channel' };
        }
      }

      try {
        const mgmtUrl = `${managementBase}/api/queues`;
        const res = await fetch(mgmtUrl, { headers: authHeader ? { Authorization: authHeader } : undefined });
        if (!res.ok) {
          reply.code(res.status);
          return { error: `Management API returned ${res.status}` };
        }
        const body = await res.json();
        const mapped = (body as any[]).map((q) => ({ name: q.name, messages: Number(q.messages ?? q.message_stats?.deliver_get ?? 0), consumers: Number(q.consumers ?? q.consumer_count ?? 0), vhost: q.vhost }));
        return mapped;
      } catch (err: any) {
        reply.code(500);
        return { error: err?.message ?? String(err) };
      }
    }
  );

    // Create a queue on the RabbitMQ broker via Management API and persist to channel config
    app.post(
      '/ingestion-channels/:id/queues/create',
      {
        schema: {
          description: 'Create a queue on the broker and save its name to channel config.queueNames',
          params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
          body: {
            type: 'object',
            required: ['queueName'],
            properties: {
              queueName: { type: 'string' },
              durable: { type: 'boolean' },
              autoDelete: { type: 'boolean' },
              arguments: { type: 'object' },
            },
          },
          response: { 200: { type: 'object' } },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: number };
        const body = request.body as { queueName: string; durable?: boolean; autoDelete?: boolean; arguments?: Record<string, unknown> };
        const channel = await IngestionChannel.findByPk(id);
        if (!channel) {
          reply.code(404);
          return { error: 'Channel not found' };
        }

        if (!body?.queueName) {
          reply.code(400);
          return { error: 'queueName is required' };
        }

        const config = (channel.get('config') as Record<string, unknown>) ?? {};
        const meta = (channel.get('meta') as string) ?? '';

        // Allow explicit override for management API in config
        const mgmtOverride = typeof config.managementApiUrl === 'string' ? String(config.managementApiUrl) : undefined;
        let managementBase: string | undefined = mgmtOverride;
        let authHeader: string | undefined;
        let vhostStr: string | undefined;

        if (!managementBase) {
          const uriCandidate = typeof config.uri === 'string' ? String(config.uri) : (typeof meta === 'string' ? meta : '');
          if (!uriCandidate) {
            reply.code(400);
            return { error: 'No management API URL or AMQP URI available for this channel' };
          }
          try {
            const parsed = new URL(uriCandidate);
            const host = parsed.hostname;
            const username = parsed.username;
            const password = parsed.password;
            const vhost = parsed.pathname && parsed.pathname !== '/' ? decodeURIComponent(parsed.pathname.slice(1)) : undefined;
            const isSecure = parsed.protocol === 'amqps:';
            const mgmtProto = isSecure ? 'https' : 'http';
            const mgmtPort = (config.managementPort as number) ?? (isSecure ? 15671 : 15672);
            managementBase = `${mgmtProto}://${host}:${mgmtPort}`;
            if (username) authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
            vhostStr = vhost;
          } catch (err: any) {
            reply.code(400);
            return { error: 'Invalid AMQP URI for channel' };
          }
        } else {
          vhostStr = typeof config.managementVhost === 'string' ? config.managementVhost : undefined;
        }

        try {
          const mgmtVhost = vhostStr ?? '/';
          const mgmtUrl = `${managementBase}/api/queues/${encodeURIComponent(mgmtVhost)}/${encodeURIComponent(body.queueName)}`;
          const payload = { durable: Boolean(body.durable ?? true), auto_delete: Boolean(body.autoDelete ?? false), arguments: body.arguments ?? {} };
          const headers = authHeader ? { Authorization: authHeader, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
          const res = await fetch(mgmtUrl, { method: 'PUT', headers, body: JSON.stringify(payload) });
          if (!res.ok && res.status !== 201 && res.status !== 204) {
            reply.code(res.status);
            const text = await res.text().catch(() => null);
            return { error: text ?? `Management API returned ${res.status}` };
          }

          // Persist queue name into channel config.queueNames if not present
          const configuredQueues = Array.isArray(config.queueNames) ? (config.queueNames as string[]) : [];
          if (!configuredQueues.includes(body.queueName)) configuredQueues.push(body.queueName);
          const newConfig = { ...config, queueNames: configuredQueues };
          await channel.update({ config: newConfig });
          const updated = channel.toJSON() as Record<string, unknown>;
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          updated.organizationId = updated.organizationId ?? updated.tenantId ?? null;
          return updated;
        } catch (err: any) {
          reply.code(500);
          return { error: err?.message ?? String(err) };
        }
      }
    );

  // Delete a specific queue from the RabbitMQ broker via Management API
  app.delete(
    '/ingestion-channels/:id/queues/:queueName',
    {
      schema: {
        description: 'Delete a queue from RabbitMQ management API',
        params: {
          type: 'object',
          required: ['id', 'queueName'],
          properties: { id: { type: 'integer' }, queueName: { type: 'string' } },
        },
        response: { 204: { type: 'null' } },
      },
    },
    async (request, reply) => {
      const { id, queueName } = request.params as { id: number; queueName: string };
      const channel = await IngestionChannel.findByPk(id);
      if (!channel) {
        reply.code(404);
        return { error: 'Channel not found' };
      }

      const config = (channel.get('config') as Record<string, unknown>) ?? {};
      const meta = (channel.get('meta') as string) ?? '';

      // Allow explicit override for management API in config
      const mgmtOverride = typeof config.managementApiUrl === 'string' ? String(config.managementApiUrl) : undefined;
      let managementBase: string | undefined = mgmtOverride;
      let authHeader: string | undefined;
      let vhostStr: string | undefined;

      if (!managementBase) {
        const uriCandidate = typeof config.uri === 'string' ? String(config.uri) : (typeof meta === 'string' ? meta : '');
        if (!uriCandidate) {
          reply.code(400);
          return { error: 'No management API URL or AMQP URI available for this channel' };
        }
        try {
          const parsed = new URL(uriCandidate);
          const host = parsed.hostname;
          const username = parsed.username;
          const password = parsed.password;
          const vhost = parsed.pathname && parsed.pathname !== '/' ? decodeURIComponent(parsed.pathname.slice(1)) : undefined;
          const isSecure = parsed.protocol === 'amqps:';
          const mgmtProto = isSecure ? 'https' : 'http';
          const mgmtPort = (config.managementPort as number) ?? (isSecure ? 15671 : 15672);
          managementBase = `${mgmtProto}://${host}:${mgmtPort}`;
          if (username) authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
          vhostStr = vhost;
        } catch (err: any) {
          reply.code(400);
          return { error: 'Invalid AMQP URI for channel' };
        }
      } else {
        vhostStr = typeof config.managementVhost === 'string' ? config.managementVhost : undefined;
      }

      try {
        const mgmtVhost = vhostStr ?? '/';
        const mgmtUrl = `${managementBase}/api/queues/${encodeURIComponent(mgmtVhost)}/${encodeURIComponent(queueName)}`;
        const res = await fetch(mgmtUrl, { method: 'DELETE', headers: authHeader ? { Authorization: authHeader } : undefined });
        if (res.ok || res.status === 204) {
          reply.code(204);
          return;
        }
        reply.code(res.status);
        const text = await res.text().catch(() => null);
        return { error: text ?? `Management API returned ${res.status}` };
      } catch (err: any) {
        reply.code(500);
        return { error: err?.message ?? String(err) };
      }
    }
  );

  // Save or update per-queue configuration inside channel.config.queueConfigs
  app.patch(
    '/ingestion-channels/:id/queues/:queueName/config',
    {
      schema: {
        description: 'Save per-queue configuration into channel.config.queueConfigs',
        params: { type: 'object', required: ['id', 'queueName'], properties: { id: { type: 'integer' }, queueName: { type: 'string' } } },
        body: { type: 'object', required: ['queueConfig'], properties: { queueConfig: { type: 'object' } } },
        response: { 200: { type: 'object' } },
      },
    },
    async (request, reply) => {
      const { id, queueName } = request.params as { id: number; queueName: string };
      const body = request.body as { queueConfig: Record<string, unknown> };
      const channel = await IngestionChannel.findByPk(id);
      if (!channel) {
        reply.code(404);
        return { error: 'Channel not found' };
      }
      const config = (channel.get('config') as Record<string, unknown>) ?? {};
      const queueConfigs = typeof config.queueConfigs === 'object' && config.queueConfigs !== null ? (config.queueConfigs as Record<string, unknown>) : {};
      queueConfigs[queueName] = body.queueConfig;
      const newConfig = { ...config, queueConfigs };
      await channel.update({ config: newConfig });
      const updated = channel.toJSON() as Record<string, unknown>;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      updated.organizationId = updated.organizationId ?? updated.tenantId ?? null;
      return updated;
    }
  );

  // Remove a queue name from the saved channel config.queueNames
  app.patch(
    '/ingestion-channels/:id/queues-config',
    {
      schema: {
        description: 'Remove a queue name from channel config.queueNames',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
        body: { type: 'object', required: ['queueName'], properties: { queueName: { type: 'string' } } },
        response: { 200: { type: 'object' } },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const body = request.body as { queueName: string };
      const channel = await IngestionChannel.findByPk(id);
      if (!channel) {
        reply.code(404);
        return { error: 'Channel not found' };
      }
      const config = (channel.get('config') as Record<string, unknown>) ?? {};
      const configuredQueues = Array.isArray(config.queueNames) ? (config.queueNames as string[]) : [];
      const filtered = configuredQueues.filter((q) => q !== body.queueName);
      // persist the updated array (may be empty)
      const newConfig = { ...config, queueNames: filtered };
      await channel.update({ config: newConfig });
      const updated = channel.toJSON() as Record<string, unknown>;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      updated.organizationId = updated.organizationId ?? updated.tenantId ?? null;
      return updated;
    }
  );

  // Get queue stats for a saved channel by id
  app.post(
    '/ingestion-channels/:id/queues',
    {
      schema: {
        description: 'Get queue stats for a saved channel (provide queueNames or have them in config)',
        params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
        body: {
          type: 'object',
          properties: {
            queueNames: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                messages: { type: 'integer' },
                consumers: { type: 'integer' },
                error: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number };
      const body = request.body as { queueNames?: string[] };
      const channel = await IngestionChannel.findByPk(id);
      if (!channel) {
        reply.code(404);
        return { error: 'Channel not found' };
      }

      const config = (channel.get('config') as Record<string, unknown>) ?? {};
      const configuredQueues = Array.isArray(config.queueNames) ? (config.queueNames as string[]) : [];
      const queueNames = body?.queueNames && body.queueNames.length > 0 ? body.queueNames : configuredQueues;
      if (!queueNames || queueNames.length === 0) {
        reply.code(400);
        return { error: 'Provide queueNames in request body or save them on the channel config as `queueNames`' };
      }

      // Build URI from stored meta and config (reuse logic from test endpoint)
      const meta = (channel.get('meta') as string) ?? '';
      const bodyLike: Record<string, unknown> = { uri: meta, ...config };

      function buildUriFromStored(): string {
        const uriCandidate = typeof bodyLike.uri === 'string' ? String(bodyLike.uri) : undefined;
        if (uriCandidate) return uriCandidate;
        const clusterUrl = typeof bodyLike.clusterUrl === 'string' ? String(bodyLike.clusterUrl) : '';
        const port = bodyLike.port ? String(bodyLike.port) : '';
        const vhost = typeof bodyLike.vhost === 'string' ? String(bodyLike.vhost) : '';
        const username = typeof bodyLike.username === 'string' ? String(bodyLike.username) : '';
        const password = typeof bodyLike.password === 'string' ? String(bodyLike.password) : '';

        try {
          const parsed = new URL(clusterUrl);
          if (username) parsed.username = username;
          if (password) parsed.password = password;
          if (port) parsed.port = port;
          if (vhost) parsed.pathname = vhost.startsWith('/') ? vhost : `/${vhost}`;
          return parsed.toString();
        } catch (e) {
          const proto = clusterUrl.startsWith('amqp') ? '' : 'amqp://';
          const auth = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
          const portPart = port ? `:${port}` : '';
          const path = vhost ? `/${encodeURIComponent(vhost)}` : '';
          return `${proto}${auth}${clusterUrl}${portPart}${path}`;
        }
      }

      const uri = buildUriFromStored();

      // Attempt to connect and inspect each named queue. Attach listeners to
      // avoid unhandled 'error' events from the amqplib connection/channel
      // when the broker closes a channel (eg. queue not found).
      // eslint-disable-next-line no-async-promise-executor
      try {
        // @ts-ignore: amqplib runtime import
        const amqplib = await import('amqplib');
        const conn = await (amqplib as any).connect(uri);
        conn.on('error', () => {});
        let ch: any = null;
        const results: Array<Record<string, unknown>> = [];
        try {
            for (const q of queueNames) {
              let perCh: any = null
              try {
                // Create a short-lived channel per-queue so a server-side channel
                // close (eg. queue not found) doesn't affect remaining checks.
                // eslint-disable-next-line no-await-in-loop
                perCh = await conn.createChannel();
                perCh.on('error', () => {})
                // eslint-disable-next-line no-await-in-loop
                const info = await perCh.checkQueue(q)
                results.push({ name: q, messages: Number(info.messageCount ?? 0), consumers: Number(info.consumerCount ?? 0), error: null })
              } catch (err: any) {
                results.push({ name: q, messages: 0, consumers: 0, error: err?.message ?? String(err) })
              } finally {
                try {
                  if (perCh) await perCh.close()
                } catch (_) {
                  // ignore
                }
              }
            }
        } finally {
          try {
            if (ch) await ch.close();
          } catch (_) {
            // ignore
          }
          try {
            await conn.close();
          } catch (_) {
            // ignore
          }
        }
        return results;
      } catch (err: any) {
        reply.code(500);
        return { error: err?.message ?? String(err) };
      }
    }
  );
};

import { FastifyPluginAsync } from 'fastify';
import { UserService, UserCreateInput } from '../services/UserService';

const service = new UserService();

export const usersRoute: FastifyPluginAsync = async (app) => {
  app.get('/users', async (_req, reply) => {
    const rows = await service.findAll();
    return reply.send(rows);
  });

  app.post<{ Body: UserCreateInput }>('/users', async (req, reply) => {
    const created = await service.create(req.body);
    return reply.code(201).send(created);
  });

  app.get('/users/:id', async (req, reply) => {
    const id = Number((req.params as any).id);
    const row = await service.findById(id);
    if (!row) return reply.code(404).send({ error: 'not_found' });
    return reply.send(row);
  });

  app.put<{ Params: { id: string }; Body: Partial<UserCreateInput> }>('/users/:id', async (req, reply) => {
    const id = Number((req.params as any).id);
    const user = await service.findById(id);
    if (!user) return reply.code(404).send({ error: 'not_found' });
    await user.update(req.body as any);
    return reply.send(user);
  });

  app.delete('/users/:id', async (req, reply) => {
    const id = Number((req.params as any).id);
    const user = await service.findById(id);
    if (!user) return reply.code(404).send({ error: 'not_found' });
    await user.destroy();
    return reply.code(204).send();
  });
};

export default usersRoute;

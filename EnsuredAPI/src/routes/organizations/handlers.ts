import { OrganizationService, OrganizationCreateInput } from '../../services/OrganizationService';

const service = new OrganizationService();

export const listOrganizations = async (_req: unknown, reply: { send: (payload: unknown) => unknown }) => {
  const rows = await service.findAll();
  return reply.send(rows);
};

export const createOrganization = async (req: { body: OrganizationCreateInput }, reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }) => {
  const created = await service.create(req.body);
  return reply.code(201).send(created);
};

export const getOrganizationById = async (req: { params: { id: string } }, reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }) => {
  const id = Number(req.params.id);
  const row = await service.findById(id);
  if (!row) return reply.code(404).send({ error: 'not_found' });
  return reply.send(row);
};

export const updateOrganization = async (
  req: { params: { id: string }; body: Partial<OrganizationCreateInput> },
  reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } },
) => {
  const id = Number(req.params.id);
  const org = await service.findById(id);
  if (!org) return reply.code(404).send({ error: 'not_found' });
  await org.update(req.body as any);
  return reply.send(org);
};

export const deleteOrganization = async (req: { params: { id: string } }, reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }) => {
  const id = Number(req.params.id);
  const org = await service.findById(id);
  if (!org) return reply.code(404).send({ error: 'not_found' });
  await org.destroy();
  return reply.code(204).send();
};

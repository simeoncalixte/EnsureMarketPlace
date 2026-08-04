import { FastifyPluginAsync } from 'fastify';
import { OrganizationCreateInput } from '../../services/OrganizationService';
import {
  listOrganizations,
  createOrganization,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
} from './handlers';

export const organizationsRoute: FastifyPluginAsync = async (app) => {
  app.get('/organizations', listOrganizations);
  app.get('/Organizations', listOrganizations);

  app.post<{ Body: OrganizationCreateInput }>('/organizations', createOrganization);
  app.post<{ Body: OrganizationCreateInput }>('/Organizations', createOrganization);

  app.get('/organizations/:id', getOrganizationById);
  app.get('/Organizations/:id', getOrganizationById);

  app.put<{ Params: { id: string }; Body: Partial<OrganizationCreateInput> }>('/organizations/:id', updateOrganization);
  app.put<{ Params: { id: string }; Body: Partial<OrganizationCreateInput> }>('/Organizations/:id', updateOrganization);

  app.delete('/organizations/:id', deleteOrganization);
  app.delete('/Organizations/:id', deleteOrganization);
};

export default organizationsRoute;

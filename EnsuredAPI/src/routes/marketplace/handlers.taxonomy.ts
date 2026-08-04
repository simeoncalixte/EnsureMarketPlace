import { FastifyPluginAsync } from 'fastify';
import { resolveOrganizationIdFromRequest } from '../../services/lib/org';
import type { PageTemplateDefinition } from '../../db/models/pageTemplates.models';
import { pageTemplateSchema } from './schemas';
import { loadLineOfBusinessTaxonomy, loadPerilTaxonomy } from './taxonomy.service';
import {
  addTemplateField,
  findInsuredSubjectsTemplate,
  removeTemplateField,
  upsertInsuredSubjectsTemplate,
} from './pageTemplates.service';

/**
 * Line-of-business / peril taxonomy reads and insured-subjects page-template
 * authoring (save template, add/remove a section field).
 */
export const taxonomyRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/marketplace/line-of-business-taxonomy',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'List line of business primary and subtype taxonomy',
        querystring: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
            lineOfBusinessCode: { type: 'string' },
            lineOfBusinessSubTypeCode: { type: 'string' },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              primaryTypes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    label: { type: 'string' },
                    subTypes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          code: { type: 'string' },
                          label: { type: 'string' },
                        },
                        required: ['code', 'label'],
                      },
                    },
                  },
                  required: ['code', 'label', 'subTypes'],
                },
              },
              pageTemplate: pageTemplateSchema,
              isOrgTemplate: { type: 'boolean' },
            },
            required: ['primaryTypes', 'pageTemplate', 'isOrgTemplate'],
          },
        },
      },
    },
    async (request, reply) => {
      const query = (request.query ?? {}) as {
        organizationId?: number | null;
        lineOfBusinessCode?: string;
        lineOfBusinessSubTypeCode?: string;
      };

      const resolvedOrganizationId = query.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const primaryTypes = await loadLineOfBusinessTaxonomy();
      const { definitionJson: pageTemplate, isOrgTemplate } = await findInsuredSubjectsTemplate(
        resolvedOrganizationId,
        query.lineOfBusinessCode,
        query.lineOfBusinessSubTypeCode,
      );
      return reply.code(200).send({ primaryTypes, pageTemplate, isOrgTemplate });
    },
  );

  app.get(
    '/marketplace/peril-taxonomy',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'List canonical peril (cause-of-loss) taxonomy grouped by category',
        response: {
          200: {
            type: 'object',
            properties: {
              categories: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    label: { type: 'string' },
                    description: { type: ['string', 'null'] },
                    perils: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          code: { type: 'string' },
                          label: { type: 'string' },
                          description: { type: ['string', 'null'] },
                          isCatastrophe: { type: 'boolean' },
                        },
                        required: ['code', 'label', 'isCatastrophe'],
                      },
                    },
                  },
                  required: ['code', 'label', 'perils'],
                },
              },
            },
            required: ['categories'],
          },
        },
      },
    },
    async (_request, reply) => {
      const categories = await loadPerilTaxonomy();
      return reply.code(200).send({ categories });
    },
  );

  app.put(
    '/marketplace/insured-subjects/page-template',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Save insured subject page template JSONB',
        body: {
          type: 'object',
          required: ['definitionJson'],
          properties: {
            organizationId: { type: ['integer', 'null'] },
            lineOfBusinessCode: { type: 'string' },
            lineOfBusinessSubTypeCode: { type: 'string' },
            definitionJson: pageTemplateSchema,
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              pageTemplate: pageTemplateSchema,
            },
            required: ['pageTemplate'],
          },
          201: {
            type: 'object',
            properties: {
              pageTemplate: pageTemplateSchema,
            },
            required: ['pageTemplate'],
          },
        },
      },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as {
        organizationId?: number | null;
        lineOfBusinessCode?: string;
        lineOfBusinessSubTypeCode?: string;
        definitionJson: PageTemplateDefinition;
      };

      const resolvedOrganizationId = body.organizationId ?? (await resolveOrganizationIdFromRequest(request));
      const pageTemplate = await upsertInsuredSubjectsTemplate({
        organizationId: resolvedOrganizationId ?? null,
        lineOfBusinessCode: body.lineOfBusinessCode,
        lineOfBusinessSubTypeCode: body.lineOfBusinessSubTypeCode,
        definitionJson: body.definitionJson,
      });

      return reply.code(201).send({ pageTemplate });
    },
  );

  app.post(
    '/marketplace/insured-subjects/page-template/fields',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Add a field to an insured subject template section and persist it',
        body: {
          type: 'object',
          required: ['sectionKey', 'field'],
          properties: {
            organizationId: { type: ['integer', 'null'] },
            lineOfBusinessCode: { type: 'string' },
            lineOfBusinessSubTypeCode: { type: 'string' },
            sectionKey: { type: 'string' },
            field: {
              type: 'object',
              required: ['key', 'label'],
              properties: {
                key: { type: 'string' },
                label: { type: 'string' },
                type: { type: 'string' },
                required: { type: 'boolean' },
              },
              additionalProperties: true,
            },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              pageTemplate: pageTemplateSchema,
            },
            required: ['pageTemplate'],
          },
        },
      },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as {
        organizationId?: number | null;
        lineOfBusinessCode?: string;
        lineOfBusinessSubTypeCode?: string;
        sectionKey: string;
        field: {
          key: string;
          label: string;
          type?: string;
          required?: boolean;
        };
      };

      try {
        const resolvedOrganizationId = body.organizationId ?? (await resolveOrganizationIdFromRequest(request));
        const pageTemplate = await addTemplateField({
          organizationId: resolvedOrganizationId ?? null,
          lineOfBusinessCode: body.lineOfBusinessCode,
          lineOfBusinessSubTypeCode: body.lineOfBusinessSubTypeCode,
          sectionKey: body.sectionKey,
          field: body.field,
        });

        return reply.code(200).send({ pageTemplate });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add template field';
        const statusCode = /not found/i.test(message) ? 404 : 400;
        return reply.code(statusCode).send({ error: message });
      }
    },
  );

  app.delete(
    '/marketplace/insured-subjects/page-template/fields',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Remove a field from an insured subject template section and persist it',
        body: {
          type: 'object',
          required: ['sectionKey', 'fieldKey'],
          properties: {
            organizationId: { type: ['integer', 'null'] },
            lineOfBusinessCode: { type: 'string' },
            lineOfBusinessSubTypeCode: { type: 'string' },
            sectionKey: { type: 'string' },
            fieldKey: { type: 'string' },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              pageTemplate: pageTemplateSchema,
            },
            required: ['pageTemplate'],
          },
        },
      },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as {
        organizationId?: number | null;
        lineOfBusinessCode?: string;
        lineOfBusinessSubTypeCode?: string;
        sectionKey: string;
        fieldKey: string;
      };

      try {
        const resolvedOrganizationId = body.organizationId ?? (await resolveOrganizationIdFromRequest(request));
        const pageTemplate = await removeTemplateField({
          organizationId: resolvedOrganizationId ?? null,
          lineOfBusinessCode: body.lineOfBusinessCode,
          lineOfBusinessSubTypeCode: body.lineOfBusinessSubTypeCode,
          sectionKey: body.sectionKey,
          fieldKey: body.fieldKey,
        });

        return reply.code(200).send({ pageTemplate });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to remove template field';
        const statusCode = /not found/i.test(message) ? 404 : 400;
        return reply.code(statusCode).send({ error: message });
      }
    },
  );
};

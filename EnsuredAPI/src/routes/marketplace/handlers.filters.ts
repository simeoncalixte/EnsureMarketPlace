import { FastifyPluginAsync } from 'fastify';
import { loadLineOfBusinessTaxonomy } from './taxonomy.service';
import { InsurerProfile, Organization, Peril, Submission, User } from '../../db/models';
import { listCatScoreOptions } from './catScores.service';
import {
  listCanonicalOrganizationOptions,
  listCanonicalSubjectPerilOptions,
  listCanonicalSubmissionTypeOptions,
} from './dynamicFilters.service';

// The canonical filter config lives server-side and is served as part of the manifest.
// Geography is resolved on-demand by the client via /api/geolocation/autocomplete.
const config = require('../../config/filters.config.json');

type OptionItem = { value: string; label: string };

type OrganizationStatus = 'Active' | 'Inactive';
type OrganizationOptionRecord = {
  id: number;
  name: string;
  status: OrganizationStatus;
};

function parseCsv(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolveOrganizationStatus(users: User[] | undefined): OrganizationStatus {
  const hasActiveUser = (users ?? []).some((user) => user.isActive !== false);
  return hasActiveUser ? 'Active' : 'Inactive';
}

function toOrganizationOptions(records: OrganizationOptionRecord[]): OptionItem[] {
  return records
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((record) => ({
      value: String(record.id),
      label: `${record.name} (${record.status})`,
    }));
}

const SUBMISSION_STATUS_ORDER = new Map<string, number>([
  ['draft', 10],
  ['submitted', 20],
  ['modeling', 30],
  ['priced', 40],
  ['compliance', 50],
  ['approved', 60],
  ['quoted', 70],
  ['bound', 80],
  ['rejected', 90],
]);

function sortSubmissionStatusOptions(options: OptionItem[]): OptionItem[] {
  return [...options].sort((left, right) => {
    const leftOrder = SUBMISSION_STATUS_ORDER.get(left.value.toLowerCase()) ?? 1000;
    const rightOrder = SUBMISSION_STATUS_ORDER.get(right.value.toLowerCase()) ?? 1000;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.label.localeCompare(right.label);
  });
}

async function listSubmissionStatusOptions(): Promise<OptionItem[]> {
  const submissions = await Submission.findAll({
    attributes: ['status'],
    group: ['status'],
    order: [['status', 'ASC']],
  }).catch(() => []);

  const options: OptionItem[] = [];
  for (const submission of submissions) {
    const status = (submission.status ?? '').trim();
    if (!status) continue;
    options.push({ value: status, label: status });
  }

  return sortSubmissionStatusOptions(options);
}

async function listSubmissionLinkedOrganizations(role: 'broker' | 'carrier'): Promise<OptionItem[]> {
  const byId = new Map<number, OrganizationOptionRecord>();

  if (role === 'broker') {
    const submissions = await Submission.findAll({
      attributes: ['id'],
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id'],
          required: true,
          include: [
            {
              model: Organization,
              as: 'organization',
              attributes: ['id', 'name'],
              required: true,
              include: [
                {
                  model: User,
                  as: 'users',
                  attributes: ['id', 'isActive'],
                  required: false,
                },
              ],
            },
          ],
        },
      ],
    }).catch(() => []);

    for (const submission of submissions) {
      const submittedBy = (submission as unknown as { submittedBy?: User }).submittedBy;
      const organization = (submittedBy as unknown as { organization?: Organization })?.organization;
      if (!organization) continue;

      byId.set(organization.id, {
        id: organization.id,
        name: organization.name,
        status: resolveOrganizationStatus((organization as unknown as { users?: User[] }).users),
      });
    }

    return toOrganizationOptions(Array.from(byId.values()));
  }

  const submissions = await Submission.findAll({
    attributes: ['id'],
    include: [
      {
        model: InsurerProfile,
        as: 'insurerProfile',
        attributes: ['id'],
        required: true,
        include: [
          {
            model: Organization,
            as: 'organization',
            attributes: ['id', 'name'],
            required: true,
            include: [
              {
                model: User,
                as: 'users',
                attributes: ['id', 'isActive'],
                required: false,
              },
            ],
          },
        ],
      },
    ],
  }).catch(() => []);

  for (const submission of submissions) {
    const insurerProfile = (submission as unknown as { insurerProfile?: InsurerProfile }).insurerProfile;
    const organization = (insurerProfile as unknown as { organization?: Organization })?.organization;
    if (!organization) continue;

    byId.set(organization.id, {
      id: organization.id,
      name: organization.name,
      status: resolveOrganizationStatus((organization as unknown as { users?: User[] }).users),
    });
  }

  return toOrganizationOptions(Array.from(byId.values()));
}

export const filtersRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/marketplace/filters/options/:fieldId',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Live option resolver for config-driven marketplace filters',
        params: {
          type: 'object',
          properties: {
            fieldId: { type: 'string' },
          },
          required: ['fieldId'],
        },
        querystring: {
          type: 'object',
          properties: {
            lob: { type: 'string' },
          },
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                value: { type: 'string' },
                label: { type: 'string' },
              },
              required: ['value', 'label'],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const fieldId = String((request.params as { fieldId?: string }).fieldId ?? '').toLowerCase();

      if (fieldId === 'lob' || fieldId === 'sub') {
        const taxonomy = await loadLineOfBusinessTaxonomy().catch(() => []);

        if (fieldId === 'lob') {
          const options: OptionItem[] = taxonomy.map((entry) => ({
            value: entry.code,
            label: entry.label,
          }));
          return reply.code(200).send(options);
        }

        const selectedLobCodes = new Set(parseCsv((request.query as { lob?: string }).lob));
        const options: OptionItem[] = taxonomy
          .filter((entry) => selectedLobCodes.size === 0 || selectedLobCodes.has(entry.code))
          .flatMap((entry) =>
            entry.subTypes.map((subType) => ({
              value: `${entry.code}:${subType.code}`,
              label: `${entry.label} - ${subType.label}`,
            }))
          );
        return reply.code(200).send(options);
      }

      if (fieldId === 'peril') {
        // Subject peril filter: distinct per-subject canonical peril codes.
        // Fall back to the active taxonomy until canonical rows are backfilled.
        const options: OptionItem[] = await listCanonicalSubjectPerilOptions().catch(() => []);
        if (options.length === 0) {
          const perils = await Peril.findAll({
            where: { isActive: true },
            order: [['sortOrder', 'ASC'], ['label', 'ASC']],
          }).catch(() => []);
          return reply.code(200).send(perils.map((entry) => ({ value: entry.code, label: entry.label })));
        }
        return reply.code(200).send(options);
      }

      if (fieldId === 'broker' || fieldId === 'carrier') {
        const options = await listCanonicalOrganizationOptions(
          fieldId,
          () => listSubmissionLinkedOrganizations(fieldId),
        ).catch(() => []);
        return reply.code(200).send(options);
      }

      if (fieldId === 'submissionstatus') {
        const options = await listSubmissionStatusOptions().catch(() => []);
        return reply.code(200).send(options);
      }

      if (fieldId === 'catperil' || fieldId === 'catband' || fieldId === 'catmodelversion' || fieldId === 'catrecommendedaction') {
        // CAT filters are derived from scored CAT assessment data (`cat_scores`).
        const options = await listCatScoreOptions(fieldId).catch(() => []);
        return reply.code(200).send(options);
      }

      return reply.code(200).send([]);
    }
  );

  app.get(
    '/marketplace/filters/manifest',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Resolved filter manifest: canonical config + preloaded option data from the DB',
        querystring: {
          type: 'object',
          properties: {
            organizationId: { type: ['integer', 'null'] },
          },
          additionalProperties: true,
        },
        response: {
          200: { type: 'object' },
        },
      },
    },
    async (_request, reply) => {
      // Load both sources in parallel — fall back gracefully if DB is unavailable.
      const [taxonomy, subjectPerils, brokers, carriers, submissionStatuses, submissionTypes, catPerils, catBands, catModelVersions, catRecommendedActions] = await Promise.all([
        loadLineOfBusinessTaxonomy().catch(() => []),
        listCanonicalSubjectPerilOptions().catch(() => []),
        listCanonicalOrganizationOptions('broker', () => listSubmissionLinkedOrganizations('broker')).catch(() => []),
        listCanonicalOrganizationOptions('carrier', () => listSubmissionLinkedOrganizations('carrier')).catch(() => []),
        listSubmissionStatusOptions().catch(() => []),
        listCanonicalSubmissionTypeOptions().catch(() => []),
        listCatScoreOptions('catperil').catch(() => []),
        listCatScoreOptions('catband').catch(() => []),
        listCatScoreOptions('catmodelversion').catch(() => []),
        listCatScoreOptions('catrecommendedaction').catch(() => []),
      ]);

      let resolvedSubjectPerils = subjectPerils;
      if (resolvedSubjectPerils.length === 0) {
        const perils = await Peril.findAll({ where: { isActive: true }, order: [['sortOrder', 'ASC'], ['label', 'ASC']] }).catch(() => []);
        resolvedSubjectPerils = perils.map((p) => ({ value: p.code, label: p.label }));
      }

      const data: Record<string, Array<{ value: string; label: string }>> = {
        primaryTypes: taxonomy.map((t) => ({ value: t.code, label: t.label })),
        subTypes: taxonomy.flatMap((t) =>
          t.subTypes.map((st) => ({
            value: `${t.code}:${st.code}`,
            label: `${t.label} - ${st.label}`,
          }))
        ),
        subjectPerils: resolvedSubjectPerils,
        perils: resolvedSubjectPerils,
        brokers,
        carriers,
        submissionStatuses,
        submissionTypes,
        // Distinct values observed in CAT score records.
        catPerils,
        catBands,
        catModelVersions,
        catRecommendedActions,
      };

      return reply.code(200).send({
        meta: { configVersion: config.version, timestamp: new Date().toISOString() },
        config,
        data,
      });
    },
  );
};

export default filtersRoutes;

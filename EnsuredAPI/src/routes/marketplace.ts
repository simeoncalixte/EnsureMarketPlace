import { FastifyPluginAsync } from 'fastify';
import { Op } from 'sequelize';
import {
  Deal,
  LineOfBusinessPrimaryType,
  LineOfBusinessSubType,
  Policy,
  RiskMetric,
  SPV,
  SPVEntity,
  Tranche,
  TrancheSubscription,
} from '../db/models';
import { getSequelize } from '../config/database';
import { lineOfBusinessTaxonomy as seedLineOfBusinessTaxonomy } from '../db/seed-data/lineOfBusinessTaxonomy';

const ACTIVE_DEAL_STATUSES = new Set(['approved', 'fundraising', 'active']);
const OPEN_SUBSCRIPTION_STATUSES = new Set(['committed', 'pending', 'partially_filled']);

interface MarketplaceOpportunity {
  id: string;
  dealId: number;
  trancheId: number;
  fundingState: 'new' | 'partially_funded';
  dealName: string;
  dealStatus: string;
  trancheName: string;
  riskLevel: string;
  expectedReturnPct: number;
  maxLoss: number;
  durationMonths: number;
  capitalRequired: number;
  committedCapital: number;
  fundedAmount: number;
  pendingAmount: number;
  fundingProgressPct: number;
  startDate: string;
  endDate: string;
  latitude?: number;
  longitude?: number;
}

type TrancheWithRelations = Tranche & {
  deal?: Deal;
  subscriptions?: TrancheSubscription[];
  latitude?: unknown;
  longitude?: unknown;
};

type LineOfBusinessTaxonomyNode = {
  code: string;
  label: string;
  subTypes: Array<{
    code: string;
    label: string;
  }>;
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthsBetween(startDate: Date, endDate: Date): number {
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 1;
  }

  const startMonth = startDate.getFullYear() * 12 + startDate.getMonth();
  const endMonth = endDate.getFullYear() * 12 + endDate.getMonth();
  return Math.max(1, endMonth - startMonth + 1);
}

function serializeFallbackLineOfBusinessTaxonomy(): LineOfBusinessTaxonomyNode[] {
  return seedLineOfBusinessTaxonomy.map((primary) => ({
    code: primary.code,
    label: primary.label,
    subTypes: primary.subTypes.map((subType) => ({
      code: subType.code,
      label: subType.label,
    })),
  }));
}

async function loadLineOfBusinessTaxonomy(): Promise<LineOfBusinessTaxonomyNode[]> {
  try {
    const [primaries, subTypes] = await Promise.all([
      LineOfBusinessPrimaryType.findAll({ order: [['sortOrder', 'ASC'], ['label', 'ASC']] }),
      LineOfBusinessSubType.findAll({ order: [['primaryCode', 'ASC'], ['sortOrder', 'ASC'], ['label', 'ASC']] }),
    ]);

    if (primaries.length === 0) {
      return serializeFallbackLineOfBusinessTaxonomy();
    }

    const groupedSubTypes = new Map<string, Array<{ code: string; label: string }>>();
    for (const subType of subTypes) {
      const primaryCode = subType.primaryCode;
      const entries = groupedSubTypes.get(primaryCode) ?? [];
      entries.push({ code: subType.code, label: subType.label });
      groupedSubTypes.set(primaryCode, entries);
    }

    return primaries.map((primary) => ({
      code: primary.code,
      label: primary.label,
      subTypes: groupedSubTypes.get(primary.code) ?? [],
    }));
  } catch (error) {
    return serializeFallbackLineOfBusinessTaxonomy();
  }
}

export const marketplaceRoute: FastifyPluginAsync = async (app) => {
  app.get(
    '/marketplace/line-of-business-taxonomy',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'List line of business primary and subtype taxonomy',
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
            },
            required: ['primaryTypes'],
          },
        },
      },
    },
    async (_request, reply) => {
      const primaryTypes = await loadLineOfBusinessTaxonomy();
      return reply.code(200).send({ primaryTypes });
    },
  );

  app.get(
    '/marketplace/opportunities/active-pending-funding',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'List active opportunities pending funding',
        description: 'Returns active deal tranches where committed subscriptions are still below required capital.',
        querystring: {
          type: 'object',
          properties: {
            dealId: { type: 'integer' },
            dealName: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                dealId: { type: 'integer' },
                dealName: { type: 'string' },
                dealStatus: { type: 'string' },
                trancheId: { type: 'integer' },
                fundingState: { type: 'string', enum: ['new', 'partially_funded'] },
                trancheName: { type: 'string' },
                riskLevel: { type: 'string' },
                expectedReturnPct: { type: 'number' },
                maxLoss: { type: 'number' },
                durationMonths: { type: 'integer' },
                capitalRequired: { type: 'number' },
                committedCapital: { type: 'number' },
                fundedAmount: { type: 'number' },
                pendingAmount: { type: 'number' },
                fundingProgressPct: { type: 'number' },
                startDate: { type: 'string' },
                endDate: { type: 'string' },
                latitude: { type: ['number', 'null'] },
                longitude: { type: ['number', 'null'] },
              },
              required: [
                'id',
                'dealId',
                'trancheId',
                'fundingState',
                'trancheName',
                'riskLevel',
                'expectedReturnPct',
                'maxLoss',
                'durationMonths',
                'capitalRequired',
                'committedCapital',
                'fundedAmount',
                'pendingAmount',
                'fundingProgressPct',
              ],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { dealId, dealName } = (request.query ?? {}) as { dealId?: number; dealName?: string };

      const include: any[] = [
        { model: Deal, as: 'deal' },
        { model: TrancheSubscription, as: 'subscriptions' },
      ];

      if (dealId || dealName) {
        const dealWhere: any = {};
        if (dealId) dealWhere.id = dealId;
        if (dealName) dealWhere.name = String(dealName);
        include[0] = { model: Deal, as: 'deal', where: dealWhere };
      }

      const tranches = await Tranche.findAll({
        include,
        order: [['createdAt', 'DESC']],
      });

      // Collect tranche-level opportunity objects in a flat list so the
      // client receives a simple array of tranche opportunities.
      const trancheList: MarketplaceOpportunity[] = [];
      const portfolioIds = new Set<number>();
      const submissionIds = new Set<number>();
      const portfolioToDeal: Record<number, number> = {};
      const submissionToDeal: Record<number, number> = {};

      for (const trancheRecord of tranches) {
        const tranche = trancheRecord as unknown as TrancheWithRelations;
        const deal = tranche.deal;
        if (!deal || !ACTIVE_DEAL_STATUSES.has(deal.status)) {
          continue;
        }

        const subscriptions = (tranche.subscriptions ?? []).filter(
          (subscription) => OPEN_SUBSCRIPTION_STATUSES.has(String(subscription.status).toLowerCase()),
        );

        const capitalRequired = toNumber(tranche.capitalRequired);
        const fundedAmount = subscriptions.reduce((sum, subscription) => sum + toNumber(subscription.committedAmount), 0);
        const pendingAmount = Math.max(0, capitalRequired - fundedAmount);

        if (capitalRequired <= 0 || pendingAmount <= 0) {
          continue;
        }

        const maxLoss = Math.max(0, toNumber(tranche.layerMax) - toNumber(tranche.layerMin));
        const expectedReturnPct = toNumber(tranche.expectedReturn ?? tranche.returnRate) * 100;
        const startDt = new Date(deal.startDate as unknown as string | number | Date);
        const endDt = new Date(deal.endDate as unknown as string | number | Date);
        const durationMonths = monthsBetween(startDt, endDt);
        const fundingProgressPct = Math.min(100, (fundedAmount / capitalRequired) * 100);
        const fundingState = fundedAmount <= 0 ? 'new' : 'partially_funded';

        const latitude = Number(tranche.latitude);
        const longitude = Number(tranche.longitude);

        const trancheInfo: MarketplaceOpportunity = {
          id: `${deal.id}-${tranche.id}`,
          dealId: deal.id,
          dealName: deal.name,
          dealStatus: deal.status,
          trancheId: tranche.id,
          fundingState,
          trancheName: tranche.name,
          riskLevel: tranche.riskLevel,
          expectedReturnPct,
          maxLoss,
          durationMonths,
          capitalRequired,
          committedCapital: fundedAmount,
          fundedAmount,
          pendingAmount,
          fundingProgressPct,
          startDate: startDt.toISOString(),
          endDate: endDt.toISOString(),
          latitude: Number.isFinite(latitude) ? latitude : undefined,
          longitude: Number.isFinite(longitude) ? longitude : undefined,
        };
        trancheList.push(trancheInfo);

        // collect mapping for later policy-coordinate lookup
        if (deal.portfolioId) {
          portfolioIds.add(deal.portfolioId);
          portfolioToDeal[deal.portfolioId] = deal.id;
        }
        if (deal.submissionId) {
          submissionIds.add(deal.submissionId);
          submissionToDeal[deal.submissionId] = deal.id;
        }
      }
      // Fill missing opportunity coordinates from related policy models.
      try {
        const orClauses: any[] = [];
        if (portfolioIds.size > 0) orClauses.push({ portfolioId: { [Op.in]: Array.from(portfolioIds) } });
        if (submissionIds.size > 0) orClauses.push({ submissionId: { [Op.in]: Array.from(submissionIds) } });

        if (orClauses.length > 0) {
          const policies = await Policy.findAll({
            where: {
              [Op.and]: [
                { latitude: { [Op.ne]: null } },
                { longitude: { [Op.ne]: null } },
                { [Op.or]: orClauses },
              ],
            },
            order: [['id', 'ASC']],
          });

          const dealCoords = new Map<number, Array<{ latitude: number; longitude: number }>>();

          for (const policy of policies) {
            const mappedByPortfolio = policy.portfolioId ? portfolioToDeal[policy.portfolioId] : undefined;
            const mappedBySubmission = policy.submissionId ? submissionToDeal[policy.submissionId] : undefined;
            const mappedDealId = mappedByPortfolio ?? mappedBySubmission;
            if (!mappedDealId) {
              continue;
            }

            const latitude = Number((policy as any).latitude);
            const longitude = Number((policy as any).longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
              continue;
            }

            const existing = dealCoords.get(mappedDealId) ?? [];
            existing.push({ latitude, longitude });
            dealCoords.set(mappedDealId, existing);
          }

          const perDealCursor = new Map<number, number>();
          for (const opportunity of trancheList) {
            if (Number.isFinite(opportunity.latitude) && Number.isFinite(opportunity.longitude)) {
              continue;
            }

            const coords = dealCoords.get(opportunity.dealId);
            if (!coords || coords.length === 0) {
              continue;
            }

            const cursor = perDealCursor.get(opportunity.dealId) ?? 0;
            const selected = coords[cursor % coords.length];
            perDealCursor.set(opportunity.dealId, cursor + 1);

            opportunity.latitude = selected.latitude;
            opportunity.longitude = selected.longitude;
          }
        }
      } catch (err) {
        // ignore policy lookup failures; opportunities still return without coordinates
      }

      // Sort tranche-level opportunities by pending amount descending
      trancheList.sort((a, b) => b.pendingAmount - a.pendingAmount);

      return reply.code(200).send(trancheList);
    },
  );

  app.get(
    '/marketplace/summary/capital-exposure',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Aggregate capital exposure across active deals',
        response: {
          200: {
            type: 'object',
            properties: {
              totalCapitalRequired: { type: 'number' },
              totalCommitted: { type: 'number' },
              totalAvailable: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const tranches = await Tranche.findAll({ include: [{ model: Deal, as: 'deal' }, { model: TrancheSubscription, as: 'subscriptions' }] });

        let totalCapitalRequired = 0;
        let totalCommitted = 0;

        for (const t of tranches as any[]) {
          const deal = t.deal as Deal | undefined;
          if (!deal || !ACTIVE_DEAL_STATUSES.has(deal.status)) continue;

          // Prioritize explicit capitalRequired if present, otherwise fall back to layer range
          const capitalReq = toNumber(t.capitalRequired ?? Math.max(0, toNumber(t.layerMax) - toNumber(t.layerMin)));
          totalCapitalRequired += capitalReq;

          const funded = (t.subscriptions ?? []).reduce((sum: number, s: any) => sum + toNumber(s.committedAmount), 0);
          totalCommitted += funded;
        }

        const totalAvailable = Math.max(0, totalCapitalRequired - totalCommitted);

        return reply.code(200).send({ totalCapitalRequired, totalCommitted, totalAvailable });
      } catch (err) {
        app.log.error(err);
        return reply.code(500).send({ error: 'exposure_summary_failed' });
      }
    },
  );

  app.get(
    '/marketplace/metrics/capital-exposure',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Return capital exposure time series',
        querystring: {
          type: 'object',
          properties: {
            dealId: { type: 'integer' },
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                calculatedAt: { type: 'string', format: 'date-time' },
                value: { type: 'number' },
                dealId: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const qs = (request.query ?? {}) as { dealId?: number; start?: string; end?: string };
        const where: any = { metricType: 'capital_exposure' };
        if (qs.dealId) where.dealId = qs.dealId;
        if (qs.start && qs.end) {
          where.calculatedAt = { [Op.between]: [new Date(qs.start), new Date(qs.end)] };
        } else if (qs.start) {
          where.calculatedAt = { [Op.gte]: new Date(qs.start) };
        } else if (qs.end) {
          where.calculatedAt = { [Op.lte]: new Date(qs.end) };
        }

        const rows = await RiskMetric.findAll({ where, order: [['calculatedAt', 'ASC']] });

        const out = rows.map((r: any) => ({ calculatedAt: r.calculatedAt.toISOString(), value: Number(r.value), dealId: r.dealId }));
        return reply.code(200).send(out);
      } catch (err) {
        app.log.error(err);
        return reply.code(500).send({ error: 'metrics_query_failed' });
      }
    },
  );

  app.post(
    '/marketplace/deals',
    {
      schema: {
        tags: ['Marketplace'],
        summary: 'Create a new deal and optional tranches',
        body: {
          type: 'object',
          properties: {
            spvId: { type: 'integer' },
            name: { type: 'string' },
            coverageLimit: { type: 'number' },
            attachmentPoint: { type: 'number' },
            exhaustionPoint: { type: 'number' },
            premium: { type: 'number' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            subjects: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  subjectLabel: { type: 'string' },
                  subjectIndex: { type: 'integer' },
                  lineOfBusiness: { type: ['string', 'null'] },
                  lineOfBusinessSubType: { type: ['string', 'null'] },
                  locationText: { type: ['string', 'null'] },
                  assetType: { type: ['string', 'null'] },
                  constructionType: { type: ['string', 'null'] },
                  occupancyType: { type: ['string', 'null'] },
                  replacementCost: { type: ['number', 'null'] },
                  latitude: { type: ['number', 'null'] },
                  longitude: { type: ['number', 'null'] },
                  vulnerabilityScore: { type: ['number', 'null'] },
                },
                required: ['subjectLabel', 'subjectIndex'],
              },
            },
            tranches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  layerMin: { type: 'number' },
                  layerMax: { type: 'number' },
                  returnRate: { type: 'number' },
                  riskLevel: { type: 'string' },
                  capitalRequired: { type: 'number' },
                },
                required: ['name', 'layerMin', 'layerMax'],
              },
            },
          },
          required: ['name', 'coverageLimit', 'attachmentPoint', 'exhaustionPoint', 'premium', 'startDate', 'endDate'],
        },
        response: {
          201: { type: 'object' },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as any;
      const { spvId, name, coverageLimit, attachmentPoint, exhaustionPoint, premium, startDate, endDate, subjects, tranches } = body;

      const normalizeText = (value: unknown): string | null => {
        if (typeof value !== 'string') {
          return null;
        }

        const trimmed = value.trim();
        return trimmed ? trimmed : null;
      };

      const normalizedSubjects = Array.isArray(subjects)
        ? subjects.map((subject: any, index: number) => ({
            subjectLabel: String(subject.subjectLabel ?? `Subject ${index + 1}`),
            subjectIndex: Number(subject.subjectIndex ?? index + 1),
            lineOfBusiness: normalizeText(subject.lineOfBusiness),
            lineOfBusinessSubType: normalizeText(subject.lineOfBusinessSubType),
            locationText: normalizeText(subject.locationText),
            assetType: subject.assetType ?? null,
            constructionType: subject.constructionType ?? null,
            occupancyType: subject.occupancyType ?? null,
            replacementCost: subject.replacementCost ?? null,
            latitude: subject.latitude ?? null,
            longitude: subject.longitude ?? null,
            vulnerabilityScore: subject.vulnerabilityScore ?? null,
          }))
        : [];

      if (!name) {
        return reply.code(400).send({ error: 'missing_required_fields' });
      }

      try {
        const sequelize = getSequelize();
        const result = await sequelize.transaction(async (tx) => {
          // If no spvId supplied, auto-create a platform SPV and entity.
          let finalSpvId = spvId ? Number(spvId) : null;
          let createdSpv: any = null;
          if (!finalSpvId) {
            const registration = `SPV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            const entity = await SPVEntity.create(
              { legalName: `${String(name)} SPV Entity`, registrationNumber: registration },
              { transaction: tx },
            );
            createdSpv = await SPV.create(
              { spvEntityId: entity.id, name: `${String(name)} SPV`, jurisdiction: 'Unknown', totalCapital: '0.00', status: 'raising' },
              { transaction: tx },
            );
            finalSpvId = createdSpv.id;
          }

          const createdDeal = await Deal.create(
            {
              spvId: Number(finalSpvId),
              name: String(name),
              status: 'draft',
              coverageLimit: String(coverageLimit ?? '0.00'),
              attachmentPoint: String(attachmentPoint ?? '0.00'),
              exhaustionPoint: String(exhaustionPoint ?? '0.00'),
              premium: String(premium ?? '0.00'),
              startDate,
              endDate,
              subjectsJson: normalizedSubjects,
            },
            { transaction: tx },
          );

          let createdTranches: any[] = [];
          if (Array.isArray(tranches) && tranches.length > 0) {
            const trancheRecords = tranches.map((t: any) => ({
              dealId: createdDeal.id,
              name: t.name,
              layerMin: String(t.layerMin ?? '0.00'),
              layerMax: String(t.layerMax ?? '0.00'),
              returnRate: String(t.returnRate ?? '0.00'),
              riskLevel: t.riskLevel ?? 'medium',
              capitalRequired: t.capitalRequired == null ? null : String(t.capitalRequired),
            }));
            createdTranches = await Tranche.bulkCreate(trancheRecords, { transaction: tx, returning: true });
          }

          return { deal: createdDeal, tranches: createdTranches, spv: createdSpv };
        });

        return reply.code(201).send(result);
      } catch (err) {
        app.log.error(err);
        return reply.code(500).send({ error: 'create_deal_failed' });
      }
    },
  );
};

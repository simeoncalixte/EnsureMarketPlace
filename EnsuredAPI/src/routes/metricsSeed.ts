import { FastifyPluginAsync } from 'fastify';
import { Transaction, Op } from 'sequelize';
import { Deal, Tranche, TrancheSubscription, RiskMetric } from '../db/models';
import { getSequelize } from '../config/database';

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const ACTIVE_DEAL_STATUSES = new Set(['approved', 'fundraising', 'active']);

export const metricsSeedRoute: FastifyPluginAsync = async (app) => {
  app.post(
    '/seed/exposure-time-series',
    {
      schema: {
        description: 'Seed synthetic time-series capital exposure metrics for deals',
        body: {
          type: 'object',
          properties: {
            dealId: { type: 'integer' },
            points: { type: 'integer', default: 12, minimum: 1, maximum: 240 },
            startDate: { type: 'string', format: 'date' },
            includeAllActive: { type: 'boolean', default: false },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as { dealId?: number; points?: number; startDate?: string; includeAllActive?: boolean };
      const points = Math.max(1, Math.min(240, body.points ?? 12));

      const sequelize = getSequelize();

      const created = await sequelize.transaction(async (tx: Transaction) => {
        const targetDeals: Deal[] = [];

        if (body.dealId && !body.includeAllActive) {
          const d = await Deal.findByPk(body.dealId);
          if (!d) return 0;
          targetDeals.push(d);
        } else {
          const where: any = {};
          if (!body.includeAllActive && body.dealId) where.id = body.dealId;
          // default to active deals
          where.status = { [Op.in]: Array.from(ACTIVE_DEAL_STATUSES) };
          const deals = await Deal.findAll({ where });
          targetDeals.push(...deals);
        }

        if (targetDeals.length === 0) {
          return 0;
        }

        const start = body.startDate ? new Date(body.startDate) : (() => { const d = new Date(); d.setMonth(d.getMonth() - (points - 1)); d.setHours(0,0,0,0); return d; })();

        let createdCount = 0;

        for (const deal of targetDeals) {
          const tranches = await Tranche.findAll({ where: { dealId: deal.id } });

          let baseExposure = 0;
          for (const t of tranches) {
            const capReq = t.capitalRequired ?? null;
            if (capReq != null) {
              baseExposure += toNumber(capReq);
            } else {
              baseExposure += Math.max(0, toNumber((t as any).layerMax) - toNumber((t as any).layerMin));
            }
          }

          // If no explicit tranche capital present, fall back to deal-level sensible value
          if (baseExposure <= 0) {
            baseExposure = 5000000; // fallback baseline
          }

          for (let i = 0; i < points; i += 1) {
            const dt = new Date(start);
            dt.setMonth(start.getMonth() + i);

            // synthetic pattern: base * (0.7 + 0.6 * sin + small random)
            const seasonal = 0.1 * Math.sin((i / Math.max(1, points)) * Math.PI * 2);
            const noise = (Math.random() - 0.5) * 0.1;
            const factor = 0.8 + seasonal + noise;
            const value = Math.max(0, baseExposure * factor);

            await RiskMetric.create(
              {
                dealId: deal.id,
                metricType: 'capital_exposure',
                value: value.toFixed(6),
                calculatedAt: dt,
              },
              { transaction: tx },
            );
            createdCount += 1;
          }
        }

        return createdCount;
      });

      return reply.code(201).send({ created });
    },
  );
};

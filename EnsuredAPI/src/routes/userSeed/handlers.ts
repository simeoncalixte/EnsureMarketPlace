import { FastifyReply, FastifyRequest } from 'fastify';
import { UserService } from '../../services/UserService';
import { Organization } from '../../db/models/identity.models';

const service = new UserService();

export async function seedUsersHandler(request: FastifyRequest, reply: FastifyReply) {
  const { orgIdMap: callerMap, extraInvestors = 2 } = (request.body ?? {}) as {
    orgIdMap?: Record<string, number>;
    extraInvestors?: number;
  };

  let resolvedMap: Record<string, number>;

  if (callerMap && Object.keys(callerMap).length > 0) {
    resolvedMap = callerMap;
  } else {
    // Auto-resolve: find the first org of each needed type from the DB.
    const orgs = await Organization.findAll();

    if (orgs.length === 0) {
      return reply.code(422).send({ error: 'No organizations found. Call POST /seed/organizations first.' });
    }

    const investorFunds = orgs.filter((o) => o.type === 'investor_fund');
    const insurer       = orgs.find((o) => o.type === 'insurer');
    const admin         = orgs.find((o) => o.type === 'admin');

    resolvedMap = {
      investor_fund_primary: investorFunds[0]?.id ?? null,
      insurer:               insurer?.id ?? null,
      admin:                 admin?.id ?? null,
    };

    // Map remaining investor_fund orgs as extras
    investorFunds.slice(1).forEach((org, i) => {
      resolvedMap[`investor_fund_extra_${i}`] = org.id;
    });
  }

  // Normalize caller-supplied map: ensure numeric ids or nulls
  Object.keys(resolvedMap).forEach((k) => {
    const v = resolvedMap[k as keyof typeof resolvedMap];
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
      // coerce invalid/zero values to null so FK insertion uses NULL
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      resolvedMap[k] = null;
    }
  });

  // Ensure all seeded users receive an organization. Fill any missing entries
  // with a sensible default organization (first available). If none exist,
  // instruct the caller to seed organizations first.
  const anyMissing = Object.values(resolvedMap).some((v) => v === null || v === undefined);
  if (anyMissing) {
    const fallback = await Organization.findOne();
    if (!fallback) {
      return reply.code(422).send({ error: 'No organizations found. Call POST /seed/organizations first.' });
    }
    Object.keys(resolvedMap).forEach((k) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (resolvedMap[k] === null || resolvedMap[k] === undefined) resolvedMap[k] = fallback.id;
    });
  }

  const users = await service.seed(resolvedMap, extraInvestors);
  return reply.code(201).send({ count: users.length, users });
}

import { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { getSequelize } from '../../db/config/database';
import { User, InvestorProfile, Wallet, Organization, InsurerProfile } from '../../db/models';
import { PolicySeedService } from '../../services/PolicySeedService';
import { CapitalSeedService, CapitalInvestorContext } from '../../services/CapitalSeedService';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

const policyService = new PolicySeedService();
const capitalService = new CapitalSeedService();

export async function seedMyPortfolioHandler(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = (request.headers.authorization as string) || request.headers.Authorization as string | undefined;
  if (!authHeader) return reply.code(401).send({ error: 'missing_authorization' });
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return reply.code(401).send({ error: 'invalid_authorization' });

  let payload: any;
  try {
    payload = jwt.verify(m[1], JWT_SECRET);
  } catch (err) {
    return reply.code(401).send({ error: 'invalid_token' });
  }

  const userId = Number(payload?.userId ?? payload?.id ?? null);
  if (!userId) return reply.code(401).send({ error: 'invalid_token_payload' });

  const user = await User.findByPk(userId as number);
  if (!user) return reply.code(404).send({ error: 'user_not_found' });

  const { tranchesPerDeal = 3, extraInvestors = 1, policyCount = 2, exposuresPerPolicy = 1 } = (request.body ?? {}) as {
    tranchesPerDeal?: number;
    extraInvestors?: number;
    policyCount?: number;
    exposuresPerPolicy?: number;
  };

  const sequelize = getSequelize();

  try {
    const result = await sequelize.transaction(async (transaction) => {
      // Ensure caller has an investor profile + wallet
      let investorProfile = await InvestorProfile.findOne({ where: { userId: user.id }, transaction });
      let wallet = investorProfile ? await Wallet.findOne({ where: { investorProfileId: investorProfile.id }, transaction }) : null;

      if (!investorProfile) {
        investorProfile = await InvestorProfile.create(
          { userId: user.id, accreditationStatus: 'verified', kycStatus: 'verified', riskPreferences: { targetReturn: 0.12 } },
          { transaction },
        );
      }

      if (!wallet) {
        wallet = await Wallet.create({ investorProfileId: investorProfile.id, currency: 'USD', balanceAvailable: '1000000.00', balanceLocked: '0.00' }, { transaction });
      }

      // Ensure we have an insurer profile to underwrite policies
      let insurerProfile = await InsurerProfile.findOne({ transaction });
      let insurerUserId: number | null = null;
      if (!insurerProfile) {
        const org = await Organization.create({ name: `Pinnacle Re auto-seed ${Date.now()}`, type: 'insurer' }, { transaction });
        const insurerUser = await User.create({ organizationId: org.id, email: `underwriter.auto.${Date.now()}@ensured.local`, passwordHash: 'seed', role: 'insurer', firstName: 'Auto', lastName: 'Underwriter', isActive: true }, { transaction });
        insurerProfile = await InsurerProfile.create({ organizationId: org.id, rating: 'A', domicile: 'Bermuda' }, { transaction });
        insurerUserId = insurerUser.id;
      } else {
        // find any user belonging to insurer organization to use as submittedBy
        const insurerOrgUsers = await User.findAll({ where: { organizationId: insurerProfile.organizationId }, limit: 1, transaction });
        insurerUserId = insurerOrgUsers[0]?.id ?? null;
      }

      // Ensure an admin user exists to be used as adminUserId for capital seeding
      let adminUser = await User.findOne({ where: { role: 'admin' }, transaction });
      if (!adminUser) {
        const adminOrg = await Organization.create({ name: `Ensured Ops auto ${Date.now()}`, type: 'admin' }, { transaction });
        adminUser = await User.create({ organizationId: adminOrg.id, email: `admin.auto.${Date.now()}@ensured.local`, passwordHash: 'seed', role: 'admin', firstName: 'Auto', lastName: 'Admin', isActive: true }, { transaction });
      }

      // Prepare underwriting using PolicySeedService
      const batchId = `mypf${Date.now()}`;

      const underwriting = await policyService.seed(
        {
          batchId,
          insurerProfileId: insurerProfile.id,
          submittedByUserId: insurerUserId ?? adminUser.id,
          policyCount,
          exposuresPerPolicy,
        },
        transaction,
      );

      // Build investor contexts: include caller plus some extra fake investors to simulate a market
      const investors: CapitalInvestorContext[] = [];
      investors.push({ profileId: investorProfile.id, walletId: wallet.id });

      for (let i = 0; i < extraInvestors; i += 1) {
        const u = await User.create({ organizationId: null, email: `investor.auto.${Date.now()}_${i}@ensured.local`, passwordHash: 'seed', role: 'investor', firstName: `AutoInv${i}`, lastName: 'Seed', isActive: true }, { transaction });
        const ip = await InvestorProfile.create({ userId: u.id, accreditationStatus: 'verified', kycStatus: 'verified' }, { transaction });
        const w = await Wallet.create({ investorProfileId: ip.id, currency: 'USD', balanceAvailable: '2000000.00', balanceLocked: '0.00' }, { transaction });
        investors.push({ profileId: ip.id, walletId: w.id });
      }

      const capital = await capitalService.seed(
        {
          batchId,
          adminUserId: adminUser.id,
          investors,
          underwriting,
          tranchesPerDeal,
        },
        transaction,
      );

      return {
        batchId,
        portfolioId: underwriting.portfolioId,
        submissionId: underwriting.submissionId,
        dealId: capital.dealId,
        spvId: capital.spvId,
        tranches: capital.trancheCount,
        commitments: capital.commitmentCount,
        subscriptions: capital.subscriptionCount,
      };
    });

    return reply.code(201).send(result);
  } catch (err: any) {
    request.log.error(err);
    return reply.code(500).send({ error: 'seed_failed', message: err?.message ?? String(err) });
  }
}

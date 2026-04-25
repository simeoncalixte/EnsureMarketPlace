import { Deal, InvestorProfile, Tranche, TrancheSubscription, User } from '../db/models';

const ACTIVE_DEAL_STATUSES = new Set(['approved', 'fundraising', 'active']);
const OPEN_SUBSCRIPTION_STATUSES = new Set(['committed', 'pending', 'partially_filled', 'filled']);

export interface DefaultInvestorInfo {
  investorUserId: number;
  investorProfileId: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface InvestorActiveDeal {
  id: string;
  investorUserId: number;
  investorProfileId: number;
  dealId: number;
  dealName: string;
  dealStatus: string;
  trancheId: number;
  trancheName: string;
  riskLevel: string;
  expectedReturnPct: number;
  capitalRequired: number;
  fundedAmount: number;
  pendingAmount: number;
  investorCommittedAmount: number;
  investorAllocationPct: number;
  status: 'active' | 'available';
}

export interface InvestorDashboardSummary {
  totalInvested: number;
  totalAvailable: number;
  activePositions: number;
  availableDeals: number;
  blendedIrr: number;
  projectedAnnualReturn: number;
  capitalAtRisk: number;
  liveTranches: number;
}

export interface InvestorDashboardPayload {
  summary: InvestorDashboardSummary;
  deals: InvestorActiveDeal[];
}

export class InvestorNotFoundError extends Error {
  constructor(message = 'Investor user not found') {
    super(message);
    this.name = 'InvestorNotFoundError';
  }
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export class InvestorDealsService {
  private buildDashboardSummary(deals: InvestorActiveDeal[]): InvestorDashboardSummary {
    const totalInvested = deals.reduce((sum, row) => sum + Math.max(0, row.investorCommittedAmount), 0);
    const totalAvailable = deals.reduce((sum, row) => sum + Math.max(0, row.pendingAmount), 0);
    const activePositions = deals.filter((row) => row.status === 'active').length;
    const availableDeals = deals.filter((row) => row.status === 'available').length;
    const weightedBase = deals.reduce((sum, row) => sum + Math.max(1, row.investorCommittedAmount), 0);
    const weightedReturn = deals.reduce(
      (sum, row) => sum + (row.expectedReturnPct * Math.max(1, row.investorCommittedAmount)),
      0,
    );
    const blendedIrr = weightedBase > 0 ? weightedReturn / weightedBase : 0;
    const projectedAnnualReturn = totalInvested * (blendedIrr / 100);
    const capitalAtRisk = deals
      .filter((row) => row.status === 'active')
      .reduce((sum, row) => sum + Math.max(0, row.investorCommittedAmount), 0);

    return {
      totalInvested,
      totalAvailable,
      activePositions,
      availableDeals,
      blendedIrr,
      projectedAnnualReturn,
      capitalAtRisk,
      liveTranches: deals.length,
    };
  }

  async getDefaultInvestor(): Promise<DefaultInvestorInfo | null> {
    const user = await User.findOne({
      where: { role: 'investor', isActive: true },
      include: [{ model: InvestorProfile, as: 'investorProfile', required: true }],
      order: [['id', 'ASC']],
    });

    if (!user) {
      return null;
    }

    const investorProfile = (user as unknown as { investorProfile?: InvestorProfile }).investorProfile;
    if (!investorProfile) {
      return null;
    }

    return {
      investorUserId: user.id,
      investorProfileId: investorProfile.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };
  }

  async listActiveDealsForInvestor(investorUserId: number): Promise<InvestorActiveDeal[]> {
    const user = await User.findByPk(investorUserId, {
      include: [{ model: InvestorProfile, as: 'investorProfile' }],
    });

    const investorProfile = (user as unknown as { investorProfile?: InvestorProfile }).investorProfile;
    if (!user || user.role !== 'investor' || !investorProfile) {
      throw new InvestorNotFoundError();
    }

    const tranches = await Tranche.findAll({
      include: [
        {
          model: Deal,
          as: 'deal',
          where: { status: Array.from(ACTIVE_DEAL_STATUSES) },
          required: true,
        },
        {
          model: TrancheSubscription,
          as: 'subscriptions',
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const results: InvestorActiveDeal[] = [];

    for (const tranche of tranches) {
      const deal = (tranche as unknown as { deal?: Deal }).deal;
      if (!deal) continue;

      const allSubscriptions = ((tranche as unknown as { subscriptions?: TrancheSubscription[] }).subscriptions ?? []).filter(
        (subscription) => OPEN_SUBSCRIPTION_STATUSES.has(String(subscription.status).toLowerCase()),
      );

      const capitalRequired = toNumber(tranche.capitalRequired);
      const fundedAmount = allSubscriptions.reduce((sum, subscription) => sum + toNumber(subscription.committedAmount), 0);
      const pendingAmount = Math.max(0, capitalRequired - fundedAmount);

      const investorCommittedAmount = allSubscriptions
        .filter((subscription) => subscription.investorProfileId === investorProfile.id)
        .reduce((sum, subscription) => sum + toNumber(subscription.committedAmount), 0);

      if (capitalRequired <= 0) continue;

      // Keep tranches that are still open, or where this investor already has committed capital.
      if (pendingAmount <= 0 && investorCommittedAmount <= 0) continue;

      const expectedReturnPct = toNumber(tranche.expectedReturn ?? tranche.returnRate) * 100;
      const investorAllocationPct = capitalRequired > 0
        ? Math.min(100, (investorCommittedAmount / capitalRequired) * 100)
        : 0;

      results.push({
        id: `${investorUserId}-${deal.id}-${tranche.id}`,
        investorUserId,
        investorProfileId: investorProfile.id,
        dealId: deal.id,
        dealName: deal.name,
        dealStatus: deal.status,
        trancheId: tranche.id,
        trancheName: tranche.name,
        riskLevel: tranche.riskLevel,
        expectedReturnPct,
        capitalRequired,
        fundedAmount,
        pendingAmount,
        investorCommittedAmount,
        investorAllocationPct,
        status: investorCommittedAmount > 0 ? 'active' : 'available',
      });
    }

    results.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      return b.pendingAmount - a.pendingAmount;
    });

    return results;
  }

  async getDashboardForInvestor(investorUserId: number): Promise<InvestorDashboardPayload> {
    const deals = await this.listActiveDealsForInvestor(investorUserId);
    return {
      summary: this.buildDashboardSummary(deals),
      deals,
    };
  }
}

import {
  CapitalCommitment,
  Claim,
  ClaimCalculation,
  CollateralAccount,
  CollateralMovement,
  Deal,
  Document,
  InvestorPayout,
  LedgerEntry,
  LegalDocument,
  Order,
  OrderBookSnapshot,
  Organization,
  ParametricDefinition,
  Payout,
  Policy,
  RiskMetric,
  SPV,
  SPVOwnership,
  Token,
  TokenHolder,
  TokenLock,
  TokenTransaction,
  Trade,
  Tranche,
  TrancheSubscription,
  Trigger,
  User,
  ExposureUnit,
  InvestorProfile,
} from '../../src/db/models';
import { initTestDb } from '../helpers/db';
import { ReinsuranceSeedService } from '../../src/services/ReinsuranceSeedService';

describe('ReinsuranceSeedService', () => {
  const service = new ReinsuranceSeedService();

  beforeAll(async () => {
    await initTestDb();
  });

  beforeEach(async () => {
    await initTestDb();
  });

  it('seeds full default reinsurance flow and persists linked records', async () => {
    const summary = await service.seedAll();

    expect(summary.organizations).toBe(5);
    expect(summary.users).toBe(6);
    expect(summary.investorProfiles).toBe(3);
    expect(summary.policies).toBe(8);
    expect(summary.exposures).toBe(16);
    expect(summary.tranches).toBe(3);
    expect(summary.commitments).toBe(3);
    expect(summary.subscriptions).toBe(2);
    expect(summary.tokens).toBe(3);

    expect(await Organization.count()).toBe(5);
    expect(await User.count()).toBe(6);
    expect(await InvestorProfile.count()).toBe(3);
    expect(await Policy.count()).toBe(8);
    expect(await ExposureUnit.count()).toBe(16);
    expect(await SPV.count()).toBe(1);
    expect(await Deal.count()).toBe(1);
    expect(await Tranche.count()).toBe(3);
    expect(await CapitalCommitment.count()).toBe(3);
    expect(await SPVOwnership.count()).toBe(3);
    expect(await TrancheSubscription.count()).toBe(2);
    expect(await Token.count()).toBe(3);
    expect(await TokenHolder.count()).toBe(3);
    expect(await Order.count()).toBe(2);
    expect(await Trade.count()).toBe(1);
    expect(await TokenTransaction.count()).toBe(1);
    expect(await TokenLock.count()).toBe(1);
    expect(await OrderBookSnapshot.count()).toBe(1);
    expect(await CollateralAccount.count()).toBe(1);
    expect(await CollateralMovement.count()).toBe(1);
    expect(await Trigger.count()).toBe(1);
    expect(await ParametricDefinition.count()).toBe(1);
    expect(await Claim.count()).toBe(1);
    expect(await ClaimCalculation.count()).toBe(1);
    expect(await Payout.count()).toBe(1);
    expect(await InvestorPayout.count()).toBe(3);
    expect(await LedgerEntry.count()).toBe(3);
    expect(await RiskMetric.count()).toBe(3);
    expect(await LegalDocument.count()).toBe(2);
    expect(await Document.count()).toBe(1);

    const seededDeal = await Deal.findByPk(summary.ids.dealId);
    expect(seededDeal).not.toBeNull();
    expect(seededDeal!.spvId).toBe(summary.ids.spvId);

    const firstExposure = await ExposureUnit.findOne({ order: [['id', 'ASC']] });
    expect(firstExposure).not.toBeNull();
    expect(firstExposure!.subjectLabel).toBe('Subject 1');
    expect(firstExposure!.subjectIndex).toBe(1);
  });

  it('honors custom sizing options', async () => {
    const summary = await service.seedAll({
      investorCount: 4,
      policyCount: 5,
      exposuresPerPolicy: 3,
      tranchesPerDeal: 2,
    });

    expect(summary.organizations).toBe(6);
    expect(summary.users).toBe(7);
    expect(summary.investorProfiles).toBe(4);
    expect(summary.policies).toBe(5);
    expect(summary.exposures).toBe(15);
    expect(summary.tranches).toBe(2);
    expect(summary.commitments).toBe(4);
    expect(summary.subscriptions).toBe(3);
    expect(summary.tokens).toBe(2);
  });
});

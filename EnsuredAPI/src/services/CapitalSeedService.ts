import { Transaction } from 'sequelize';
import {
  CapitalCommitment,
  Claim,
  ClaimCalculation,
  CollateralAccount,
  CollateralMovement,
  Deal,
  Document,
  Fee,
  InvestorPayout,
  LedgerEntry,
  LegalDocument,
  Order,
  OrderBookSnapshot,
  ParametricDefinition,
  Payout,
  PlatformEvent,
  RiskMetric,
  SPV,
  SPVEntity,
  SPVOwnership,
  Token,
  TokenHolder,
  TokenLock,
  TokenTransaction,
  Trade,
  Tranche,
  TrancheSubscription,
  Trigger,
} from '../db/models';
import { PolicySeedResult } from './PolicySeedService';

export interface CapitalInvestorContext {
  profileId: number;
  walletId: number;
}

export interface CapitalSeedInput {
  batchId: string;
  adminUserId: number;
  investors: CapitalInvestorContext[];
  underwriting: PolicySeedResult;
  tranchesPerDeal: number;
}

export interface CapitalSeedResult {
  spvId: number;
  dealId: number;
  trancheCount: number;
  commitmentCount: number;
  subscriptionCount: number;
  tokenCount: number;
  claimId: number;
  payoutId: number;
}

export class CapitalSeedService {
  async seed(input: CapitalSeedInput, transaction: Transaction): Promise<CapitalSeedResult> {
    const investorCount = Math.max(1, input.investors.length);
    const trancheCount = Math.max(1, input.tranchesPerDeal);
    const committedPerInvestor = 750000;
    const totalCapital = committedPerInvestor * investorCount;

    const spvEntity = await SPVEntity.create(
      {
        legalName: `Ensured Re Series ${input.batchId}`,
        registrationNumber: `REG-${input.batchId}`,
        regulator: 'BMA',
        domicile: 'Bermuda',
      },
      { transaction },
    );

    const spv = await SPV.create(
      {
        spvEntityId: spvEntity.id,
        name: `Ensured SPV ${input.batchId}`,
        jurisdiction: 'Bermuda',
        totalCapital: totalCapital.toFixed(2),
        status: 'active',
      },
      { transaction },
    );

    const deal = await Deal.create(
      {
        spvId: spv.id,
        portfolioId: input.underwriting.portfolioId,
        submissionId: input.underwriting.submissionId,
        pricingId: input.underwriting.pricingId,
        approvedByUserId: input.adminUserId,
        name: `Gulf Wind Layer ${input.batchId}`,
        status: 'approved',
        coverageLimit: '50000000.00',
        attachmentPoint: '20000000.00',
        exhaustionPoint: '70000000.00',
        premium: input.underwriting.totalPremium,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        subjectsJson: input.underwriting.policyIds.map((_, index) => ({
          subjectLabel: `Subject ${index + 1}`,
          subjectIndex: index + 1,
        })),
      },
      { transaction },
    );

    const riskLevels = ['low', 'medium', 'high'];
    const tranches: Tranche[] = [];
    const trancheSize = totalCapital / trancheCount;

    for (let i = 0; i < trancheCount; i += 1) {
      const layerMin = 20000000 + i * 5000000;
      const layerMax = layerMin + 5000000;

      const tranche = await Tranche.create(
        {
          dealId: deal.id,
          name: `Tranche-${String.fromCharCode(65 + i)}`,
          layerMin: layerMin.toFixed(2),
          layerMax: layerMax.toFixed(2),
          returnRate: (0.08 + i * 0.02).toFixed(4),
          riskLevel: riskLevels[i % riskLevels.length],
          capitalRequired: trancheSize.toFixed(2),
          expectedReturn: (0.09 + i * 0.015).toFixed(4),
          lossProbability: (0.02 + i * 0.01).toFixed(6),
        },
        { transaction },
      );

      tranches.push(tranche);
    }

    for (const investor of input.investors) {
      await CapitalCommitment.create(
        {
          investorProfileId: investor.profileId,
          dealId: deal.id,
          committedAmount: committedPerInvestor.toFixed(2),
          calledAmount: '0.00',
          remainingAmount: committedPerInvestor.toFixed(2),
          status: 'committed',
        },
        { transaction },
      );

      await SPVOwnership.create(
        {
          spvId: spv.id,
          investorProfileId: investor.profileId,
          percentage: (100 / investorCount).toFixed(4),
          capitalCommitted: committedPerInvestor.toFixed(2),
        },
        { transaction },
      );
    }

    let subscriptionCount = 0;
    // Intentionally leave at least one tranche with no subscriptions (new / zero-funded)
    // and keep subscribed tranches below required capital (partially funded).
    const openTrancheCount = tranches.length > 1 ? tranches.length - 1 : tranches.length;
    const subscriptionInvestorCount = Math.max(1, input.investors.length - 1);
    const partialCommitmentAmount = Math.min(committedPerInvestor, trancheSize * 0.45);

    for (let i = 0; i < subscriptionInvestorCount; i += 1) {
      const investor = input.investors[i];
      const targetTranche = tranches[i % openTrancheCount];

      subscriptionCount += 1;
      await TrancheSubscription.create(
        {
          trancheId: targetTranche.id,
          investorProfileId: investor.profileId,
          committedAmount: partialCommitmentAmount.toFixed(2),
          deployedAmount: '0.00',
          status: 'committed',
        },
        { transaction },
      );
    }

    const collateralAccount = await CollateralAccount.create(
      {
        spvId: spv.id,
        custodian: 'Global Trust Bank',
        accountReference: `COLL-${input.batchId}`,
        balance: totalCapital.toFixed(2),
        currency: 'USD',
      },
      { transaction },
    );

    await CollateralMovement.create(
      {
        collateralAccountId: collateralAccount.id,
        amount: totalCapital.toFixed(2),
        type: 'deposit',
        referenceType: 'seed',
        referenceId: deal.id,
        occurredAt: new Date(),
      },
      { transaction },
    );

    const tokens: Token[] = [];
    for (let i = 0; i < tranches.length; i += 1) {
      const token = await Token.create(
        {
          spvId: spv.id,
          trancheId: tranches[i].id,
          symbol: `TR${String(i + 1)}D${deal.id}T${tranches[i].id}`,
          totalSupply: '1000000.00000000',
          circulatingSupply: '0.00000000',
          price: '1.00000000',
        },
        { transaction },
      );

      tokens.push(token);
    }

    const tokenHolders: TokenHolder[] = [];
    const primaryToken = tokens[0];
    for (const investor of input.investors) {
      const holder = await TokenHolder.create(
        {
          investorProfileId: investor.profileId,
          tokenId: primaryToken.id,
          balance: '1000.00000000',
        },
        { transaction },
      );

      tokenHolders.push(holder);
    }

    if (input.investors.length >= 2) {
      const buyOrder = await Order.create(
        {
          investorProfileId: input.investors[0].profileId,
          tokenId: primaryToken.id,
          type: 'buy',
          quantity: '100.00000000',
          price: '1.02000000',
          status: 'filled',
          placedAt: new Date(),
        },
        { transaction },
      );

      const sellOrder = await Order.create(
        {
          investorProfileId: input.investors[1].profileId,
          tokenId: primaryToken.id,
          type: 'sell',
          quantity: '100.00000000',
          price: '0.98000000',
          status: 'filled',
          placedAt: new Date(),
        },
        { transaction },
      );

      const trade = await Trade.create(
        {
          buyOrderId: buyOrder.id,
          sellOrderId: sellOrder.id,
          tokenId: primaryToken.id,
          quantity: '100.00000000',
          price: '1.00000000',
          executedAt: new Date(),
        },
        { transaction },
      );

      await TokenTransaction.create(
        {
          tokenId: primaryToken.id,
          fromHolderId: tokenHolders[1].id,
          toHolderId: tokenHolders[0].id,
          tradeId: trade.id,
          amount: '100.00000000',
          type: 'transfer',
          executedAt: new Date(),
        },
        { transaction },
      );
    }

    await TokenLock.create(
      {
        tokenHolderId: tokenHolders[0].id,
        quantity: '50.00000000',
        reason: 'seed_lockup',
        lockUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      { transaction },
    );

    await OrderBookSnapshot.create(
      {
        tokenId: primaryToken.id,
        bids: [{ price: '1.01', qty: '100' }],
        asks: [{ price: '1.03', qty: '100' }],
        capturedAt: new Date(),
      },
      { transaction },
    );

    const trigger = await Trigger.create(
      {
        portfolioId: input.underwriting.portfolioId,
        dealId: deal.id,
        type: 'parametric',
        definitionJson: {
          source: 'NOAA',
          metric: 'wind_speed',
        },
      },
      { transaction },
    );

    await ParametricDefinition.create(
      {
        triggerId: trigger.id,
        indexName: 'NOAA_WIND_INDEX',
        threshold: '130mph',
        payoutFormula: 'min(limit, (wind-130)*125000)',
      },
      { transaction },
    );

    const event = await PlatformEvent.create(
      {
        type: 'hurricane',
        location: 'US-GULF',
        severity: 'category-4',
        occurredAt: new Date(),
        description: 'Seeded catastrophic event',
      },
      { transaction },
    );

    const claim = await Claim.create(
      {
        portfolioId: input.underwriting.portfolioId,
        policyId: input.underwriting.policyIds[0] ?? null,
        dealId: deal.id,
        eventId: event.id,
        lossAmount: '12000000.00',
        payoutAmount: '8500000.00',
        status: 'approved',
        submittedAt: new Date(),
        approvedAt: new Date(),
      },
      { transaction },
    );

    await ClaimCalculation.create(
      {
        claimId: claim.id,
        inputsJson: { eventId: event.id, modelRunId: input.underwriting.modelRunId },
        stepsJson: { step1: 'validate trigger', step2: 'compute payout' },
        resultJson: { approvedPayout: '8500000.00' },
        executedAt: new Date(),
        executedByUserId: input.adminUserId,
      },
      { transaction },
    );

    const payout = await Payout.create(
      {
        dealId: deal.id,
        claimId: claim.id,
        totalAmount: '8500000.00',
        distributedAt: new Date(),
      },
      { transaction },
    );

    const eachPayoutAmount = 8500000 / investorCount;
    for (const investor of input.investors) {
      await InvestorPayout.create(
        {
          payoutId: payout.id,
          investorProfileId: investor.profileId,
          amount: eachPayoutAmount.toFixed(2),
        },
        { transaction },
      );

      await LedgerEntry.create(
        {
          userId: null,
          walletId: investor.walletId,
          type: 'credit',
          amount: eachPayoutAmount.toFixed(2),
          referenceType: 'payout',
          referenceId: payout.id,
        },
        { transaction },
      );
    }

    await Fee.create(
      {
        type: 'management',
        rate: '0.010000',
        amount: '75000.00',
        chargedToEntityType: 'deal',
        chargedToEntityId: deal.id,
        referenceType: 'seed',
        referenceId: deal.id,
        dealId: deal.id,
        tradeId: null,
      },
      { transaction },
    );

    await RiskMetric.create(
      {
        dealId: deal.id,
        metricType: 'expected_loss',
        value: '8500000.000000',
        sourceModelRunId: input.underwriting.modelRunId,
        calculatedAt: new Date(),
      },
      { transaction },
    );

    await RiskMetric.create(
      {
        dealId: deal.id,
        metricType: 'var95',
        value: '12000000.000000',
        sourceModelRunId: input.underwriting.modelRunId,
        calculatedAt: new Date(),
      },
      { transaction },
    );

    await RiskMetric.create(
      {
        dealId: deal.id,
        metricType: 'var99',
        value: '15000000.000000',
        sourceModelRunId: input.underwriting.modelRunId,
        calculatedAt: new Date(),
      },
      { transaction },
    );

    await LegalDocument.create(
      {
        entityType: 'deal',
        entityId: deal.id,
        docType: 'reinsurance_contract',
        url: `s3://seed/legal/reinsurance_contract_${input.batchId}.pdf`,
        required: true,
        signer: 'Platform Counsel',
        issuedAt: new Date(),
        uploadedByUserId: input.adminUserId,
        uploadedAt: new Date(),
      },
      { transaction },
    );

    await LegalDocument.create(
      {
        entityType: 'spv',
        entityId: spv.id,
        docType: 'spv_incorporation',
        url: `s3://seed/legal/spv_incorporation_${input.batchId}.pdf`,
        required: true,
        signer: 'SPV Registrar',
        issuedAt: new Date(),
        uploadedByUserId: input.adminUserId,
        uploadedAt: new Date(),
      },
      { transaction },
    );

    await Document.create(
      {
        entityType: 'deal',
        entityId: deal.id,
        type: 'disclosure',
        url: `s3://seed/docs/investor_disclosure_${input.batchId}.pdf`,
        uploadedByUserId: input.adminUserId,
        uploadedAt: new Date(),
      },
      { transaction },
    );

    return {
      spvId: spv.id,
      dealId: deal.id,
      trancheCount: tranches.length,
      commitmentCount: investorCount,
      subscriptionCount,
      tokenCount: tokens.length,
      claimId: claim.id,
      payoutId: payout.id,
    };
  }
}

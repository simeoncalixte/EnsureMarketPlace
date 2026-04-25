import { Transaction } from 'sequelize';
import {
  ModelRun,
  Policy,
  Pricing,
  PricingVersion,
  RiskPortfolio,
  Submission,
  ExposureUnit,
} from '../db/models';
import { assetTypes, constructionTypes, occupancyTypes, perilCodes, policyTypes } from '../db/models/constants';

export interface PolicySeedInput {
  batchId: string;
  insurerProfileId: number;
  submittedByUserId: number;
  policyCount: number;
  exposuresPerPolicy: number;
}

export interface PolicySeedResult {
  portfolioId: number;
  submissionId: number;
  modelRunId: number;
  pricingId: number;
  pricingVersionId: number;
  policyIds: number[];
  exposureCount: number;
  totalPremium: string;
  totalExposure: string;
}

export class PolicySeedService {
  async seed(input: PolicySeedInput, transaction: Transaction): Promise<PolicySeedResult> {
    const policyCount = Math.max(1, input.policyCount);
    const exposuresPerPolicy = Math.max(1, input.exposuresPerPolicy);

    const portfolio = await RiskPortfolio.create(
      {
        insurerProfileId: input.insurerProfileId,
        name: `Portfolio ${input.batchId}`,
        region: 'US-GULF',
        perilType: 'hurricane',
        totalExposure: '0.00',
        totalPremium: '0.00',
        expectedLoss: '0.00',
        var95: '0.00',
        var99: '0.00',
        currency: 'USD',
      },
      { transaction },
    );

    const submission = await Submission.create(
      {
        insurerProfileId: input.insurerProfileId,
        portfolioId: portfolio.id,
        submittedByUserId: input.submittedByUserId,
        status: 'submitted',
      },
      { transaction },
    );

    const policyIds: number[] = [];
    let exposureCount = 0;
    let totalPremium = 0;
    let totalExposure = 0;

    for (let i = 0; i < policyCount; i += 1) {
      const premium = 125000 + i * 6000;
      const insuredValue = 2200000 + i * 150000;
      totalPremium += premium;
      totalExposure += insuredValue;

      const policy = await Policy.create(
        {
          externalPolicyId: `${input.batchId}-POL-${String(i + 1).padStart(4, '0')}`,
          insurerProfileId: input.insurerProfileId,
          portfolioId: portfolio.id,
          submissionId: submission.id,
          policyType: policyTypes[i % policyTypes.length],
          effectiveDate: new Date('2026-01-01'),
          expirationDate: new Date('2026-12-31'),
          premium: premium.toFixed(2),
          insuredValue: insuredValue.toFixed(2),
          deductible: '50000.00',
          coverageLimit: (insuredValue * 0.9).toFixed(2),
          latitude: (29.5 + i * 0.03) as unknown as number,
          longitude: (-90.1 - i * 0.03) as unknown as number,
          region: 'US-GULF',
          perilCoverage: [perilCodes[i % perilCodes.length], perilCodes[(i + 1) % perilCodes.length]],
          underwritingScore: (0.74 + i * 0.01).toFixed(4),
          currency: 'USD',
          normalizedCurrency: 'USD',
          normalizationRate: '1.000000000000',
          normalizationAt: new Date(),
        },
        { transaction },
      );

      policyIds.push(policy.id);

      for (let j = 0; j < exposuresPerPolicy; j += 1) {
        exposureCount += 1;

        await ExposureUnit.create(
          {
            exposureRef: `${input.batchId}-EXP-${String(policy.id).padStart(4, '0')}-${String(j + 1).padStart(2, '0')}`,
            policyId: policy.id,
            subjectLabel: `Subject ${j + 1}`,
            subjectIndex: j + 1,
            assetType: assetTypes[(i + j) % assetTypes.length],
            constructionType: constructionTypes[(i + j) % constructionTypes.length],
            occupancyType: occupancyTypes[(i + j) % occupancyTypes.length],
            replacementCost: (850000 + i * 15000 + j * 5000).toFixed(2),
            latitude: (29.6 + i * 0.03 + j * 0.004) as unknown as number,
            longitude: (-90.2 - i * 0.03 - j * 0.004) as unknown as number,
            vulnerabilityScore: (0.4 + (i + j) * 0.02).toFixed(4),
          },
          { transaction },
        );
      }
    }

    const expectedLoss = totalPremium * 0.36;
    await portfolio.update(
      {
        totalPremium: totalPremium.toFixed(2),
        totalExposure: totalExposure.toFixed(2),
        expectedLoss: expectedLoss.toFixed(6),
        var95: (expectedLoss * 1.35).toFixed(6),
        var99: (expectedLoss * 1.75).toFixed(6),
      },
      { transaction },
    );

    const modelRun = await ModelRun.create(
      {
        submissionId: submission.id,
        modelVersion: 'cat-v1.0',
        parametersJson: {
          peril: 'hurricane',
          region: 'US-GULF',
          policies: policyCount,
          exposures: exposureCount,
        },
        expectedLoss: expectedLoss.toFixed(6),
        var99: (expectedLoss * 1.75).toFixed(6),
        outputJson: {
          stress: 'moderate',
          tailRiskIndex: 0.23,
        },
        executedByUserId: input.submittedByUserId,
      },
      { transaction },
    );

    const pricing = await Pricing.create(
      {
        submissionId: submission.id,
        currentVersionNumber: 1,
      },
      { transaction },
    );

    const pricingVersion = await PricingVersion.create(
      {
        pricingId: pricing.id,
        versionNumber: 1,
        assumptionsJson: {
          margin: 0.18,
          catastropheLoad: 0.11,
        },
        premium: (totalPremium * 1.08).toFixed(2),
        expectedReturn: '0.1280',
        riskScore: '0.6120',
        createdByUserId: input.submittedByUserId,
      },
      { transaction },
    );

    return {
      portfolioId: portfolio.id,
      submissionId: submission.id,
      modelRunId: modelRun.id,
      pricingId: pricing.id,
      pricingVersionId: pricingVersion.id,
      policyIds,
      exposureCount,
      totalPremium: totalPremium.toFixed(2),
      totalExposure: totalExposure.toFixed(2),
    };
  }
}

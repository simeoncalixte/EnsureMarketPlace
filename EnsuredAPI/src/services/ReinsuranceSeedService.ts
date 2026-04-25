import { Transaction } from 'sequelize';
import {
  AccreditationCheck,
  BankAccount,
  InsurerProfile,
  InvestorProfile,
  KYCRecord,
  Organization,
  User,
  Wallet,
} from '../db/models';
import { getSequelize } from '../config/database';
import { CapitalInvestorContext, CapitalSeedService } from './CapitalSeedService';
import { PolicySeedService } from './PolicySeedService';

export interface ReinsuranceSeedOptions {
  investorCount?: number;
  policyCount?: number;
  exposuresPerPolicy?: number;
  tranchesPerDeal?: number;
}

export interface ReinsuranceSeedSummary {
  batchId: string;
  organizations: number;
  users: number;
  investorProfiles: number;
  policies: number;
  exposures: number;
  tranches: number;
  commitments: number;
  subscriptions: number;
  tokens: number;
  ids: {
    portfolioId: number;
    submissionId: number;
    dealId: number;
    spvId: number;
    claimId: number;
    payoutId: number;
  };
}

interface IdentitySeedResult {
  insurerUserId: number;
  adminUserId: number;
  insurerProfileId: number;
  investors: CapitalInvestorContext[];
  organizations: number;
  users: number;
}

export class ReinsuranceSeedService {
  private readonly policySeedService = new PolicySeedService();

  private readonly capitalSeedService = new CapitalSeedService();

  async seedAll(options: ReinsuranceSeedOptions = {}): Promise<ReinsuranceSeedSummary> {
    const investorCount = Math.max(2, options.investorCount ?? 3);
    const policyCount = Math.max(1, options.policyCount ?? 8);
    const exposuresPerPolicy = Math.max(1, options.exposuresPerPolicy ?? 2);
    const tranchesPerDeal = Math.max(1, options.tranchesPerDeal ?? 3);
    const batchId = `seed${Date.now()}`;

    const sequelize = getSequelize();

    return sequelize.transaction(async (transaction) => {
      const identity = await this.seedIdentity(batchId, investorCount, transaction);

      const underwriting = await this.policySeedService.seed(
        {
          batchId,
          insurerProfileId: identity.insurerProfileId,
          submittedByUserId: identity.insurerUserId,
          policyCount,
          exposuresPerPolicy,
        },
        transaction,
      );

      const capital = await this.capitalSeedService.seed(
        {
          batchId,
          adminUserId: identity.adminUserId,
          investors: identity.investors,
          underwriting,
          tranchesPerDeal,
        },
        transaction,
      );

      return {
        batchId,
        organizations: identity.organizations,
        users: identity.users,
        investorProfiles: identity.investors.length,
        policies: underwriting.policyIds.length,
        exposures: underwriting.exposureCount,
        tranches: capital.trancheCount,
        commitments: capital.commitmentCount,
        subscriptions: capital.subscriptionCount,
        tokens: capital.tokenCount,
        ids: {
          portfolioId: underwriting.portfolioId,
          submissionId: underwriting.submissionId,
          dealId: capital.dealId,
          spvId: capital.spvId,
          claimId: capital.claimId,
          payoutId: capital.payoutId,
        },
      };
    });
  }

  private async seedIdentity(batchId: string, investorCount: number, transaction: Transaction): Promise<IdentitySeedResult> {
    const insurerOrg = await Organization.create(
      {
        name: `Pinnacle Re ${batchId}`,
        type: 'insurer',
      },
      { transaction },
    );

    const adminOrg = await Organization.create(
      {
        name: `Ensured Ops ${batchId}`,
        type: 'admin',
      },
      { transaction },
    );

    const investorOrgs: Organization[] = [];
    for (let i = 0; i < investorCount; i += 1) {
      const org = await Organization.create(
        {
          name: `Investor Fund ${i + 1} ${batchId}`,
          type: 'investor_fund',
        },
        { transaction },
      );

      investorOrgs.push(org);
    }

    const insurerUser = await User.create(
      {
        organizationId: insurerOrg.id,
        email: `underwriter.${batchId}@ensured.local`,
        passwordHash: `hash_${batchId}_insurer`,
        role: 'insurer',
        firstName: 'Morgan',
        lastName: 'Reyes',
        isActive: true,
      },
      { transaction },
    );

    const adminUser = await User.create(
      {
        organizationId: adminOrg.id,
        email: `admin.${batchId}@ensured.local`,
        passwordHash: `hash_${batchId}_admin`,
        role: 'admin',
        firstName: 'Alex',
        lastName: 'Torres',
        isActive: true,
      },
      { transaction },
    );

    await User.create(
      {
        organizationId: adminOrg.id,
        email: `analyst.${batchId}@ensured.local`,
        passwordHash: `hash_${batchId}_analyst`,
        role: 'analyst',
        firstName: 'Sam',
        lastName: 'Nguyen',
        isActive: true,
      },
      { transaction },
    );

    const insurerProfile = await InsurerProfile.create(
      {
        organizationId: insurerOrg.id,
        rating: 'A',
        domicile: 'Bermuda',
      },
      { transaction },
    );

    const investors: CapitalInvestorContext[] = [];
    for (let i = 0; i < investorOrgs.length; i += 1) {
      const investorUser = await User.create(
        {
          organizationId: investorOrgs[i].id,
          email: `investor${i + 1}.${batchId}@ensured.local`,
          passwordHash: `hash_${batchId}_investor_${i + 1}`,
          role: 'investor',
          firstName: `Investor${i + 1}`,
          lastName: 'Capital',
          isActive: true,
        },
        { transaction },
      );

      const investorProfile = await InvestorProfile.create(
        {
          userId: investorUser.id,
          accreditationStatus: 'verified',
          kycStatus: 'verified',
          riskPreferences: {
            targetReturn: 0.12,
            riskBand: 'balanced',
          },
        },
        { transaction },
      );

      const wallet = await Wallet.create(
        {
          investorProfileId: investorProfile.id,
          currency: 'USD',
          balanceAvailable: '5000000.00',
          balanceLocked: '0.00',
        },
        { transaction },
      );

      await BankAccount.create(
        {
          investorProfileId: investorProfile.id,
          bankName: 'Global Trust Bank',
          routingNumber: `1000000${i + 1}`,
          accountNumber: `99000${i + 1}${batchId.slice(-4)}`,
          accountType: 'institutional',
          verified: true,
        },
        { transaction },
      );

      await KYCRecord.create(
        {
          investorProfileId: investorProfile.id,
          provider: 'ComplyCo',
          verificationLevel: 'enhanced',
          status: 'verified',
          documentsJson: [{ type: 'passport' }],
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          verifiedAt: new Date(),
        },
        { transaction },
      );

      await AccreditationCheck.create(
        {
          investorProfileId: investorProfile.id,
          status: 'verified',
          verifiedAt: new Date(),
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        { transaction },
      );

      investors.push({
        profileId: investorProfile.id,
        walletId: wallet.id,
      });
    }

    return {
      insurerUserId: insurerUser.id,
      adminUserId: adminUser.id,
      insurerProfileId: insurerProfile.id,
      investors,
      organizations: investorOrgs.length + 2,
      users: investorOrgs.length + 3,
    };
  }
}

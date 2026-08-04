import { faker } from '@faker-js/faker';
import { Organization } from '../db/models/identity.models';
import { organizationTypes } from '../db/models/constants';

export type OrganizationCreateInput = {
  name: string;
  type: (typeof organizationTypes)[number];
  submissionBoardConfig?: Record<string, unknown> | null;
};

export class OrganizationService {
  async create(data: OrganizationCreateInput): Promise<Organization> {
    return Organization.create(data);
  }

  async findById(id: number): Promise<Organization | null> {
    return Organization.findByPk(id);
  }

  async findAll(): Promise<Organization[]> {
    return Organization.findAll();
  }

  /**
   * Seeds one Organization per organizationType to ensure full coverage
   * of all roles in the system, plus additional random investor funds.
   *
   * Fixed entries (one per type):
   *   - investor_fund  → "Alpha Capital Fund"
   *   - insurer        → "Pinnacle Re Insurance"
   *   - admin          → "Ensured Platform Operations"
   *
   * Additional random entries:
   *   - `extras` additional investor_fund organizations (default: 2)
   */
  async seed(extras = 2): Promise<Organization[]> {
    const fixed: OrganizationCreateInput[] = [
      { name: 'Alpha Capital Fund',          type: 'investor_fund' },
      { name: 'Pinnacle Re Insurance',        type: 'insurer' },
      { name: 'Ensured Platform Operations',  type: 'admin' },
    ];

    const additional: OrganizationCreateInput[] = Array.from({ length: extras }, () => ({
      name: `${faker.company.name()} Capital`,
      type: 'investor_fund' as const,
    }));

    // Idempotent re-seed: the three fixed orgs have stable name+type identities,
    // so re-running the admin "Organization Seeding" action would otherwise append
    // duplicate "Alpha Capital Fund" / "Pinnacle Re Insurance" / etc. rows every
    // time (organizations.name is not unique, so this fails silently rather than
    // erroring). Skip fixed entries that already exist; the random `additional`
    // funds stay additive by design.
    const fixedNames = fixed.map((o) => o.name);
    const existingFixed = await Organization.findAll({ where: { name: fixedNames } });
    const existingNames = new Set(existingFixed.map((o) => `${o.name}::${o.type}`));
    const fixedToCreate = fixed.filter((o) => !existingNames.has(`${o.name}::${o.type}`));

    const created = await Organization.bulkCreate([...fixedToCreate, ...additional], {
      returning: true,
    });

    return [...existingFixed, ...created];
  }
}

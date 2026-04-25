import faker from '@faker-js/faker';
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

    const all = [...fixed, ...additional];
    return Organization.bulkCreate(all, { returning: true });
  }
}

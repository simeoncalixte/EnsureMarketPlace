import { faker } from '@faker-js/faker';
import { User } from '../db/models/identity.models';
import { userRoles } from '../db/models/constants';

export type UserCreateInput = {
  organizationId: number | null;
  email: string;
  passwordHash: string;
  role: (typeof userRoles)[number];
  firstName: string;
  lastName: string;
  isActive?: boolean;
};

/**
 * Describes a seed user entry before creation.
 * organizationName is resolved by the caller to an organizationId.
 */
export type UserSeedDefinition = {
  role: (typeof userRoles)[number];
  /** Symbolic org key used to look up the created org id at seed time */
  orgKey: 'investor_fund_primary' | 'insurer' | 'admin' | `investor_fund_extra_${number}`;
  firstName?: string;
  lastName?: string;
  email?: string;
};

export class UserService {
  async create(data: UserCreateInput): Promise<User> {
    return User.create(data);
  }

  async findById(id: number): Promise<User | null> {
    return User.findByPk(id);
  }

  async findAll(): Promise<User[]> {
    return User.findAll();
  }

  async findByRole(role: (typeof userRoles)[number]): Promise<User[]> {
    return User.findAll({ where: { role } });
  }

  /**
   * Seeds a representative set of Users covering every role:
   *
   *   investor   → 1 fixed + `extraInvestors` random (all under investor_fund orgs)
   *   insurer    → 1 fixed (under the insurer org)
   *   admin      → 1 fixed (under the admin org)
   *   analyst    → 1 fixed (under the admin org — analysts work the platform)
   *
   * @param orgIdMap  A map from symbolic org keys to the database id of
   *                  the corresponding Organization row (supplied by the caller
   *                  after OrganizationService.seed() has returned).
   * @param extraInvestors  Number of additional random investor users (default: 2)
   */
  async seed(
    orgIdMap: Record<string, number>,
    extraInvestors = 2,
  ): Promise<User[]> {
    const fixed: UserCreateInput[] = [
      {
        organizationId: orgIdMap['investor_fund_primary'] ?? null,
        email: 'investor.primary@alpha-capital.com',
        passwordHash: faker.internet.password({ length: 60, memorable: false }),
        role: 'investor',
        firstName: 'Jordan',
        lastName: 'Blake',
        isActive: true,
      },
      {
        organizationId: orgIdMap['insurer'] ?? null,
        email: 'underwriter@pinnacle-re.com',
        passwordHash: faker.internet.password({ length: 60, memorable: false }),
        role: 'insurer',
        firstName: 'Morgan',
        lastName: 'Reyes',
        isActive: true,
      },
      {
        organizationId: orgIdMap['admin'] ?? null,
        email: 'admin@ensured.io',
        passwordHash: faker.internet.password({ length: 60, memorable: false }),
        role: 'admin',
        firstName: 'Alex',
        lastName: 'Torres',
        isActive: true,
      },
      {
        organizationId: orgIdMap['admin'] ?? null,
        email: 'analyst@ensured.io',
        passwordHash: faker.internet.password({ length: 60, memorable: false }),
        role: 'analyst',
        firstName: 'Sam',
        lastName: 'Nguyen',
        isActive: true,
      },
    ];

    const extraInvestorUsers: UserCreateInput[] = Array.from(
      { length: extraInvestors },
      (_, i) => {
        const firstName = faker.person.firstName();
        const lastName  = faker.person.lastName();
        return {
          organizationId: orgIdMap[`investor_fund_extra_${i}`] ?? orgIdMap['investor_fund_primary'] ?? null,
          email: faker.internet.email({ firstName, lastName }).toLowerCase(),
          passwordHash: faker.internet.password({ length: 60, memorable: false }),
          role: 'investor' as const,
          firstName,
          lastName,
          isActive: true,
        };
      },
    );

    const all = [...fixed, ...extraInvestorUsers];
    return User.bulkCreate(all, { returning: true });
  }
}

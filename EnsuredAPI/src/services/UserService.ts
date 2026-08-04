import { faker } from '@faker-js/faker';
import { User, Organization } from '../db/models/identity.models';
import { Department, Team } from '../db/models/department.models';
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
    // Eager-load the organization/department/team so callers (e.g. the admin
    // Users table) can show them by name rather than raw foreign-key ids. Only
    // id + name are selected to keep the payload small.
    return User.findAll({
      include: [
        { model: Organization, as: 'organization', attributes: ['id', 'name'], required: false },
        { model: Department, as: 'department', attributes: ['id', 'name'], required: false },
        { model: Team, as: 'team', attributes: ['id', 'name'], required: false },
      ],
      order: [['id', 'ASC']],
    });
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

    // Idempotent re-seed: `email` is unique, and the fixed users have stable
    // emails, so a plain bulkCreate throws `users_email_key` the second time the
    // admin clicks "User Seeding". Skip rows whose email already exists, insert
    // the rest, and return the full set (pre-existing + newly created) so callers
    // get a stable picture regardless of how many were actually new.
    const emails = all.map((u) => u.email);
    const existing = await User.findAll({ where: { email: emails } });
    const existingEmails = new Set(existing.map((u) => u.email));
    const toCreate = all.filter((u) => !existingEmails.has(u.email));

    const created = toCreate.length
      ? await User.bulkCreate(toCreate, { returning: true })
      : [];

    return [...existing, ...created];
  }
}

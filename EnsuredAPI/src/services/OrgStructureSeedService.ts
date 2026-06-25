import { faker } from '@faker-js/faker';
import { Op } from 'sequelize';
import { Organization, User } from '../db/models/identity.models';
import { Department, Team } from '../db/models/department.models';
import { userRoles } from '../db/models/constants';
import { DepartmentService } from './DepartmentService';
import { UserService } from './UserService';

type UserRole = (typeof userRoles)[number];

/** A team within a department blueprint. */
type TeamBlueprint = { name: string; code: string };

/** A department and the teams nested within it. */
type DepartmentBlueprint = { name: string; code: string; teams: TeamBlueprint[] };

/**
 * A user to create and assign. `team` is optional — a member may sit at the
 * department level with no team. `team`'s department must match `department`
 * (the seeder always picks a team from the same department, so this holds).
 */
type MemberBlueprint = {
  role: UserRole;
  firstName: string;
  lastName: string;
  /** department `code` from the structure blueprint */
  department: string;
  /** team `code` from the structure blueprint, or omitted for department-only */
  team?: string;
};

export type OrgStructureSeedOptions = {
  /** Department/team tree to build. Defaults to {@link DEFAULT_STRUCTURE}. */
  structure?: DepartmentBlueprint[];
  /** Members to create and assign. Defaults to {@link DEFAULT_MEMBERS}. */
  members?: MemberBlueprint[];
  /** Additional random members, each assigned to a random team. Default 3. */
  extraMembers?: number;
  /**
   * After building the structure, sweep already-existing users and fill any
   * missing department/team assignment (and adopt orphan users into the org).
   * Default true.
   */
  backfillExisting?: boolean;
  /**
   * When backfilling, adopt users that have no organization into this one so
   * they receive an org, department, and team too. Default true.
   */
  adoptOrphans?: boolean;
};

export type OrgStructureSeedResult = {
  organizationId: number;
  departments: Department[];
  teams: Team[];
  /** Users newly created by this seed run. */
  members: User[];
  /** Pre-existing users whose org/department/team assignment was filled in. */
  backfilled: User[];
};

/** Thrown when the target organization does not exist; routes map this to 422. */
export class OrgStructureSeedError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'OrgStructureSeedError';
  }
}

/**
 * A representative organizational structure: three departments, each with one or
 * two teams. Mirrors how an insurer is typically organised so the seeded data
 * reads realistically on the org-structure screens.
 */
const DEFAULT_STRUCTURE: DepartmentBlueprint[] = [
  {
    name: 'Underwriting',
    code: 'UW',
    teams: [
      { name: 'Property Underwriting', code: 'UW-PROP' },
      { name: 'Casualty Underwriting', code: 'UW-CAS' },
    ],
  },
  {
    name: 'Claims',
    code: 'CLM',
    teams: [
      { name: 'Claims Intake', code: 'CLM-INT' },
      { name: 'Claims Adjusting', code: 'CLM-ADJ' },
    ],
  },
  {
    name: 'Operations',
    code: 'OPS',
    teams: [{ name: 'Platform Operations', code: 'OPS-PLT' }],
  },
];

/**
 * One member per role so the seed exercises every value of `users.role`, spread
 * across the departments/teams above. The last member sits at the department
 * level with no team to cover that assignment shape.
 */
const DEFAULT_MEMBERS: MemberBlueprint[] = [
  { role: 'insurer', firstName: 'Morgan', lastName: 'Reyes', department: 'UW', team: 'UW-PROP' },
  { role: 'analyst', firstName: 'Sam', lastName: 'Nguyen', department: 'UW', team: 'UW-CAS' },
  { role: 'insurer', firstName: 'Riley', lastName: 'Carter', department: 'CLM', team: 'CLM-ADJ' },
  { role: 'admin', firstName: 'Alex', lastName: 'Torres', department: 'OPS', team: 'OPS-PLT' },
  { role: 'partner', firstName: 'Jamie', lastName: 'Lee', department: 'CLM' },
];

/**
 * Seeds a complete organizational structure for one organization: its
 * departments, the teams within them, and a set of users — each assigned a role
 * and placed into a department (and usually a team).
 *
 * Assignment goes through {@link DepartmentService.assignUser} rather than
 * writing the FK columns directly, so the same invariants the API enforces hold
 * for seeded data too: the department/team must belong to the organization, a
 * team implies its department, and a user holds at most one of each.
 */
export class OrgStructureSeedService {
  constructor(
    private readonly departments = new DepartmentService(),
    private readonly users = new UserService(),
  ) {}

  /**
   * Seed the org structure for **every** organization, so that no matter which
   * org a user belongs to they end up assigned to one of their own org's
   * departments/teams. Each org gets the same structure blueprint (the codes are
   * unique per-org, so this never collides), and each org's users are spread
   * across that org's teams.
   *
   * Cross-org orphan adoption is forced off here: when we visit every org in
   * turn there is no single "home" org to pull org-less users into, so each org
   * only ever assigns the users that already belong to it.
   */
  async seedAll(
    options: Omit<OrgStructureSeedOptions, 'adoptOrphans'> = {},
  ): Promise<OrgStructureSeedResult[]> {
    const orgs = await Organization.findAll({ order: [['id', 'ASC']] });
    if (orgs.length === 0) throw new OrgStructureSeedError('organization_not_found');

    const results: OrgStructureSeedResult[] = [];
    for (const org of orgs) {
      results.push(await this.seed(org.id, { ...options, adoptOrphans: false }));
    }
    return results;
  }

  async seed(
    organizationId: number,
    options: OrgStructureSeedOptions = {},
  ): Promise<OrgStructureSeedResult> {
    const org = await Organization.findByPk(organizationId);
    if (!org) throw new OrgStructureSeedError('organization_not_found');

    const structure = options.structure ?? DEFAULT_STRUCTURE;
    const memberBlueprints = options.members ?? DEFAULT_MEMBERS;
    const extraMembers = options.extraMembers ?? 3;
    const backfillExisting = options.backfillExisting ?? true;
    const adoptOrphans = options.adoptOrphans ?? true;

    // 1. Build departments and their teams, indexed by blueprint code so members
    //    can be wired to them by name. Each lookup is find-or-create on
    //    (organization, code) so re-running the seed — or seeding every
    //    organization in one pass — reuses the existing structure instead of
    //    tripping the unique (organizationId, code) constraint.
    const departmentsByCode = new Map<string, Department>();
    const teamsByCode = new Map<string, Team>();
    const teamsByDepartmentCode = new Map<string, Team[]>();

    for (const deptBp of structure) {
      const dept =
        (await Department.findOne({ where: { organizationId, code: deptBp.code } })) ??
        (await this.departments.createDepartment(organizationId, {
          name: deptBp.name,
          code: deptBp.code,
        }));
      departmentsByCode.set(deptBp.code, dept);
      teamsByDepartmentCode.set(deptBp.code, []);

      for (const teamBp of deptBp.teams) {
        // createTeam validates the department belongs to the org; it returns
        // non-null here because the department exists.
        const team =
          (await Team.findOne({
            where: { organizationId, departmentId: dept.id, code: teamBp.code },
          })) ??
          (await this.departments.createTeam(organizationId, dept.id, {
            name: teamBp.name,
            code: teamBp.code,
          }));
        if (team) {
          teamsByCode.set(teamBp.code, team);
          teamsByDepartmentCode.get(deptBp.code)!.push(team);
        }
      }
    }

    // 2. Create each member with a role, then assign it to its department/team
    //    through the validated assignment path.
    const members: User[] = [];

    for (const m of memberBlueprints) {
      const dept = departmentsByCode.get(m.department);
      if (!dept) continue; // blueprint references a department not in `structure`
      const team = m.team ? teamsByCode.get(m.team) : undefined;
      const assigned = await this.createAndAssign(
        organizationId,
        m.role,
        m.firstName,
        m.lastName,
        seedEmail(organizationId, `${m.firstName}.${m.lastName}`),
        dept.id,
        team?.id ?? null,
      );
      if (assigned) members.push(assigned);
    }

    // 3. Random extras: a random role, dropped into a random team (and thus its
    //    department) so larger seeds populate every team.
    const allTeams = [...teamsByCode.values()];
    for (let i = 0; i < extraMembers && allTeams.length > 0; i++) {
      const team = allTeams[i % allTeams.length];
      const role = userRoles[i % userRoles.length];
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const assigned = await this.createAndAssign(
        organizationId,
        role,
        firstName,
        lastName,
        seedEmail(organizationId, `extra.${i}`),
        team.departmentId,
        team.id,
      );
      if (assigned) members.push(assigned);
    }

    // 4. Backfill: ensure pre-existing users also carry an organization,
    //    department, and team. Users created above are skipped (some are
    //    intentionally department-only) so the backfill only fills real gaps.
    const seededIds = new Set(members.map((m) => m.id));
    const backfilled = backfillExisting
      ? await this.backfillExistingUsers(organizationId, allTeams, adoptOrphans, seededIds)
      : [];

    return {
      organizationId,
      departments: [...departmentsByCode.values()],
      teams: [...teamsByCode.values()],
      members,
      backfilled,
    };
  }

  /**
   * Sweep existing users and give each one an organization, department, and
   * team. A user already fully assigned to this org is left untouched; a user
   * with no organization is adopted into this one (when `adoptOrphans`) before
   * being placed. Their existing `role` is preserved — every user already has a
   * non-null role — so this only fills the org/department/team gaps. Assignment
   * goes through {@link DepartmentService.assignUser} so the org-scoping and
   * team-implies-department invariants are enforced.
   */
  private async backfillExistingUsers(
    organizationId: number,
    teams: Team[],
    adoptOrphans: boolean,
    skipUserIds: Set<number>,
  ): Promise<User[]> {
    if (teams.length === 0) return [];

    const where = adoptOrphans
      ? { [Op.or]: [{ organizationId }, { organizationId: null }] }
      : { organizationId };
    const users = await User.findAll({ where });

    const updated: User[] = [];
    let i = 0;
    for (const user of users) {
      if (skipUserIds.has(user.id)) continue;

      const inOrg = user.organizationId === organizationId;
      if (inOrg && user.departmentId != null && user.teamId != null) continue; // already complete

      // Adopt orphans so the org-scoped assignUser will accept them.
      if (user.organizationId !== organizationId) {
        await user.update({ organizationId });
      }

      // Round-robin across teams so existing users spread evenly; a team carries
      // its department, so this sets both.
      const team = teams[i % teams.length];
      i++;
      const result = await this.departments.assignUser(organizationId, user.id, {
        departmentId: team.departmentId,
        teamId: team.id,
      });
      if (result) updated.push(result);
    }
    return updated;
  }

  /**
   * Create (or reuse) a user with the given role and email, then assign it to a
   * department/team. The email is the stable identity key: it carries the
   * organization id (see {@link seedEmail}) so the same blueprint member in two
   * different organizations gets two distinct, non-colliding addresses, and a
   * re-run of the seed reuses the existing user instead of tripping the global
   * `users.email` unique constraint. Returns the user as updated by the
   * assignment (department/team FKs set).
   */
  private async createAndAssign(
    organizationId: number,
    role: UserRole,
    firstName: string,
    lastName: string,
    email: string,
    departmentId: number,
    teamId: number | null,
  ): Promise<User | null> {
    const user =
      (await User.findOne({ where: { email } })) ??
      (await this.users.create({
        organizationId,
        email,
        passwordHash: faker.internet.password({ length: 60, memorable: false }),
        role,
        firstName,
        lastName,
        isActive: true,
      }));

    // A reused user from a prior run may not carry this organization yet; the
    // org-scoped assignUser requires it before it will place the user.
    if (user.organizationId !== organizationId) {
      await user.update({ organizationId });
    }

    return this.departments.assignUser(organizationId, user.id, { departmentId, teamId });
  }
}

/**
 * Build a deterministic, organization-scoped seed email. Embedding the org id
 * keeps the same blueprint member ("Jamie Lee") unique across organizations,
 * and keeping it deterministic makes the seed idempotent across re-runs.
 */
function seedEmail(organizationId: number, localPart: string): string {
  const slug = localPart.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.');
  return `${slug}.org${organizationId}@seed.ensured.test`;
}

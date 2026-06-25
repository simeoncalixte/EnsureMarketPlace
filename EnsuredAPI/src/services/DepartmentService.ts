import { Department, Team } from '../db/models/department.models';
import { User } from '../db/models/identity.models';

export type DepartmentInput = {
  name: string;
  code?: string | null;
  description?: string | null;
  isActive?: boolean;
  sortOrder?: number;
};

export type TeamInput = DepartmentInput;

/**
 * A user's department/team assignment. Each field is tri-state:
 *   - `undefined` → leave the current value unchanged
 *   - `null`      → clear the assignment
 *   - a number    → assign to that department/team
 */
export type AssignmentInput = {
  departmentId?: number | null;
  teamId?: number | null;
};

/** Thrown for caller-fixable assignment problems; routes map these to HTTP 400. */
export class AssignmentError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'AssignmentError';
  }
}

/** Narrow a raw input value to `number | null | undefined`. */
function coerceId(value: number | null | undefined): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Resolve a tri-state assignment input against the current values and the
 * resolved department of any chosen team. Pure so it can be unit-tested without
 * a database.
 *
 * Rules:
 *   - A team implies its department. If a team is being set and no department is
 *     supplied, the team's department is adopted.
 *   - If both a team and a department are supplied they must agree.
 *   - Clearing the department also clears the team (a team can't outlive its
 *     department on the user).
 */
export function resolveAssignment(
  current: { departmentId: number | null; teamId: number | null },
  input: AssignmentInput,
  teamDepartmentId: number | null,
): { departmentId: number | null; teamId: number | null } {
  const teamId = input.teamId === undefined ? current.teamId : input.teamId;

  let departmentId = input.departmentId === undefined ? current.departmentId : input.departmentId;

  if (teamId !== null && teamDepartmentId !== null) {
    if (input.departmentId === undefined || input.departmentId === null) {
      departmentId = teamDepartmentId;
    } else if (input.departmentId !== teamDepartmentId) {
      throw new AssignmentError('team_department_mismatch');
    }
  }

  if (departmentId === null && teamId !== null) {
    throw new AssignmentError('team_requires_department');
  }

  return { departmentId, teamId };
}

const activeThenName: Array<[string, 'ASC' | 'DESC']> = [
  ['isActive', 'DESC'],
  ['sortOrder', 'ASC'],
  ['name', 'ASC'],
  ['id', 'ASC'],
];

/**
 * Organizational-structure CRUD. Every method is organization-scoped: a row is
 * only visible/mutable when its `organizationId` matches the caller's org, so a
 * department or team from another tenant is never reachable.
 */
export class DepartmentService {
  // ── Departments ──
  async listDepartments(organizationId: number): Promise<Department[]> {
    return Department.findAll({
      where: { organizationId },
      order: activeThenName as any,
      include: [{ model: Team, as: 'teams', separate: true, order: activeThenName as any }],
    });
  }

  async getDepartment(organizationId: number, id: number): Promise<Department | null> {
    return Department.findOne({
      where: { id, organizationId },
      include: [{ model: Team, as: 'teams', separate: true, order: activeThenName as any }],
    });
  }

  async createDepartment(organizationId: number, data: DepartmentInput): Promise<Department> {
    return Department.create({
      organizationId,
      name: data.name,
      code: data.code ?? null,
      description: data.description ?? null,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 100,
    });
  }

  async updateDepartment(
    organizationId: number,
    id: number,
    data: Partial<DepartmentInput>,
  ): Promise<Department | null> {
    const dept = await Department.findOne({ where: { id, organizationId } });
    if (!dept) return null;
    await dept.update(pickEditable(data));
    return dept;
  }

  async deleteDepartment(organizationId: number, id: number): Promise<boolean> {
    const dept = await Department.findOne({ where: { id, organizationId } });
    if (!dept) return false;
    // Detach members so the SET NULL FK contract holds even before the cascade
    // removes the teams. (Team→user FK is also SET NULL.)
    await User.update({ departmentId: null, teamId: null }, { where: { departmentId: id } });
    await dept.destroy(); // teams cascade-delete via FK
    return true;
  }

  // ── Teams (nested under a department) ──
  async listTeams(organizationId: number, departmentId: number): Promise<Team[] | null> {
    const dept = await Department.findOne({ where: { id: departmentId, organizationId } });
    if (!dept) return null;
    return Team.findAll({ where: { departmentId, organizationId }, order: activeThenName as any });
  }

  async createTeam(
    organizationId: number,
    departmentId: number,
    data: TeamInput,
  ): Promise<Team | null> {
    const dept = await Department.findOne({ where: { id: departmentId, organizationId } });
    if (!dept) return null;
    return Team.create({
      departmentId,
      organizationId,
      name: data.name,
      code: data.code ?? null,
      description: data.description ?? null,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 100,
    });
  }

  async updateTeam(
    organizationId: number,
    teamId: number,
    data: Partial<TeamInput>,
  ): Promise<Team | null> {
    const team = await Team.findOne({ where: { id: teamId, organizationId } });
    if (!team) return null;
    await team.update(pickEditable(data));
    return team;
  }

  async deleteTeam(organizationId: number, teamId: number): Promise<boolean> {
    const team = await Team.findOne({ where: { id: teamId, organizationId } });
    if (!team) return false;
    await team.destroy(); // users.teamId SET NULL via FK
    return true;
  }

  // ── Membership ──
  async listMembers(
    organizationId: number,
    filter: { departmentId?: number; teamId?: number } = {},
  ): Promise<User[]> {
    const where: Record<string, unknown> = { organizationId };
    if (filter.departmentId !== undefined) where.departmentId = filter.departmentId;
    if (filter.teamId !== undefined) where.teamId = filter.teamId;
    return User.findAll({ where, order: [['lastName', 'ASC'], ['firstName', 'ASC'], ['id', 'ASC']] });
  }

  /**
   * Assign (or clear) a user's department and team. Returns the updated user, or
   * `null` if the user does not belong to this organization. Throws
   * {@link AssignmentError} for inconsistent/invalid targets.
   */
  async assignUser(
    organizationId: number,
    userId: number,
    input: AssignmentInput,
  ): Promise<User | null> {
    const user = await User.findByPk(userId);
    if (!user || user.organizationId !== organizationId) return null;

    const departmentId = coerceId(input.departmentId);
    const teamId = coerceId(input.teamId);

    // Resolve the chosen team first so its department can be validated/adopted.
    let teamDepartmentId: number | null = null;
    if (teamId !== null && teamId !== undefined) {
      const team = await Team.findOne({ where: { id: teamId, organizationId } });
      if (!team) throw new AssignmentError('team_not_found');
      teamDepartmentId = team.departmentId;
    }

    const next = resolveAssignment(
      { departmentId: user.departmentId ?? null, teamId: user.teamId ?? null },
      { departmentId, teamId },
      teamDepartmentId,
    );

    // The resolved department must belong to this org.
    if (next.departmentId !== null) {
      const dept = await Department.findOne({ where: { id: next.departmentId, organizationId } });
      if (!dept) throw new AssignmentError('department_not_found');
    }

    await user.update({ departmentId: next.departmentId, teamId: next.teamId });
    return user;
  }
}

/**
 * Build an update patch from a raw request body: only the client-editable
 * columns, and only those actually supplied. This both keeps PATCH-style updates
 * from nulling unspecified columns and prevents a client from smuggling
 * `organizationId` / `departmentId` to move a row across tenants.
 */
const EDITABLE_FIELDS = ['name', 'code', 'description', 'isActive', 'sortOrder'] as const;
function pickEditable(data: Partial<DepartmentInput>): Partial<DepartmentInput> {
  const out: Partial<DepartmentInput> = {};
  for (const key of EDITABLE_FIELDS) {
    if (data[key] !== undefined) (out as Record<string, unknown>)[key] = data[key];
  }
  return out;
}

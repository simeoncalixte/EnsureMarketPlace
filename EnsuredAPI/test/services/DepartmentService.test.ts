import { AssignmentError, DepartmentService, resolveAssignment } from '../../src/services/DepartmentService';
import { Organization, User } from '../../src/db/models/identity.models';
import { initTestDb, truncateTables } from '../helpers/db';

describe('DepartmentService', () => {
  let service: DepartmentService;
  let orgId: number;
  let otherOrgId: number;

  beforeAll(async () => {
    await initTestDb();
  });

  beforeEach(async () => {
    service = new DepartmentService();
    await truncateTables('users', 'teams', 'departments', 'organizations');
    const org = await Organization.create({ name: 'Pinnacle Re', type: 'insurer' } as any);
    const other = await Organization.create({ name: 'Other Co', type: 'insurer' } as any);
    orgId = org.id;
    otherOrgId = other.id;
  });

  const makeUser = (overrides: Partial<any> = {}) =>
    User.create({
      organizationId: orgId,
      email: `u${Math.round(Number(String(Date.now()).slice(-6)) + Math.floor(performance.now()))}@x.com`,
      passwordHash: 'x',
      role: 'analyst',
      firstName: 'A',
      lastName: 'B',
      ...overrides,
    } as any);

  describe('departments', () => {
    it('creates and lists org-scoped departments', async () => {
      await service.createDepartment(orgId, { name: 'Underwriting', code: 'UW' });
      await service.createDepartment(otherOrgId, { name: 'Foreign' });

      const list = await service.listDepartments(orgId);
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('Underwriting');
    });

    it('does not return a department from another org', async () => {
      const foreign = await service.createDepartment(otherOrgId, { name: 'Foreign' });
      expect(await service.getDepartment(orgId, foreign.id)).toBeNull();
    });

    it('updates only supplied fields', async () => {
      const dept = await service.createDepartment(orgId, { name: 'UW', description: 'orig' });
      const updated = await service.updateDepartment(orgId, dept.id, { name: 'Underwriting' });
      expect(updated?.name).toBe('Underwriting');
      expect(updated?.description).toBe('orig');
    });

    it('cascades teams and detaches members on delete', async () => {
      const dept = await service.createDepartment(orgId, { name: 'UW' });
      const team = await service.createTeam(orgId, dept.id, { name: 'Property' });
      const user = await makeUser({ departmentId: dept.id, teamId: team!.id });

      expect(await service.deleteDepartment(orgId, dept.id)).toBe(true);
      expect(await service.listTeams(orgId, dept.id)).toBeNull();
      await user.reload();
      expect(user.departmentId).toBeNull();
      expect(user.teamId).toBeNull();
    });
  });

  describe('teams', () => {
    it('rejects creating a team under another org\'s department', async () => {
      const foreign = await service.createDepartment(otherOrgId, { name: 'Foreign' });
      expect(await service.createTeam(orgId, foreign.id, { name: 'X' })).toBeNull();
    });

    it('inherits organizationId from its department', async () => {
      const dept = await service.createDepartment(orgId, { name: 'UW' });
      const team = await service.createTeam(orgId, dept.id, { name: 'Property' });
      expect(team?.organizationId).toBe(orgId);
      expect(team?.departmentId).toBe(dept.id);
    });
  });

  describe('assignUser', () => {
    it('assigns a department and team, adopting the team\'s department', async () => {
      const dept = await service.createDepartment(orgId, { name: 'UW' });
      const team = await service.createTeam(orgId, dept.id, { name: 'Property' });
      const user = await makeUser();

      const updated = await service.assignUser(orgId, user.id, { teamId: team!.id });
      expect(updated?.teamId).toBe(team!.id);
      expect(updated?.departmentId).toBe(dept.id);
    });

    it('returns null for a user in another org', async () => {
      const foreignUser = await User.create({
        organizationId: otherOrgId,
        email: 'foreign@x.com',
        passwordHash: 'x',
        role: 'analyst',
        firstName: 'F',
        lastName: 'G',
      } as any);
      expect(await service.assignUser(orgId, foreignUser.id, { departmentId: null })).toBeNull();
    });

    it('rejects a team whose department disagrees with the explicit department', async () => {
      const deptA = await service.createDepartment(orgId, { name: 'A' });
      const deptB = await service.createDepartment(orgId, { name: 'B' });
      const teamB = await service.createTeam(orgId, deptB.id, { name: 'TeamB' });
      const user = await makeUser();

      await expect(
        service.assignUser(orgId, user.id, { departmentId: deptA.id, teamId: teamB!.id }),
      ).rejects.toBeInstanceOf(AssignmentError);
    });

    it('rejects a team from another org', async () => {
      const foreignDept = await service.createDepartment(otherOrgId, { name: 'F' });
      const foreignTeam = await service.createTeam(otherOrgId, foreignDept.id, { name: 'FT' });
      const user = await makeUser();
      await expect(service.assignUser(orgId, user.id, { teamId: foreignTeam!.id })).rejects.toThrow(
        'team_not_found',
      );
    });

    it('clears the team when the department is cleared', async () => {
      const dept = await service.createDepartment(orgId, { name: 'UW' });
      const team = await service.createTeam(orgId, dept.id, { name: 'Property' });
      const user = await makeUser({ departmentId: dept.id, teamId: team!.id });

      const updated = await service.assignUser(orgId, user.id, { departmentId: null, teamId: null });
      expect(updated?.departmentId).toBeNull();
      expect(updated?.teamId).toBeNull();
    });

    it('lists members scoped to a department', async () => {
      const dept = await service.createDepartment(orgId, { name: 'UW' });
      const inDept = await makeUser({ departmentId: dept.id });
      await makeUser(); // unassigned

      const members = await service.listMembers(orgId, { departmentId: dept.id });
      expect(members.map((m) => m.id)).toEqual([inDept.id]);
    });
  });

  // Pure resolution logic — no DB, exercises the assignment-rule branches directly.
  describe('resolveAssignment (pure)', () => {
    const current = { departmentId: 5, teamId: 9 };

    it('leaves both unchanged when nothing is supplied', () => {
      expect(resolveAssignment(current, {}, null)).toEqual({ departmentId: 5, teamId: 9 });
    });

    it('rejects clearing the department while keeping a team', () => {
      expect(() => resolveAssignment(current, { departmentId: null }, null)).toThrow(
        'team_requires_department',
      );
    });

    it('clears only the team, leaving the department in place', () => {
      expect(resolveAssignment(current, { teamId: null }, null)).toEqual({
        departmentId: 5,
        teamId: null,
      });
    });
  });
});

/**
 * Role-driven work allocation for the `assignment` pipeline stage (pure, no I/O).
 *
 * The assignment stage gives every submission a human owner — a department, a
 * team, and a specific person. WHICH person is chosen is driven by ROLE: each
 * submission/transaction type maps to the staff role that should own that kind of
 * work, and the person is then picked from the roster of users carrying that role
 * (their department + team come along for the ride, since a user belongs to at
 * most one of each — see `department.models.ts`).
 *
 * Keeping the mapping and the person-selection here (separate from the service's
 * DB/LLM wiring) lets the routing rules be unit-tested without a database.
 */

import { userRoles } from '../../db/models/constants';

export type UserRole = (typeof userRoles)[number];

/** Role that owns a submission when no type-specific override applies. */
export const DEFAULT_TARGET_ROLE: UserRole = 'analyst';

/**
 * Which staff ROLE should own a submission, keyed by its transaction type
 * (a `submissionTypeTaxonomy` code). Anything absent falls back to
 * {@link DEFAULT_TARGET_ROLE}. This map is the single place that encodes
 * "who handles what" — assignment is role-driven, everything else flows from it.
 *
 * Most intake is underwriting/analyst work; reinsurance placements (treaty and
 * facultative) are senior-underwriter work, so they route to the `insurer` role.
 */
export const SUBMISSION_TYPE_TARGET_ROLE: Readonly<Record<string, UserRole>> = {
  new_business: 'analyst',
  quote_request: 'analyst',
  renewal: 'analyst',
  endorsement: 'analyst',
  cancellation: 'analyst',
  claim: 'analyst',
  audit: 'analyst',
  inquiry: 'analyst',
  treaty_reinsurance: 'insurer',
  facultative_reinsurance: 'insurer',
};

/** Resolve the staff role that should own a submission of the given type. */
export function targetRoleForSubmissionType(typeCode?: string | null): UserRole {
  const code = String(typeCode ?? '').trim();
  return SUBMISSION_TYPE_TARGET_ROLE[code] ?? DEFAULT_TARGET_ROLE;
}

/**
 * A single assignable person — a user plus the department/team they belong to and
 * their current open-assignment load (used to balance work in the heuristic).
 */
export type AssignmentCandidate = {
  userId: number;
  firstName: string;
  lastName: string;
  role: string;
  departmentId: number | null;
  departmentName: string | null;
  teamId: number | null;
  teamName: string | null;
  /** How many submissions are already assigned to this person (load balancing). */
  openAssignments: number;
};

/** A person's display name from first/last, trimmed and space-joined. */
export function fullName(c: { firstName?: string | null; lastName?: string | null }): string {
  return [c.firstName, c.lastName]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Deterministic, load-balanced person pick: the candidate with the FEWEST open
 * assignments wins, ties broken by lowest `userId` so the choice is stable and
 * unit-testable. Returns null when there are no candidates.
 */
export function chooseAssigneeByLoad(
  candidates: readonly AssignmentCandidate[],
): AssignmentCandidate | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort(
    (a, b) => a.openAssignments - b.openAssignments || a.userId - b.userId,
  )[0];
}

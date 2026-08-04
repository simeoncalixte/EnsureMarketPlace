# `departments` route

Organizational structure API — Departments, the Teams nested within them, and
single-assignment of users to a department/team. All routes are organization-scoped.

## Endpoints

| Method & path | Purpose |
| ------------- | ------- |
| `GET /organizations/:id/departments` | List departments. |
| `POST /organizations/:id/departments` | Create a department. |
| `GET /organizations/:id/departments/:deptId` | Fetch one department. |
| `PUT /organizations/:id/departments/:deptId` | Update a department. |
| `DELETE /organizations/:id/departments/:deptId` | Delete a department. |
| `GET /organizations/:id/departments/:deptId/teams` | List teams in a department. |
| `POST /organizations/:id/departments/:deptId/teams` | Create a team in a department. |
| `PUT /organizations/:id/teams/:teamId` | Update a team. |
| `DELETE /organizations/:id/teams/:teamId` | Delete a team. |
| `GET /organizations/:id/departments/:deptId/members` | List department members. |
| `GET /organizations/:id/teams/:teamId/members` | List team members. |
| `PUT /organizations/:id/users/:userId/assignment` | Assign/clear a user's department/team. |

## Files

| File | Concern |
| ---- | ------- |
| `index.ts` | Fastify plugin wiring + public export (`departmentsRoute`); request-shaping helpers and handlers backed by `DepartmentService`. |

## Related

- `../../services/DepartmentService` — data access + `AssignmentError`.
- Registered in `../../app.ts` as `departmentsRoute` under the `/api` prefix.

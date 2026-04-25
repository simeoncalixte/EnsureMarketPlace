# Organization Resolution (organizationId)

Summary
- The API prefers to operate using `organizationId` as the tenant/organization identifier.
- For backward compatibility the database still stores this value in the existing `tenantId` columns.

How the API determines the organization
- If an incoming request includes an explicit `organizationId` (query parameter or request body), the API will use that value.
- If `organizationId` is not provided, the API will attempt to derive the organization from the caller's Authorization token (JWT). The resolution flow is:
  1. Read `Authorization: Bearer <token>` header.
 2. Verify the JWT using `process.env.JWT_SECRET` (same behavior as `/api/auth/me`).
 3. Extract the user id from the token payload (`userId` or `id`).
 4. Load the user record and use `user.organizationId` as the resolved organization.

Implementation notes
- The helper used by routes is implemented at: [src/lib/org.ts](src/lib/org.ts#L1-L200)
- Routes that expose or accept organization info map `organizationId` to the legacy DB column `tenantId` for compatibility (see [src/routes/ingestionChannels.ts](src/routes/ingestionChannels.ts#L1-L260)).
- Clients that omit `organizationId` can rely on the Authorization token; this is the recommended pattern for scoped access by non-admin users.

Client guidance
- Preferred: do not send `organizationId` from the client; instead include a valid Authorization token (JWT) and let the server scope results to the caller's organization.
- Admins: when acting across organizations, callers may pass `organizationId` explicitly where supported by the route.

Backward compatibility
- Database columns remain named `tenantId` to avoid migrations; API responses include an `organizationId` field (mapped from `tenantId`) so clients can uniformly rely on `organizationId`.

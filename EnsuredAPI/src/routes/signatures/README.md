# `signatures` route

Standalone signature collection-point API. It owns opening signature requests,
collecting/declining signer marks, voiding, and re-verifying proofs for an opaque
`(subjectType, subjectId)` subject. Other domains call this; it calls none of them.

## Endpoints

| Method & path                                      | Purpose                                                   |
| -------------------------------------------------- | --------------------------------------------------------- |
| `POST /signatures`                                 | Open a request + its pending signers.                     |
| `GET /signatures`                                  | List requests for a subject (query: subjectType/subjectId).|
| `GET /signatures/:id`                              | A request with its signers.                               |
| `POST /signatures/:id/signers/:signerId/sign`      | Collect a signer's mark and stamp a tamper-evident proof. |
| `POST /signatures/:id/signers/:signerId/decline`   | Decline to sign.                                          |
| `POST /signatures/:id/void`                        | Void a request (not allowed once completed).              |
| `GET /signatures/:id/verify`                       | Re-derive proofs and report record integrity.             |

## Files

| File          | Concern                                                          |
| ------------- | --------------------------------------------------------------- |
| `index.ts`    | Fastify plugin wiring — maps paths to handlers and is the export. |
| `handlers.ts` | Request handlers delegating to the signature service.           |
| `schemas.ts`  | Fastify JSON schema objects per endpoint.                       |
| `dto.ts`      | `requestDto` / `signatureDto` serialization mappers.            |

## Related

- `../../signature/service` — all signature business logic.
- `../../lib/org` — `resolveOrganizationIdFromRequest`.
- `../../db/models` — `Signature` / `SignatureRequest` types.
- Registered in `../../app.ts` as `signaturesRoute` under the `/api` prefix.

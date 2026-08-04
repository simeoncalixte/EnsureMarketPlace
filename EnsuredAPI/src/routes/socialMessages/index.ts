/**
 * Direct messaging — conversations, messages, submission/file shares (which
 * grant auditable read access) and the read-only shared-submission view. See
 * ./README.md for the concern map.
 */
export { socialMessagesRoutes } from './handlers';
export { canAccessSubmission } from './service';

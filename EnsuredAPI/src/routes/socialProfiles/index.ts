/**
 * Public-facing professional identity. Deliberately cross-tenant: the social
 * network exists to connect insurers, reinsurers and brokers ACROSS
 * organizations, so the directory and profiles skip tenant scoping. Anything
 * that touches submissions stays tenant-scoped elsewhere. See ./README.md for
 * the concern map.
 */
export { socialProfilesRoutes } from './handlers';
export { profileSummariesFor } from './service';
export type { ProfileSummary } from './types';

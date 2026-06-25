// Barrel for the consolidated API layer. Each module groups every request for
// one `/api/*` path prefix, so a reviewer can open a single file and see what
// requests a feature makes at a glance. Namespaced to avoid name collisions
// (e.g. several modules export a `getChannel`-style verb).
export * as client from './client';
export * as authApi from './auth';
export * as navigationApi from './navigation';
export * as usersApi from './users';
export * as adminApi from './admin';
export * as organizationsApi from './organizations';
export * as ingestionChannelsApi from './ingestionChannels';
export * as marketplaceApi from './marketplace';
export * as analyticsApi from './analytics';
export * as underwritingApi from './underwriting';
export * as investorsApi from './investors';
export * as crestaZonesApi from './crestaZones';
export * as pipelineApi from './pipeline';
export * as seedApi from './seed';
export * as registrationApi from './registration';
export * as socialApi from './social';
export * as socialMessagesApi from './socialMessages';

import { Connection } from '../../src/db/models/social.models';
import { pairStatusFor } from '../../src/social/graph';
import { buildNavigationForRole, collectNavPaths } from '../../src/navigation/catalog';

describe('pairStatusFor', () => {
  const conn = (requesterId: number, addresseeId: number, status: string) =>
    ({ requesterId, addresseeId, status } as unknown as Connection);

  it('returns none when there is no connection row', () => {
    expect(pairStatusFor(1, null)).toBe('none');
  });

  it('treats a declined pair as none so it can be re-requested', () => {
    expect(pairStatusFor(1, conn(1, 2, 'declined'))).toBe('none');
  });

  it('returns connected for accepted pairs regardless of direction', () => {
    expect(pairStatusFor(1, conn(1, 2, 'accepted'))).toBe('connected');
    expect(pairStatusFor(2, conn(1, 2, 'accepted'))).toBe('connected');
  });

  it('distinguishes outgoing vs incoming pending requests', () => {
    expect(pairStatusFor(1, conn(1, 2, 'pending'))).toBe('pending_outgoing');
    expect(pairStatusFor(2, conn(1, 2, 'pending'))).toBe('pending_incoming');
  });

  it('surfaces blocked pairs', () => {
    expect(pairStatusFor(1, conn(1, 2, 'blocked'))).toBe('blocked');
  });
});

describe('navigation catalog social entries', () => {
  it.each(['insurer', 'investor', 'analyst', 'admin'])('exposes the social network to the %s role', (role) => {
    const paths = collectNavPaths(buildNavigationForRole(role));
    expect(paths).toEqual(expect.arrayContaining(['/network', '/feed', '/messages']));
  });
});

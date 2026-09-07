import { getVideoProviderByName } from '../../../src/services/video-providers/index.js';

describe('getVideoProviderByName', () => {
  it('resolves each known VideoProviderName to the matching provider', () => {
    expect(getVideoProviderByName('local')?.name).toBe('local');
    expect(getVideoProviderByName('ministry-placeholder')?.name).toBe('ministry-placeholder');
    expect(getVideoProviderByName('external-link')?.name).toBe('external-link');
  });

  it('returns null for a row that predates the V2 migration (providerName still null)', () => {
    expect(getVideoProviderByName(null)).toBeNull();
  });

  it('returns null for an unrecognized value rather than guessing', () => {
    expect(getVideoProviderByName('peertube')).toBeNull();
    expect(getVideoProviderByName('')).toBeNull();
  });
});

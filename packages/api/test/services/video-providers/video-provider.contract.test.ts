import { existsSync } from 'node:fs';
import path from 'node:path';
import type { StoreVideoInput, VideoProvider } from '../../../src/services/video-provider.js';
import {
  createLocalVideoProvider,
  resolveUploadDir,
} from '../../../src/services/video-providers/local.js';
import { createMinistryPlaceholderVideoProvider } from '../../../src/services/video-providers/ministry-placeholder.js';

const uploadInput: StoreVideoInput = {
  kind: 'upload',
  buffer: Buffer.concat([Buffer.alloc(4), Buffer.from('ftyp'), Buffer.from('isom')]),
  contentType: 'video/mp4',
};

type ProviderCase = {
  name: string;
  create: () => VideoProvider;
  expectedStatus: 'ready' | 'unavailable';
};

const providers: ProviderCase[] = [
  {
    name: 'local',
    create: createLocalVideoProvider,
    expectedStatus: 'ready',
  },
  {
    name: 'ministry-placeholder',
    create: createMinistryPlaceholderVideoProvider,
    expectedStatus: 'unavailable',
  },
];

describe.each(providers)('VideoProvider contract — $name', ({ create, expectedStatus }) => {
  let provider: VideoProvider;
  let ref: string;

  beforeEach(() => {
    provider = create();
  });

  afterEach(async () => {
    if (ref) await provider.delete(ref);
  });

  it('stores an upload and returns an opaque reference', async () => {
    ref = await provider.store(uploadInput);

    expect(typeof ref).toBe('string');
    expect(ref.length).toBeGreaterThan(0);
    expect(ref).not.toContain(path.resolve('.'));
  });

  it('reports the provider state through status()', async () => {
    ref = await provider.store(uploadInput);

    await expect(provider.status(ref)).resolves.toBe(expectedStatus);
  });

  it('only exposes playback when the provider reports ready', async () => {
    ref = await provider.store(uploadInput);
    const status = await provider.status(ref);

    if (status === 'ready') {
      await expect(provider.playbackUrl(ref)).resolves.toBeTruthy();
    } else {
      await expect(provider.playbackUrl(ref)).rejects.toThrow();
    }
  });

  it('supports deletion without making the provider contract depend on its storage mechanism', async () => {
    ref = await provider.store(uploadInput);

    await expect(provider.delete(ref)).resolves.toBeUndefined();

    if (provider.name === 'local') {
      const absolutePath = path.join(resolveUploadDir(), path.basename(ref));
      expect(existsSync(absolutePath)).toBe(false);
    }

    ref = '';
  });
});

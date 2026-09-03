import request from 'supertest';
import { createApp } from '../app.js';
import { SWAGGER_ASSETS } from './docs.js';

const app = createApp();

/** Every `href`/`src` the served page carries, in document order. */
const referencedAssets = (html: string): string[] =>
  [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1] as string);

describe('GET /api/docs', () => {
  it('redirects the bare path so relative asset URLs resolve', async () => {
    const response = await request(app).get('/api/docs');

    expect(response.status).toBe(301);
    expect(response.headers.location).toBe('/api/docs/');
  });

  it('serves the Swagger UI page', async () => {
    const response = await request(app).get('/api/docs/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('id="swagger-ui"');
  });

  // §8.3: the app must run on a machine that clones the repo and nothing more,
  // so the documentation may not reach for a CDN either.
  it('references no external origin', async () => {
    const response = await request(app).get('/api/docs/');

    for (const asset of referencedAssets(response.text)) {
      expect(asset).toMatch(/^\.\//);
    }
  });

  it('serves every asset the page references', async () => {
    const page = await request(app).get('/api/docs/');

    for (const asset of referencedAssets(page.text)) {
      const response = await request(app).get(`/api/docs/${asset.replace('./', '')}`);

      expect([asset, response.status]).toEqual([asset, 200]);
    }
  });

  it('turns off the bundle`s call out to validator.swagger.io', async () => {
    const response = await request(app).get('/api/docs/swagger-initializer.js');

    expect(response.status).toBe(200);
    expect(response.text).toContain('validatorUrl: null');
  });

  it('serves the contract itself', async () => {
    const response = await request(app).get('/api/docs/openapi.yaml');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/yaml/);
    expect(response.text).toContain('title: ProfilsActifs API');
  });

  it.each([['package.json'], ['README.md'], ['swagger-ui.css.map']])(
    'does not serve %s from the swagger-ui package directory',
    async (asset) => {
      const response = await request(app).get(`/api/docs/${asset}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({ error: 'not_found', statusCode: 404 });
    },
  );

  it('only ever exposes the assets the page declares', () => {
    expect(SWAGGER_ASSETS).toEqual([
      'swagger-ui.css',
      'index.css',
      'swagger-ui-bundle.js',
      'favicon-32x32.png',
      'favicon-16x16.png',
    ]);
  });
});

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router, type NextFunction, type Request, type Response } from 'express';

/**
 * Swagger UI over the repo's own `openapi.yaml`, served entirely from disk.
 *
 * Nothing here reaches the network: the assets come from the installed
 * `swagger-ui-dist` package rather than a CDN, and Swagger UI's online
 * validator badge is switched off below. The brief's sovereignty constraint
 * (§8.3 — the application must run on any machine that clones the repo, with
 * no third-party account and no external dependency) covers the documentation
 * just as much as the API it documents.
 */

const require = createRequire(import.meta.url);

// swagger-ui-dist declares no `exports` map, so its package.json resolves and
// hands us the directory holding the pre-built assets. Same trick as
// scripts/tsc-native.js uses for typescript-native.
const ASSET_DIR = path.dirname(require.resolve('swagger-ui-dist/package.json'));

// The contract sits at the package root — two levels up from this module in
// both the `src/` (tsx) and the `dist/` (built) layout.
const OPENAPI_PATH = fileURLToPath(new URL('../../openapi.yaml', import.meta.url));

const SPEC_FILENAME = 'openapi.yaml';
const INITIALIZER_FILENAME = 'swagger-initializer.js';

// One source of truth for what the page pulls: the HTML below is generated
// from these lists and they double as the allowlist of files this router will
// serve, so the two can never drift apart. Everything else in the package
// directory — its README, licences, source maps — stays unreachable.
const STYLESHEETS = ['swagger-ui.css', 'index.css'] as const;
const SCRIPTS = ['swagger-ui-bundle.js'] as const;
const ICONS = [
  { file: 'favicon-32x32.png', size: '32x32' },
  { file: 'favicon-16x16.png', size: '16x16' },
] as const;

export const SWAGGER_ASSETS: readonly string[] = [
  ...STYLESHEETS,
  ...SCRIPTS,
  ...ICONS.map((icon) => icon.file),
];

// A separate file rather than an inline <script>, because helmet's default CSP
// sends `script-src 'self'` and would block an inline one.
const INITIALIZER_JS = `window.onload = function () {
  window.ui = SwaggerUIBundle({
    url: './${SPEC_FILENAME}',
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [SwaggerUIBundle.presets.apis],
    layout: 'BaseLayout',
    // Swagger UI otherwise posts the spec's URL to validator.swagger.io to
    // render its validity badge. That is the one outbound call the bundle
    // makes on its own, and §8.3 does not allow it.
    validatorUrl: null,
  });
};
`;

const INDEX_HTML = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ProfilsActifs — Contrat d'API</title>
${ICONS.map(
  (icon) => `    <link rel="icon" type="image/png" sizes="${icon.size}" href="./${icon.file}" />`,
).join('\n')}
${STYLESHEETS.map((sheet) => `    <link rel="stylesheet" href="./${sheet}" />`).join('\n')}
  </head>
  <body>
    <div id="swagger-ui"></div>
${SCRIPTS.map((script) => `    <script src="./${script}"></script>`).join('\n')}
    <script src="./${INITIALIZER_FILENAME}"></script>
  </body>
</html>
`;

export const docsRouter = Router();

docsRouter.get('/', (req: Request, res: Response): void => {
  // Every asset is referenced relatively, and those only resolve under a
  // trailing slash — so /api/docs redirects rather than serving a page whose
  // stylesheet and bundle would 404.
  if (!req.originalUrl.startsWith(`${req.baseUrl}/`)) {
    res.redirect(301, `${req.baseUrl}/`);
    return;
  }

  res.type('html').send(INDEX_HTML);
});

docsRouter.get(`/${INITIALIZER_FILENAME}`, (_req: Request, res: Response): void => {
  res.type('js').send(INITIALIZER_JS);
});

/**
 * `sendFile` reports a missing or unreadable file through its callback rather
 * than by throwing, so without one the request hangs until the client gives
 * up. Forwarding to `next` turns it into the uniform error shape instead —
 * and only when nothing has been written yet, since a failure part-way through
 * a stream cannot be answered with a status line any more.
 */
const forwardSendFileError =
  (res: Response, next: NextFunction, what: string) =>
  (error?: Error): void => {
    if (!error) return;

    console.error(`[api] could not serve ${what}`, error);
    if (!res.headersSent) next(error);
  };

/** The contract itself, so a client generator can consume it straight from a
 *  running instance instead of needing a checkout. */
docsRouter.get(`/${SPEC_FILENAME}`, (_req: Request, res: Response, next: NextFunction): void => {
  res
    .type('application/yaml')
    .sendFile(OPENAPI_PATH, forwardSendFileError(res, next, SPEC_FILENAME));
});

// One literal route per allowed file, rather than a `:asset` parameter reading
// off the request: no part of a request path ever reaches the filesystem, so
// there is no traversal to defend against in the first place. Anything else
// under /api/docs falls through to the app's notFoundHandler and comes back in
// the uniform error shape.
const ASSET_MAX_AGE = '1h';

for (const asset of SWAGGER_ASSETS) {
  const absolutePath = path.join(ASSET_DIR, asset);

  docsRouter.get(`/${asset}`, (_req: Request, res: Response, next: NextFunction): void => {
    res.sendFile(absolutePath, { maxAge: ASSET_MAX_AGE }, forwardSendFileError(res, next, asset));
  });
}

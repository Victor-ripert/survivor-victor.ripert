/**
 * Reusable browser bootstrap for screen-capture proofs (VI-4, and later
 * VI-6/VI-7, which need the same thing: a real rendered page, not a jsdom
 * approximation). Points `puppeteer-core` at the system's already-installed
 * Chrome instead of the full `puppeteer` package, which would otherwise pull
 * down its own multi-hundred-MB browser build — §8.3 already rules out
 * fetching things from outside the machine that don't need to be.
 *
 * Any proof script that needs a browser imports `ouvrirNavigateur` and
 * `seConnecter` from here rather than re-deriving Chrome's path or the
 * login form's selectors a second time.
 */
import { existsSync } from 'node:fs';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';

const CHEMINS_CHROME_CANDIDATS = [
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

const cheminChrome = (): string => {
  const trouve = CHEMINS_CHROME_CANDIDATS.find((chemin) => existsSync(chemin));
  if (!trouve) {
    throw new Error(
      `aucun Chrome/Chromium trouvé parmi : ${CHEMINS_CHROME_CANDIDATS.join(', ')} — ` +
        'installez-en un, ou pointez EXECUTABLE_CHROME dessus.',
    );
  }
  return trouve;
};

export interface NavigateurOuvert {
  browser: Browser;
  page: Page;
}

/** Launches a headless Chrome sized like a real desktop viewport, so
 *  screenshots read the same way a reviewer's own browser would show them. */
export const ouvrirNavigateur = async (): Promise<NavigateurOuvert> => {
  const browser = await puppeteer.launch({
    executablePath: process.env.EXECUTABLE_CHROME ?? cheminChrome(),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  return { browser, page };
};

/** Drives the real login form at `/connexion` — not a token injected
 *  straight into storage — so the proof exercises the same path a candidate
 *  actually takes. Resolves once the app has navigated away from
 *  `/connexion`, i.e. once `login` has actually succeeded. */
export const seConnecter = async (
  page: Page,
  webUrl: string,
  email: string,
  motDePasse: string,
): Promise<void> => {
  await page.goto(`${webUrl}/connexion`, { waitUntil: 'networkidle0' });
  await page.type('#email', email);
  await page.type('#password', motDePasse);
  await Promise.all([
    page.waitForFunction(() => !window.location.pathname.startsWith('/connexion')),
    page.click('button[type="submit"]'),
  ]);
};

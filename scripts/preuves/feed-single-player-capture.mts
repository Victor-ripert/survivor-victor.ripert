/**
 * VI-5 — captures proof that the public feed keeps a single active video
 * player: activating one card's video never starts a second one (brief
 * §8.6, enforced by the single `activeVideoId` in FeedPage.tsx).
 *
 *   npm run dev -w @profils-actifs/api     # API on :3000
 *   npm run dev -w @profils-actifs/web     # web on :5173
 *   npm run db:seed
 *   npx tsx scripts/preuves/feed-single-player-capture.mts
 *
 * The feed is public, so unlike VI-4 this never logs in. It picks the first
 * two feed cards that actually carry a video (not assumed to be cards 1 and
 * 2 — a reseed could reorder or drop one), activates the first one, and
 * checks the second is still a poster before screenshotting both together.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { creerJournal } from './lib/journal-preuve.js';
import { ouvrirNavigateur } from './lib/navigateur.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const RACINE = join(HERE, '../..');

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';

const CHEMIN_PNG = join(RACINE, 'docs/preuves/VI-5-feed-un-seul-lecteur-actif.png');
const CHEMIN_TXT = join(RACINE, 'docs/preuves/VI-5-feed-un-seul-lecteur-actif.txt');

const CARTE_AVEC_VIDEO = '.video-poster, .video-frame';

const main = async (): Promise<void> => {
  const journal = creerJournal(RACINE);
  journal.entete('VI-5 — flux public, un seul lecteur vidéo actif (§8.6)', { web: WEB_URL });

  const { browser, page } = await ouvrirNavigateur();

  try {
    await page.goto(`${WEB_URL}/`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.feed-grid');

    const indicesAvecVideo = await page.$$eval(
      '.feed-grid > .feed-card',
      (cartes, selecteur) =>
        cartes
          .map((carte, index) => (carte.querySelector(selecteur) ? index + 1 : null))
          .filter((index): index is number => index !== null),
      CARTE_AVEC_VIDEO,
    );

    if (indicesAvecVideo.length < 2) {
      throw new Error(
        `moins de deux profils avec vidéo dans le flux (trouvé : ${indicesAvecVideo.length}) — ` +
          'lancez npm run db:seed.',
      );
    }

    const [indexA, indexB] = indicesAvecVideo;
    const selecteurA = `.feed-grid > .feed-card:nth-child(${indexA})`;
    const selecteurB = `.feed-grid > .feed-card:nth-child(${indexB})`;

    journal.ligne(
      `deux premières cartes avec vidéo dans le flux : positions ${indexA} et ${indexB}`,
    );

    await page.click(`${selecteurA} .video-poster`);
    const iframeA = await page.waitForSelector(`${selecteurA} .video-frame`);
    if (!iframeA) throw new Error('la carte A n’a jamais reçu son iframe après le clic');

    // `.video-frame` existant dans le DOM ne dit encore rien du contenu de
    // l'iframe elle-même : on attend que son propre document ait chargé
    // (contentFrame), puis on laisse une marge au chrome du lecteur YouTube
    // pour se peindre — sans quoi la capture montre un rectangle noir plutôt
    // que le lecteur (déjà rencontré en VI-4, ici rendu plus robuste qu'un
    // simple délai fixe après l'apparition de la balise).
    const cadreVideo = await iframeA.contentFrame();
    if (cadreVideo) {
      await cadreVideo.waitForSelector('body', { timeout: 5000 }).catch(() => undefined);
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const aJoueDesLIframe = (await page.$(`${selecteurA} .video-frame`)) !== null;
    const bEstResteeUneVignette = (await page.$(`${selecteurB} .video-poster`)) !== null;
    const bADemarre = (await page.$(`${selecteurB} .video-frame`)) !== null;

    journal.ligne(`carte A (activée) : iframe chargée = ${aJoueDesLIframe}`);
    journal.ligne(`carte B (jamais cliquée) : reste une vignette = ${bEstResteeUneVignette}`);
    journal.ligne(`carte B (jamais cliquée) : a démarré un lecteur = ${bADemarre}`);
    journal.ligne(
      `un seul lecteur actif à la fois : ${
        aJoueDesLIframe && bEstResteeUneVignette && !bADemarre ? 'oui' : 'NON'
      }`,
    );

    const boiteA = await (await page.$(selecteurA))?.boundingBox();
    const boiteB = await (await page.$(selecteurB))?.boundingBox();
    if (!boiteA || !boiteB)
      throw new Error('impossible de mesurer les deux cartes pour le cadrage');

    const x = Math.min(boiteA.x, boiteB.x);
    const y = Math.min(boiteA.y, boiteB.y);
    const clip = {
      x,
      y,
      width: Math.max(boiteA.x + boiteA.width, boiteB.x + boiteB.width) - x,
      height: Math.max(boiteA.y + boiteA.height, boiteB.y + boiteB.height) - y,
    };

    await page.screenshot({ path: CHEMIN_PNG as `${string}.png`, clip });
    journal.ligne(`capture d’écran (cartes A + B) : ${CHEMIN_PNG}`);
  } finally {
    await browser.close();
  }

  journal.ligne('');
  journal.ligne(`fin — ${new Date().toISOString()}`);
  journal.ecrire(CHEMIN_TXT);

  console.log(`Capture écrite dans ${CHEMIN_PNG}`);
  console.log(`Journal écrit dans ${CHEMIN_TXT}`);
};

await main();

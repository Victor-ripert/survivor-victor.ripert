/**
 * VI-4 — drives the real "add a video" flow in a headless browser and
 * captures proof that the embed renders inline: no page navigation between
 * submitting the form and seeing the player, exactly as brief §8.6 and
 * VideoPlayer.tsx's click-to-load contract require.
 *
 *   npm run dev -w @profils-actifs/api     # API on :3000
 *   npm run dev -w @profils-actifs/web     # web on :5173
 *   npm run db:seed
 *   npx tsx scripts/preuves/video-embed-capture.mts
 *
 * Adds a video through the real form (not a direct API call — the point is
 * to prove the UI, not the endpoint, which VI-2/VI-4's curl proofs already
 * cover), captures a screenshot once its embed is loaded, then deletes it
 * again through the same UI so the demo profile is left exactly as found.
 * Browser bootstrap and login are shared with any other screen-capture proof
 * via scripts/preuves/lib/navigateur.ts.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ouvrirNavigateur, seConnecter } from './lib/navigateur.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const RACINE = join(HERE, '../..');

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';
const COMPTE_CANDIDAT = process.env.COMPTE_CANDIDAT ?? 'amina.berthier@example.fr';
const MOT_DE_PASSE = process.env.MOT_DE_PASSE ?? 'Password123!';

const TITRE_VIDEO_PREUVE = 'Preuve VI-4 — capture d’écran';
const URL_VIDEO_PREUVE = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';

const CHEMIN_PNG = join(RACINE, 'docs/preuves/VI-4-ajout-video-embed.png');
const CHEMIN_TXT = join(RACINE, 'docs/preuves/VI-4-ajout-video-embed.txt');

const git = (args: string[]): string =>
  execFileSync('git', ['-C', RACINE, ...args], { encoding: 'utf8' }).trim();

const lignes: string[] = [];
const journal = (ligne: string): void => {
  lignes.push(ligne);
};

const attendreLigne = async (
  attente: () => Promise<boolean>,
  description: string,
  delaiMs = 5000,
): Promise<void> => {
  const echeance = Date.now() + delaiMs;
  while (Date.now() < echeance) {
    if (await attente()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`délai dépassé en attendant : ${description}`);
};

const main = async (): Promise<void> => {
  mkdirSync(dirname(CHEMIN_PNG), { recursive: true });

  journal('VI-4 — ajout d’une vidéo, rendu de l’embed sans navigation (§4.2, §8.6)');
  journal('ProfilsActifs — JEB/DNI/2026-003');
  journal('');
  journal(`date        : ${new Date().toISOString()}`);
  journal(`commit      : ${git(['rev-parse', 'HEAD'])}`);
  journal(`branche     : ${git(['rev-parse', '--abbrev-ref', 'HEAD'])}`);
  journal(`web         : ${WEB_URL}`);
  journal(`compte      : ${COMPTE_CANDIDAT} (compte de démonstration issu du seed)`);
  journal('');

  const { browser, page } = await ouvrirNavigateur();

  try {
    await seConnecter(page, WEB_URL, COMPTE_CANDIDAT, MOT_DE_PASSE);
    journal(`connexion réussie, redirigé vers : ${page.url()}`);

    await page.goto(`${WEB_URL}/mon-profil`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('form[aria-labelledby="add-video-title"]');

    const nombreAvant = await page.$$eval('.video-list > .video-row', (rows) => rows.length);
    const urlAvant = page.url();
    journal(`vidéos avant ajout : ${nombreAvant}`);
    journal(`URL avant soumission du formulaire : ${urlAvant}`);

    await page.type('form[aria-labelledby="add-video-title"] #video-title', TITRE_VIDEO_PREUVE);
    await page.type('form[aria-labelledby="add-video-title"] #video-url', URL_VIDEO_PREUVE);
    await page.click('form[aria-labelledby="add-video-title"] input[type="checkbox"]');
    await page.click('form[aria-labelledby="add-video-title"] button[type="submit"]');

    await attendreLigne(
      async () =>
        (await page.$$eval('.video-list > .video-row', (rows) => rows.length)) === nombreAvant + 1,
      'la nouvelle carte vidéo apparaît dans la liste',
    );

    const nombreApres = nombreAvant + 1;
    const rangeeSelecteur = `.video-list > .video-row:nth-child(${nombreApres})`;

    const titreAjoute = await page.$eval(
      `${rangeeSelecteur} .video-row__title`,
      (el) => el.textContent,
    );
    journal(`carte ajoutée, titre affiché : "${titreAjoute}"`);

    await page.click(`${rangeeSelecteur} .video-poster`);
    await attendreLigne(
      async () => (await page.$(`${rangeeSelecteur} .video-frame`)) !== null,
      'l’iframe se charge dans la carte (clic sur la vignette)',
    );

    // La balise <iframe> existe dès l'insertion dans le DOM, mais son
    // contenu (chrome du lecteur YouTube) met encore un instant à
    // s'afficher réellement — sans cette marge la capture montre un
    // rectangle noir plutôt que le lecteur.
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const urlApres = page.url();
    journal(`URL après chargement de l’embed         : ${urlApres}`);
    journal(`aucune navigation : ${urlAvant === urlApres ? 'oui' : 'NON — les URLs diffèrent'}`);

    await page.waitForSelector('section[aria-labelledby="videos-title"]');
    const section = await page.$('section[aria-labelledby="videos-title"]');
    if (!section) throw new Error('section vidéos introuvable pour la capture');
    await section.screenshot({ path: CHEMIN_PNG as `${string}.png` });
    journal(`capture d’écran : ${CHEMIN_PNG}`);

    // Nettoyage : on retire la vidéo de preuve par l’UI elle-même (Supprimer
    // puis Confirmer), pour ne pas laisser le profil de démonstration modifié.
    await page.click(`${rangeeSelecteur} button.button--danger`);
    await attendreLigne(
      async () =>
        (await page.$eval(`${rangeeSelecteur} button.button--danger`, (el) => el.textContent)) ===
        'Confirmer la suppression',
      'le bouton bascule en confirmation de suppression',
    );
    await page.click(`${rangeeSelecteur} button.button--danger`);
    await attendreLigne(
      async () =>
        (await page.$$eval('.video-list > .video-row', (rows) => rows.length)) === nombreAvant,
      'la vidéo de preuve est retirée, retour au nombre initial',
    );
    journal(`nettoyage : vidéo de preuve supprimée par l’UI, retour à ${nombreAvant} vidéo(s)`);
  } finally {
    await browser.close();
  }

  journal('');
  journal(`fin — ${new Date().toISOString()}`);

  writeFileSync(CHEMIN_TXT, `${lignes.join('\n')}\n`);
  console.log(`Capture écrite dans ${CHEMIN_PNG}`);
  console.log(`Journal écrit dans ${CHEMIN_TXT}`);
};

await main();

/**
 * V6 — post-migration regression check on the control/témoin profile chosen
 * in V5 (`docs/decisions/03-profil-temoin-migration-video.md`): Bastien
 * Colin, `bastien.colin@example.fr`, one `EXTERNAL_LINK` video.
 *
 * Three things, in the order the issue asks for:
 *
 *   1. The profile page still renders and the video still displays.
 *   2. The profile is still editable (ProfileForm round-trips a real save).
 *   3. The video is still deletable — through the real UI, exercising V4's
 *      path end-to-end: `deleteVideo` resolving the provider from this row's
 *      own `providerName` (backfilled by V3), not the fallback. Checked
 *      directly against the database before the click, so this run proves
 *      the backfilled path specifically, not just "deletion still works".
 *
 *   docker compose up -d
 *   npm run db:migrate && npm run db:seed
 *   npm run db:migrate-video-providers -w @profils-actifs/db
 *   npm run dev -w @profils-actifs/api     # API on :3000
 *   npm run dev -w @profils-actifs/web     # web on :5173
 *   npx tsx scripts/preuves/regression-migration-video.mts
 *
 * Step 3 deletes the témoin's only video, which is the point of proving it's
 * still deletable. `npm run db:seed` puts it back, followed by
 * `npm run db:migrate-video-providers -w @profils-actifs/db` again — the
 * same two-step restore documented in docs/legal/video-consent-revocation.md
 * for the same reason (seed writes Video rows directly, bypassing the
 * providerRef/providerName write path).
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HTTPResponse, Page } from 'puppeteer-core';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { loadRepoEnv } from '@profils-actifs/shared/node';
import { attendreQue, creerJournal, type Journal } from './lib/journal-preuve.js';
import { ouvrirNavigateur, seConnecter } from './lib/navigateur.js';

loadRepoEnv();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const HERE = dirname(fileURLToPath(import.meta.url));
const RACINE = join(HERE, '../..');

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';
const COMPTE_TEMOIN = process.env.COMPTE_TEMOIN ?? 'bastien.colin@example.fr';
const MOT_DE_PASSE = process.env.MOT_DE_PASSE ?? 'Password123!';

const DOSSIER_CAPTURES = join(RACINE, 'docs/preuves/V6-regression-temoin-post-migration');
const CHEMIN_TXT = join(RACINE, 'docs/preuves/V6-regression-temoin-post-migration.txt');

const MARQUEUR_PREUVE = ' — vérifié V6';

let compteurCapture = 0;

/** Screenshots `selecteur`, or the whole viewport if omitted. The videos
 *  section sits below the fold on `/mon-profil` — a full-page capture there
 *  would show the "Informations" panel and nothing of the video the step is
 *  actually about, so the two steps that are specifically about the video
 *  scope to it explicitly rather than trusting whatever happens to be in
 *  view. */
const capturer = async (page: Page, nom: string, selecteur?: string): Promise<void> => {
  compteurCapture += 1;
  const chemin = join(DOSSIER_CAPTURES, `${String(compteurCapture).padStart(2, '0')}-${nom}.png`);
  const cible = selecteur ? await page.$(selecteur) : null;
  if (selecteur && !cible) throw new Error(`élément introuvable pour la capture : ${selecteur}`);
  await (cible ?? page).screenshot({ path: chemin as `${string}.png` });
};

interface VideoTemoin {
  id: string;
  title: string;
  providerName: string | null;
  providerRef: string | null;
  profileId: string;
}

/** Reads the témoin's video row from the database directly — not through the
 *  API, which doesn't expose providerName/providerRef (they're internal
 *  bookkeeping, see the note on Video.providerName in schema.prisma). This
 *  is the one fact this script needs that no HTTP response can supply. */
const videoTemoin = async (email: string): Promise<VideoTemoin> => {
  const utilisateur = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: { profile: { select: { id: true, videos: true } } },
  });
  const video = utilisateur.profile?.videos[0];
  if (!video || !utilisateur.profile) {
    throw new Error(`${email} n'a pas de vidéo — lancez npm run db:seed.`);
  }
  return {
    id: video.id,
    title: video.title,
    providerName: video.providerName,
    providerRef: video.providerRef,
    profileId: utilisateur.profile.id,
  };
};

/**
 * 1. La fiche s'affiche et la vidéo s'y affiche — sur la fiche **publique**
 * (`/profils/{id}`), pas seulement `/mon-profil` : le seed fait porter à
 * chaque vidéo le `moderationStatus` du profil (`seed.ts`, `seedApplicants`),
 * et le témoin est `APPROVED`, donc sa vidéo l'est aussi et s'affiche
 * réellement en public — vérifié ci-dessous plutôt que supposé. C'est la
 * fiche que Thomas/Florine et un recruteur voient, donc la vérification la
 * plus proche de « le produit fonctionne encore » pour ce bullet.
 */
const demontrerRenduEtVideo = async (
  page: Page,
  journal: Journal,
  video: VideoTemoin,
): Promise<boolean> => {
  journal.ligne('## 1. La fiche publique s’affiche, la vidéo s’y affiche');
  journal.ligne('');

  await page.goto(`${WEB_URL}/profils/${video.profileId}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('h1');

  const nombreVideos = await page.$$eval('.video-poster', (posters) => posters.length);
  const libelle = await page.$eval('.video-poster', (el) => el.getAttribute('aria-label'));

  journal.ligne(`  URL                    : ${page.url()}`);
  journal.ligne(`  vidéos affichées       : ${nombreVideos}`);
  journal.ligne(`  vignette de la première : ${libelle}`);
  journal.ligne('');

  await capturer(page, 'fiche-et-video', 'section[aria-labelledby="profile-videos-heading"]');
  journal.ligne('  capture : 01-fiche-et-video.png');
  journal.ligne('');

  const conforme = nombreVideos === 1 && libelle !== null && libelle.includes(video.title);
  journal.ligne(
    conforme
      ? '  ✓ la fiche publique se charge et la vidéo du témoin s’y affiche.'
      : '  ⚠ la fiche ou la vidéo ne s’affiche pas comme attendu.',
  );
  journal.ligne('');

  return conforme;
};

/** 2. Le formulaire de profil enregistre réellement, puis reprend l'état
 *  d'origine — pas de dérive laissée sur le témoin après le relevé. */
const demontrerModifiable = async (page: Page, journal: Journal): Promise<boolean> => {
  journal.ligne('## 2. Le profil reste modifiable');
  journal.ligne('');

  // L'étape 1 a laissé le navigateur sur la fiche publique ; le formulaire de
  // modification, comme la suppression de vidéo (étape 3), vit sur l'espace
  // propriétaire.
  await page.goto(`${WEB_URL}/mon-profil`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('form[aria-labelledby="profile-form-title"]');

  const champTitre = 'form[aria-labelledby="profile-form-title"] #headline';
  const boutonEnregistrer = 'form[aria-labelledby="profile-form-title"] button[type="submit"]';
  const avisEnregistre = '.alert--success';

  const original = await page.$eval(champTitre, (el: HTMLInputElement) => el.value);
  journal.ligne(`  titre avant modification : "${original}"`);

  const enregistrer = async (valeur: string): Promise<void> => {
    await page.focus(champTitre);
    // A simulated triple-click doesn't reliably select all of a React-
    // controlled input's text before typing — the native `.select()` does,
    // and `page.type()` then replaces the selection like real typing would.
    await page.$eval(champTitre, (el: HTMLInputElement) => el.select());
    await page.type(champTitre, valeur);
    await page.click(boutonEnregistrer);
    await attendreQue(
      async () => (await page.$(avisEnregistre)) !== null,
      'l’avis « Profil enregistré » apparaît',
    );
  };

  const marqueur = `${original}${MARQUEUR_PREUVE}`;
  await enregistrer(marqueur);
  const valeurApresModification = await page.$eval(champTitre, (el: HTMLInputElement) => el.value);
  journal.ligne(`  titre après modification : "${valeurApresModification}"`);
  await capturer(page, 'profil-modifie');
  journal.ligne('  capture : 02-profil-modifie.png');

  // Retour à l'état d'origine, avant de passer à la suppression — un témoin
  // ne doit pas rester visiblement changé par ce relevé.
  await enregistrer(original);
  const valeurRestauree = await page.$eval(champTitre, (el: HTMLInputElement) => el.value);
  journal.ligne(`  titre restauré           : "${valeurRestauree}"`);
  journal.ligne('');

  const conforme = valeurApresModification === marqueur && valeurRestauree === original;
  journal.ligne(
    conforme
      ? '  ✓ l’enregistrement a pris effet, puis a été restauré à l’identique.'
      : '  ⚠ l’enregistrement n’a pas produit l’effet attendu.',
  );
  journal.ligne('');

  return conforme;
};

/** 3. La vidéo reste supprimable — via le vrai bouton de l'interface, ce qui
 *  exerce `deleteVideo` bout en bout : `getVideoProviderByName(video.
 *  providerName)` (V4) doit trouver un fournisseur réel puisque V3 a
 *  renseigné la ligne, sans passer par le repli vers getVideoProvider(). */
const demontrerVideoSupprimable = async (
  page: Page,
  journal: Journal,
  video: VideoTemoin,
): Promise<boolean> => {
  journal.ligne('## 3. La vidéo reste supprimable (chemin V4)');
  journal.ligne('');
  journal.ligne(`  vidéo             : « ${video.title} » (${video.id})`);
  journal.ligne(`  Video.providerName : ${video.providerName}`);
  journal.ligne(`  Video.providerRef  : ${video.providerRef}`);
  journal.ligne('');

  const provenanceReelle = video.providerName !== null && video.providerRef !== null;
  journal.ligne(
    provenanceReelle
      ? '  la ligne porte bien un providerName — deleteVideo() résout le fournisseur via' +
          ' getVideoProviderByName() (chemin normal), pas via le repli getVideoProvider().'
      : '  ⚠ providerName est encore null — cette suppression exercerait le repli, pas le' +
          ' chemin V4 normal. Lancez npm run db:migrate-video-providers -w @profils-actifs/db.',
  );
  journal.ligne('');

  const [reponse] = await Promise.all([
    page.waitForResponse(
      (r: HTTPResponse) =>
        r.url().endsWith(`/videos/${video.id}`) && r.request().method() === 'DELETE',
    ),
    (async () => {
      await page.click('.video-list > .video-row button.button--danger');
      await attendreQue(
        async () =>
          (await page.$eval(
            '.video-list > .video-row button.button--danger',
            (el) => el.textContent,
          )) === 'Confirmer la suppression',
        'le bouton bascule en confirmation de suppression',
      );
      await page.click('.video-list > .video-row button.button--danger');
    })(),
  ]);

  journal.ligne(
    `$ DELETE .../videos/${video.id}    # via l’interface, authentifié comme ${COMPTE_TEMOIN}`,
  );
  journal.ligne(`  → HTTP ${reponse.status()}`);
  journal.ligne('');

  await attendreQue(
    async () => (await page.$$eval('.video-list > .video-row', (rows) => rows.length)) === 0,
    'la vidéo disparaît de la liste',
  );
  await capturer(page, 'video-supprimee', 'section[aria-labelledby="videos-title"]');
  journal.ligne('  capture : 03-video-supprimee.png (« Aucune vidéo pour le moment. »)');
  journal.ligne('');

  const ligneEncore = await prisma.video.findUnique({ where: { id: video.id } });
  journal.ligne(`  ligne Video encore présente en base : ${ligneEncore !== null}`);
  journal.ligne('');

  const conforme = reponse.status() === 204 && ligneEncore === null;
  journal.ligne(
    conforme
      ? '  ✓ la vidéo a été supprimée bout en bout : 204, ligne disparue, liste vide à l’écran.'
      : '  ⚠ la suppression n’a pas produit l’effet attendu.',
  );
  journal.ligne('');

  return conforme;
};

const main = async (): Promise<void> => {
  mkdirSync(DOSSIER_CAPTURES, { recursive: true });

  const journal = creerJournal(RACINE);
  journal.entete('V6 — non-régression sur le témoin après la migration V3', {
    web: WEB_URL,
    compte: `${COMPTE_TEMOIN} (témoin choisi en V5)`,
  });

  const video = await videoTemoin(COMPTE_TEMOIN);
  const { browser, page } = await ouvrirNavigateur();

  let renduEtVideo = false;
  let modifiable = false;
  let supprimable = false;

  try {
    await seConnecter(page, WEB_URL, COMPTE_TEMOIN, MOT_DE_PASSE);
    journal.ligne(`connexion réussie, redirigé vers : ${page.url()}`);
    journal.ligne('');

    renduEtVideo = await demontrerRenduEtVideo(page, journal, video);
    modifiable = await demontrerModifiable(page, journal);
    supprimable = await demontrerVideoSupprimable(page, journal, video);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }

  journal.ligne('## Résultat');
  journal.ligne('');
  journal.ligne(`  fiche affichée et vidéo visible : ${renduEtVideo}`);
  journal.ligne(`  profil modifiable               : ${modifiable}`);
  journal.ligne(`  vidéo supprimable (chemin V4)   : ${supprimable}`);
  journal.ligne('');
  journal.ligne(
    '  Le témoin est à restaurer après ce relevé : npm run db:seed, puis' +
      ' npm run db:migrate-video-providers -w @profils-actifs/db.',
  );
  journal.ligne('');
  journal.ligne(`fin — ${new Date().toISOString()}`);
  journal.ecrire(CHEMIN_TXT);

  console.log(`Captures écrites dans ${DOSSIER_CAPTURES}/`);
  console.log(`Journal écrit dans ${CHEMIN_TXT}`);

  if (!renduEtVideo || !modifiable || !supprimable) process.exitCode = 1;
};

await main();

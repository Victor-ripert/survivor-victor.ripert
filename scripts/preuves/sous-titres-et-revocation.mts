/**
 * AD-7 — the two demonstrations the legal adviser asked to be shown herself,
 * in one run because they are the same video:
 *
 *   1. Subtitles. A demonstration video ProfilsActifs hosts itself, carrying a
 *      real WebVTT track, displayed by our own player without the viewer
 *      having to turn anything on. Checked in the page — the track's `mode`
 *      and the text of the cue actually active at a given timestamp — and not
 *      only photographed, because a screenshot cannot distinguish a caption
 *      from a caption-shaped pixel.
 *
 *   2. Revocation with real effect. `ls -la` of the storage directory before,
 *      the profile page showing the video, the deletion through the real
 *      `DELETE /videos/{id}` route as the owner, `ls -la` after, and the
 *      profile page again. That is the sequence she asked for, in her order.
 *
 *   docker compose up -d
 *   npm run db:migrate && npm run db:seed
 *   npm run dev -w @profils-actifs/api     # API on :3000
 *   npm run dev -w @profils-actifs/web     # web on :5173
 *   npx tsx scripts/preuves/sous-titres-et-revocation.mts
 *
 * The run deletes the fixture it demonstrates on, which is the point. Re-run
 * `npm run db:seed` afterwards to put it back.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from 'puppeteer-core';
import { loadRepoEnv, resolveUploadDir } from '@profils-actifs/shared/node';
import { creerJournal, type Journal } from './lib/journal-preuve.js';
import { ouvrirNavigateur } from './lib/navigateur.js';

loadRepoEnv();

const HERE = dirname(fileURLToPath(import.meta.url));
const RACINE = join(HERE, '../..');

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';
const API_URL = process.env.API_URL ?? 'http://localhost:3000/api';
const MOT_DE_PASSE = process.env.MOT_DE_PASSE ?? 'Password123!';

const DOSSIER_CAPTURES = join(RACINE, 'docs/preuves/AD-7-sous-titres-et-revocation');
const CHEMIN_TXT = join(RACINE, 'docs/preuves/AD-7-sous-titres-et-revocation.txt');

/** Where the caption cue is sampled: inside the second cue, far enough from
 *  its edges that a rounding difference cannot land the check between two. */
const INSTANT_ECHANTILLON = 5;

interface VideoPublique {
  id: string;
  type: string;
  url: string;
  captionsUrl?: string;
  title: string;
}

interface ProfilPublic {
  id: string;
  firstName: string;
  lastName: string;
  videos: VideoPublique[];
}

let compteurCapture = 0;
const capturer = async (page: Page, nom: string): Promise<void> => {
  compteurCapture += 1;
  const chemin = join(
    DOSSIER_CAPTURES,
    `${String(compteurCapture).padStart(2, '0')}-${nom}.png`,
  ) as `${string}.png`;
  await page.screenshot({ path: chemin });
};

/** `ls -la` itself, not a reimplementation of it: she asked for a view of the
 *  storage directory, and the shell's own output is the least arguable one. */
const listerRepertoire = (dossier: string): string =>
  execFileSync('ls', ['-la', dossier], { encoding: 'utf8' }).trimEnd();

const journaliserRepertoire = (journal: Journal, dossier: string, moment: string): void => {
  journal.ligne(`$ ls -la ${dossier}    # ${moment}`);
  for (const ligne of listerRepertoire(dossier).split('\n')) journal.ligne(`  ${ligne}`);
  journal.ligne('');
};

const profilAvecVideoSousTitree = async (): Promise<ProfilPublic> => {
  const corps = (await fetch(`${API_URL}/profiles?limit=20`).then((r) => r.json())) as {
    data: ProfilPublic[];
  };

  const trouve = corps.data.find((profil) =>
    profil.videos.some((video) => video.type === 'UPLOAD' && video.captionsUrl),
  );
  if (!trouve) {
    throw new Error('aucun profil public avec vidéo sous-titrée — lancez npm run db:seed.');
  }
  return trouve;
};

interface EtatPiste {
  pistes: number;
  mode: string;
  langue: string;
  genre: string;
  cues: number;
  cueActive: string | null;
}

/**
 * Reads the state of the caption track from inside the page: how many tracks
 * the player exposes, whether the browser has it `showing` (as opposed to
 * merely available in a menu), and the text of the cue active at
 * `INSTANT_ECHANTILLON`. `showing` without an active cue would mean the track
 * loaded and matched nothing — worth telling apart.
 */
const lirePiste = (page: Page, instant: number): Promise<EtatPiste> =>
  page.evaluate(async (t: number) => {
    const media = document.querySelector('video') as HTMLVideoElement;
    const piste = media.textTracks[0];

    // The .vtt is fetched and parsed asynchronously after the element mounts;
    // `mode` reads 'showing' well before `cues` is populated, so waiting on
    // the mode alone samples an empty track.
    for (let essai = 0; essai < 50 && (piste?.cues?.length ?? 0) === 0; essai += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Paused first: an autoplaying video keeps moving between the seek and the
    // read, which is how a sample lands just outside the cue it aimed for.
    media.pause();
    media.currentTime = t;
    await new Promise((resolve) => {
      media.addEventListener('seeked', resolve, { once: true });
    });

    // `activeCues` is recomputed on the media element's own timer rather than
    // synchronously on seek.
    for (let essai = 0; essai < 30 && (piste?.activeCues?.length ?? 0) === 0; essai += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const active = piste?.activeCues?.[0] as VTTCue | undefined;

    return {
      pistes: media.textTracks.length,
      mode: piste?.mode ?? 'aucune',
      langue: piste?.language ?? '',
      genre: piste?.kind ?? '',
      cues: piste?.cues?.length ?? 0,
      cueActive: active ? active.text : null,
    };
  }, instant);

const demontrerSousTitres = async (
  page: Page,
  journal: Journal,
  profil: ProfilPublic,
): Promise<boolean> => {
  journal.ligne('## 1. Sous-titres — une piste réelle, affichée par notre lecteur');
  journal.ligne('');

  const video = profil.videos.find((v) => v.type === 'UPLOAD' && v.captionsUrl);
  if (!video) throw new Error('profil sans vidéo déposée');

  journal.ligne(`  profil     : ${profil.firstName} ${profil.lastName} (${profil.id})`);
  journal.ligne(`  vidéo      : « ${video.title} »`);
  journal.ligne(`  fichier    : ${video.url}`);
  journal.ligne(`  piste      : ${video.captionsUrl}`);
  journal.ligne('');

  // The track is fetched over HTTP by the browser like any other asset; if the
  // API did not serve it, `mode` below would never reach 'showing'.
  const reponsePiste = await fetch(`${API_URL.replace(/\/api$/, '')}${video.captionsUrl}`);
  journal.ligne(
    `  la piste est servie : HTTP ${reponsePiste.status} ` +
      `${reponsePiste.headers.get('content-type')}`,
  );
  journal.ligne('');

  await page.goto(`${WEB_URL}/profils/${profil.id}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.video-poster');

  // Activated from the keyboard, like the rest of these proofs: the poster is
  // a real button, and this is the path a keyboard-only reader takes.
  await page.focus('.video-poster');
  await page.keyboard.press('Enter');
  await page.waitForSelector('video.video-frame', { timeout: 5000 });

  const etat = await lirePiste(page, INSTANT_ECHANTILLON);
  await capturer(page, 'sous-titres-affiches');

  journal.ligne(`  pistes exposées par le lecteur : ${etat.pistes}`);
  journal.ligne(`  genre / langue                 : ${etat.genre} / ${etat.langue}`);
  journal.ligne(`  mode                           : ${etat.mode}`);
  journal.ligne(`  cues chargées                  : ${etat.cues}`);
  journal.ligne(
    `  cue affichée à t=${INSTANT_ECHANTILLON}s            : ${JSON.stringify(etat.cueActive)}`,
  );
  journal.ligne('');

  const conforme =
    etat.pistes === 1 &&
    etat.mode === 'showing' &&
    etat.genre === 'captions' &&
    etat.langue === 'fr' &&
    etat.cues > 0 &&
    etat.cueActive !== null;

  journal.ligne(
    conforme
      ? '  ✓ la piste est chargée, en mode « showing » sans action du spectateur, ' +
          'et une cue est réellement affichée à cet instant.'
      : '  ⚠ la piste n’est pas affichée dans les conditions attendues.',
  );
  journal.ligne('');

  return conforme;
};

const jetonDe = async (email: string): Promise<string> => {
  const reponse = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: MOT_DE_PASSE }),
  });
  if (!reponse.ok) throw new Error(`connexion refusée pour ${email} : HTTP ${reponse.status}`);
  return ((await reponse.json()) as { token: string }).token;
};

const emailDe = (profil: ProfilPublic): string =>
  `${profil.firstName}.${profil.lastName}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z.]/g, '')
    .toLowerCase() + '@example.fr';

const demontrerRevocation = async (
  page: Page,
  journal: Journal,
  profil: ProfilPublic,
): Promise<boolean> => {
  const dossier = resolveUploadDir();
  const video = profil.videos.find((v) => v.type === 'UPLOAD' && v.captionsUrl);
  if (!video) throw new Error('profil sans vidéo déposée');

  const cheminVideo = join(dossier, video.url.replace('/uploads/', ''));
  const cheminPiste = join(dossier, (video.captionsUrl ?? '').replace('/uploads/', ''));

  journal.ligne('## 2. Révocation du consentement — effet réel sur le stockage');
  journal.ligne('');
  journal.ligne(`  répertoire de stockage : ${dossier}`);
  journal.ligne('  (hors du dépôt, comme l’exige le §8.5 — la configuration est refusée sinon)');
  journal.ligne('');

  journaliserRepertoire(journal, dossier, 'AVANT révocation');

  await page.goto(`${WEB_URL}/profils/${profil.id}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.video-poster');
  await capturer(page, 'fiche-avant-revocation');
  journal.ligne('  capture : la fiche publique porte la vidéo (02-fiche-avant-revocation.png)');
  journal.ligne('');

  // The candidate's own account, through the route the interface calls — not
  // a direct database delete, which would prove nothing about the product.
  const email = emailDe(profil);
  const token = await jetonDe(email);
  const suppression = await fetch(`${API_URL}/videos/${video.id}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });

  journal.ligne(`$ DELETE ${API_URL}/videos/${video.id}    # authentifié comme ${email}`);
  journal.ligne(`  → HTTP ${suppression.status}`);
  journal.ligne('');

  journaliserRepertoire(journal, dossier, 'APRÈS révocation');

  await page.goto(`${WEB_URL}/profils/${profil.id}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('h1');
  await capturer(page, 'fiche-apres-revocation');
  journal.ligne('  capture : la fiche publique ne porte plus de vidéo (03-fiche-apres-revocation.png)');
  journal.ligne('');

  const videoPartie = !existsSync(cheminVideo);
  const pistePartie = !existsSync(cheminPiste);
  const plusDeVideoSurLaFiche = (await page.$('.video-poster, video.video-frame')) === null;

  journal.ligne(`  fichier vidéo supprimé du disque   : ${videoPartie}`);
  journal.ligne(`  piste de sous-titres supprimée     : ${pistePartie}`);
  journal.ligne(`  la fiche ne montre plus de vidéo    : ${plusDeVideoSurLaFiche}`);
  journal.ligne('');

  const conforme =
    suppression.status === 204 && videoPartie && pistePartie && plusDeVideoSurLaFiche;

  journal.ligne(
    conforme
      ? '  ✓ la révocation a retiré les octets, pas seulement la ligne : le répertoire de\n' +
          '    stockage ne contient plus ni la vidéo ni sa piste, et la fiche est nette.'
      : '  ⚠ la révocation n’a pas produit l’effet attendu sur le stockage.',
  );
  journal.ligne('');

  return conforme;
};

const main = async (): Promise<void> => {
  mkdirSync(DOSSIER_CAPTURES, { recursive: true });

  const journal = creerJournal(RACINE);
  journal.entete('AD-7 — sous-titres réels et révocation à effet réel', {
    web: WEB_URL,
    api: API_URL,
  });

  const profil = await profilAvecVideoSousTitree();
  const { browser, page } = await ouvrirNavigateur();

  let sousTitres = false;
  let revocation = false;

  try {
    sousTitres = await demontrerSousTitres(page, journal, profil);
    revocation = await demontrerRevocation(page, journal, profil);
  } finally {
    await browser.close();
  }

  journal.ligne('## Résultat');
  journal.ligne('');
  journal.ligne(`  sous-titres réels affichés par le lecteur : ${sousTitres}`);
  journal.ligne(`  révocation supprimant les fichiers        : ${revocation}`);
  journal.ligne('');
  journal.ligne('  Le jeu de démonstration est à restaurer après ce relevé : npm run db:seed');
  journal.ligne('');
  journal.ligne(`fin — ${new Date().toISOString()}`);
  journal.ecrire(CHEMIN_TXT);

  console.log(`Captures écrites dans ${DOSSIER_CAPTURES}/`);
  console.log(`Journal écrit dans ${CHEMIN_TXT}`);

  if (!sousTitres || !revocation) process.exitCode = 1;
};

await main();

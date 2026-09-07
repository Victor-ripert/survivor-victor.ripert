/**
 * VI-7 (2/3 + 3/3) — confirms a video's caption track actually renders in
 * the player, not merely that a `.srt` file sits next to it. Checks two
 * independent things rather than trusting a screenshot read by eye:
 *
 *   1. DOM-level: the embed's own caption overlay
 *      (`.ytp-caption-window-container` for YouTube) exists in the iframe's
 *      DOM and holds non-empty text — polled for up to 10s of real playback,
 *      since an ASR track's segments flash in and out and a single fixed-time
 *      check can land in the gap between two of them (a real false negative
 *      hit during development, not a hypothetical one).
 *   2. A screenshot of that state, for the human-readable proof.
 *
 *   npm run dev -w @profils-actifs/api     # API on :3000
 *   npm run dev -w @profils-actifs/web     # web on :5173
 *   npm run db:seed
 *   npx tsx scripts/preuves/sous-titres-capture.mts
 *   # or, against one specific profile/video once it exists:
 *   PROFILE_ID=<id> npx tsx scripts/preuves/sous-titres-capture.mts
 *
 * Deliberately generic over *which* video: `utils/embed.ts` forces
 * `cc_load_policy=1` + `cc_lang_pref=fr` for every `EXTERNAL_LINK` video
 * this app embeds, so this script proves the mechanism against whichever
 * profile it's pointed at. Today that's a seeded stock video (chosen only
 * because YouTube ships it with real captions); re-running against
 * PROFILE_ID once the real demonstration video from
 * docs/livrables/video-demonstration.md is recorded and published produces
 * the actual VI-7 deliverable with no script change.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { creerJournal } from './lib/journal-preuve.js';
import { ouvrirNavigateur } from './lib/navigateur.js';
import { choisirProfilCertifie } from './lib/profil-demo.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const RACINE = join(HERE, '../..');

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';
const API_URL = process.env.API_URL ?? 'http://localhost:3000/api';
const PROFILE_ID = process.env.PROFILE_ID;

const CHEMIN_PNG = join(RACINE, 'docs/preuves/VI-7-sous-titres-affiches.png');
const CHEMIN_TXT = join(RACINE, 'docs/preuves/VI-7-sous-titres-affiches.txt');

// Le conteneur des sous-titres du lecteur YouTube embarqué — Vimeo rend les
// siens dans `.vp-captions`, à substituer ici le jour où la vidéo de
// démonstration part sur cet hébergeur plutôt que YouTube.
const SELECTEUR_SOUS_TITRES_YOUTUBE = '.ytp-caption-window-container';

const main = async (): Promise<void> => {
  const journal = creerJournal(RACINE);
  journal.entete('VI-7 (2 & 3/3) — sous-titres réellement affichés dans le lecteur (§7.5)', {
    web: WEB_URL,
  });

  const profilCible = PROFILE_ID ? { id: PROFILE_ID } : await choisirProfilCertifie(API_URL);
  journal.ligne(
    PROFILE_ID
      ? `profil forcé via PROFILE_ID : ${profilCible.id}`
      : `profil choisi automatiquement (aucun PROFILE_ID fourni) : ${profilCible.id} — ` +
          'à remplacer par le profil réel une fois la vidéo de démonstration publiée.',
  );

  const { browser, page } = await ouvrirNavigateur();

  try {
    await page.goto(`${WEB_URL}/profils/${profilCible.id}`, { waitUntil: 'networkidle0' });
    const posterHandle = await page.waitForSelector('.video-poster', { timeout: 5000 });
    if (!posterHandle)
      throw new Error('aucune vidéo sur ce profil — impossible de vérifier les sous-titres');

    await posterHandle.click();
    const iframeHandle = await page.waitForSelector('.video-frame', { timeout: 5000 });
    if (!iframeHandle) throw new Error('l’iframe ne s’est jamais chargée après activation');

    journal.ligne('vidéo activée, recherche d’un segment de sous-titre non vide…');

    // Un segment de sous-titre ASR reste affiché une fraction de seconde
    // (parfois un seul mot) avant le suivant : un unique contrôle à t+5s peut
    // tomber pile dans le blanc entre deux répliques et rendre un faux
    // négatif. On sonde au lieu d'attendre une durée fixe, et on capture dès
    // qu'un texte apparaît — au plus près de l'instant où il est visible.
    const cadre = await iframeHandle.contentFrame();
    let texteSousTitre: string | null = null;
    const echeance = Date.now() + 10_000;

    while (cadre && Date.now() < echeance) {
      texteSousTitre = await cadre
        .$eval(SELECTEUR_SOUS_TITRES_YOUTUBE, (el) => el.textContent?.trim() || null)
        .catch(() => null);
      if (texteSousTitre) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    journal.ligne(
      `conteneur de sous-titres (${SELECTEUR_SOUS_TITRES_YOUTUBE}) trouvé avec du texte : ${
        texteSousTitre ? 'oui' : 'non'
      }`,
    );
    if (texteSousTitre) {
      journal.ligne(`texte affiché à l’instant de la capture : « ${texteSousTitre} »`);
    } else {
      journal.ligne(
        '   ⚠ aucun segment de sous-titre non vide en 10 s de lecture — soit cette vidéo n’a pas ' +
          'de piste réellement exploitée à cet endroit (ex. intro instrumentale), soit elle n’en a ' +
          'pas du tout : relancer avec PROFILE_ID sur un profil dont la vidéo parle dès le début.',
      );
    }

    const section = await page.$('section[aria-labelledby="profile-videos-heading"]');
    if (section) {
      await section.screenshot({ path: CHEMIN_PNG as `${string}.png` });
    } else {
      await page.screenshot({ path: CHEMIN_PNG as `${string}.png` });
    }
    journal.ligne(`capture d’écran : ${CHEMIN_PNG}`);
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

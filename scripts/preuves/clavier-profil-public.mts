/**
 * VI-6 (1/3 + 2/3) — walks the public profile page with the keyboard alone:
 * `Tab` from a fresh page load (no mouse ever used), through whatever the
 * header puts first, into the page's own controls, activating the video and
 * opening the contact dialog on `Enter`. At every stop it logs the focused
 * element AND checks — live, via `:focus-visible` and a real `box-shadow` —
 * that the ring is actually visible, rather than trusting a screenshot read
 * by eye.
 *
 *   npm run dev -w @profils-actifs/api     # API on :3000
 *   npm run dev -w @profils-actifs/web     # web on :5173
 *   npm run db:seed
 *   npx tsx scripts/preuves/clavier-profil-public.mts
 *
 * Logs in as a recruiter (real login form, keyboard-driven like the rest —
 * see lib/navigateur.ts) so the "Contacter" section renders; picks the same
 * kind of profile the contrast proof uses via lib/profil-demo.ts.
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ElementHandle, Page } from 'puppeteer-core';
import { creerJournal } from './lib/journal-preuve.js';
import { ouvrirNavigateur, seConnecter } from './lib/navigateur.js';
import { choisirProfilCertifie } from './lib/profil-demo.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const RACINE = join(HERE, '../..');

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';
const API_URL = process.env.API_URL ?? 'http://localhost:3000/api';
const COMPTE_RECRUTEUR = process.env.COMPTE_RECRUTEUR ?? 'recruteur@profils-actifs.fr';
const MOT_DE_PASSE = process.env.MOT_DE_PASSE ?? 'Password123!';

const DOSSIER_CAPTURES = join(RACINE, 'docs/preuves/VI-6-clavier-profil-public');
const CHEMIN_TXT = join(RACINE, 'docs/preuves/VI-6-clavier-profil-public.txt');

const MAX_TAB = 60;

interface Arret {
  tag: string;
  texte: string;
  classe: string;
  id: string;
  dansMain: boolean;
  focusVisible: boolean;
  anneauVisible: boolean;
}

const inspecterFocus = (page: Page): Promise<Arret | null> =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;

    const style = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      texte: (el.textContent ?? '').trim().slice(0, 60),
      classe: el.className || '',
      id: el.id || '',
      dansMain: el.closest('#contenu') !== null,
      focusVisible: el.matches(':focus-visible'),
      anneauVisible: style.boxShadow !== 'none' && style.boxShadow !== '',
    };
  });

let compteurCapture = 0;
const capturer = async (page: Page, nom: string): Promise<void> => {
  compteurCapture += 1;
  const chemin = join(
    DOSSIER_CAPTURES,
    `${String(compteurCapture).padStart(2, '0')}-${nom}.png`,
  ) as `${string}.png`;
  await page.screenshot({ path: chemin });
};

const main = async (): Promise<void> => {
  mkdirSync(DOSSIER_CAPTURES, { recursive: true });

  const journal = creerJournal(RACINE);
  journal.entete('VI-6 (1 & 2/3) — parcours clavier, page profil public (§7.4)', {
    web: WEB_URL,
    compte: `${COMPTE_RECRUTEUR} (vue recruteur, pour atteindre l’action de contact)`,
  });

  const profilCible = await choisirProfilCertifie(API_URL);
  journal.ligne(`profil visité : ${profilCible.id}`);
  journal.ligne('');

  const { browser, page } = await ouvrirNavigateur();

  try {
    await seConnecter(page, WEB_URL, COMPTE_RECRUTEUR, MOT_DE_PASSE);

    await page.goto(`${WEB_URL}/profils/${profilCible.id}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('article.two-col h1');

    journal.ligne(
      'chaque ligne : arrêt Tab, élément focalisé, dans #contenu ?, :focus-visible ?, anneau visible ?',
    );
    journal.ligne('');

    let aVuLienEvitement = false;
    let aVuRetourProfils = false;
    let aVuVideoPoster = false;
    let aVuBoutonContacter = false;
    let posterVideoHandle: ElementHandle<Element> | null = null;

    let dernierSignature: string | null = null;
    let repetitions = 0;

    const clorreRepetitions = (): void => {
      if (repetitions === 0) return;
      journal.ligne(
        `   … même élément inchangé pendant ${repetitions} appui(s) Tab supplémentaire(s) — le ` +
          'focus semble « coincé » à la frontière du cadre embarqué intersite : limite connue de ' +
          'l’automatisation clavier sur un iframe cross-origin, à revérifier à la main au clavier réel.',
      );
      repetitions = 0;
    };

    for (let etape = 1; etape <= MAX_TAB; etape += 1) {
      await page.keyboard.press('Tab');
      const arret = await inspecterFocus(page);

      // Le texte compte dans la signature : plusieurs liens de nav partagent
      // la même balise et la même absence de classe, seul leur intitulé les
      // distingue — sans lui, la compression des répétitions ci-dessous
      // aurait avalé des arrêts réellement différents.
      const signature = arret ? `${arret.tag}|${arret.id}|${arret.classe}|${arret.texte}` : 'body';

      if (signature === dernierSignature) {
        repetitions++;
        continue;
      }
      clorreRepetitions();
      dernierSignature = signature;

      if (!arret) {
        journal.ligne(
          `#${String(etape).padStart(2, '0')} — focus revenu sur <body> (fin de page ?)`,
        );
        continue;
      }

      journal.ligne(
        `#${String(etape).padStart(2, '0')} <${arret.tag}${arret.id ? `#${arret.id}` : ''}${
          arret.classe ? `.${arret.classe.split(' ').join('.')}` : ''
        }> "${arret.texte}" — dans #contenu=${arret.dansMain} :focus-visible=${arret.focusVisible} anneau=${arret.anneauVisible}`,
      );

      if (!arret.focusVisible || !arret.anneauVisible) {
        journal.ligne('   ⚠ anneau de focus absent ou non visible à cet arrêt');
      }

      if (!aVuLienEvitement && arret.classe.includes('skip-link')) {
        aVuLienEvitement = true;
        await capturer(page, 'lien-evitement');
      }

      if (!aVuRetourProfils && arret.classe.includes('back-link')) {
        aVuRetourProfils = true;
        await capturer(page, 'retour-profils-focus');
      }

      if (!aVuVideoPoster && arret.classe.includes('video-poster')) {
        aVuVideoPoster = true;
        posterVideoHandle = (await page.evaluateHandle(
          () => document.activeElement as Element,
        )) as unknown as ElementHandle<Element>;
        await capturer(page, 'video-avant-activation');

        // Activation au clavier, pas à la souris — le point même de VI-6.
        await page.keyboard.press('Enter');
        await page.waitForSelector('.video-frame', { timeout: 5000 });
        await new Promise((resolve) => setTimeout(resolve, 2500));
        await capturer(page, 'video-active');

        const apresActivation = await inspecterFocus(page);
        journal.ligne(
          `   après Enter sur la vignette : focus = ${
            apresActivation
              ? `<${apresActivation.tag}> "${apresActivation.texte}"`
              : '<body> (perdu)'
          }`,
        );
        if (!apresActivation) {
          journal.ligne(
            '   ⚠ le bouton-vignette est démonté à l’activation (l’iframe le remplace dans le DOM) ' +
              'et rien ne reprend le focus : le clavier revient à <body>, un Tab suivant repart du ' +
              'tout début du document plutôt que de la carte vidéo. À signaler pour AD-6.',
          );
        }
      }

      if (
        !aVuBoutonContacter &&
        arret.dansMain &&
        arret.tag === 'button' &&
        arret.texte === 'Contacter'
      ) {
        aVuBoutonContacter = true;
        await capturer(page, 'bouton-contacter-focus');

        await page.keyboard.press('Enter');
        await page.waitForSelector('dialog[open]', { timeout: 5000 });
        const arretDialogue = await inspecterFocus(page);
        journal.ligne(
          `   après Enter sur Contacter : dialogue ouvert, focus = ${
            arretDialogue ? `<${arretDialogue.tag}> "${arretDialogue.texte}"` : '<body>'
          }`,
        );
        await capturer(page, 'dialogue-contact-ouvert');
        break;
      }
    }

    void posterVideoHandle;

    journal.ligne('');
    journal.ligne(`lien d’évitement rencontré : ${aVuLienEvitement}`);
    journal.ligne(`« Retour aux profils » rencontré : ${aVuRetourProfils}`);
    journal.ligne(`vidéo activée au clavier : ${aVuVideoPoster}`);
    journal.ligne(`bouton « Contacter » atteint et activé au clavier : ${aVuBoutonContacter}`);

    if (!aVuBoutonContacter) {
      throw new Error(
        `le parcours clavier n’a pas atteint le bouton Contacter en ${MAX_TAB} appuis sur Tab`,
      );
    }
  } finally {
    await browser.close();
  }

  journal.ligne('');
  journal.ligne(`fin — ${new Date().toISOString()}`);
  journal.ecrire(CHEMIN_TXT);

  console.log(`Captures écrites dans ${DOSSIER_CAPTURES}/`);
  console.log(`Journal écrit dans ${CHEMIN_TXT}`);
};

await main();

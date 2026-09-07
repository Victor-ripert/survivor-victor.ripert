/**
 * AD-6 — walks the three screens the legal adviser named, with the keyboard
 * alone, and records what actually happens rather than what the source
 * suggests should: the registration path (`/inscription`), the public profile
 * page (`/profils/:id`) and the recruiter catalogue (`/recruteur/catalogue`).
 *
 * At every Tab stop it logs the focused element and checks, live in the page,
 * that a focus ring is really painted — `:focus-visible` matching *and* a
 * non-empty computed `box-shadow`. A screenshot read by eye is not evidence
 * that the ring is there; a computed style is.
 *
 *   docker compose up -d
 *   npm run db:migrate && npm run db:seed
 *   npm run dev -w @profils-actifs/api     # API on :3000
 *   npm run dev -w @profils-actifs/web     # web on :5173
 *   npx tsx scripts/preuves/clavier-trois-ecrans.mts
 *
 * The profile page is also where AD-6's own defect was found and fixed:
 * activating a video used to unmount the poster button that held focus,
 * dropping the keyboard back to <body>. This script asserts the handover
 * rather than describing it — see `verifierRepriseDuFocus`.
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from 'puppeteer-core';
import { creerJournal, type Journal } from './lib/journal-preuve.js';
import { ouvrirNavigateur, seConnecter } from './lib/navigateur.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const RACINE = join(HERE, '../..');

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';
const API_URL = process.env.API_URL ?? 'http://localhost:3000/api';
const COMPTE_RECRUTEUR = process.env.COMPTE_RECRUTEUR ?? 'recruteur@profils-actifs.fr';
const MOT_DE_PASSE = process.env.MOT_DE_PASSE ?? 'Password123!';

const DOSSIER_CAPTURES = join(RACINE, 'docs/preuves/AD-6-clavier-trois-ecrans');
const CHEMIN_TXT = join(RACINE, 'docs/preuves/AD-6-clavier-trois-ecrans.txt');

const MAX_TAB = 90;

interface Arret {
  tag: string;
  texte: string;
  classe: string;
  id: string;
  /** `name`/`type`/`value` for form controls. Without them two unlabelled
   *  radios of the same group are indistinguishable, and the repeat-collapsing
   *  below would silently swallow one of the two as a duplicate stop. */
  attributs: string;
  focusVisible: boolean;
  anneauVisible: boolean;
}

const inspecterFocus = (page: Page): Promise<Arret | null> =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;

    const controle = el as HTMLInputElement;

    // The name a screen reader would announce, by the three routes this app
    // actually uses: an explicit aria-label, a `for`-associated <label>, or
    // the <label> the control is nested inside. Recorded because it is what
    // tells two otherwise identical checkboxes apart — for the reader as much
    // as for this transcript.
    const parEtiquetteFor = el.id
      ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent
      : null;
    const nomAccessible = (
      el.getAttribute('aria-label') ??
      parEtiquetteFor ??
      el.closest('label')?.textContent ??
      ''
    )
      .trim()
      .slice(0, 60);

    const attributs = [
      controle.type ? `type=${controle.type}` : '',
      controle.name ? `name=${controle.name}` : '',
      controle.type === 'radio' || controle.type === 'checkbox' ? `value=${controle.value}` : '',
      nomAccessible ? `nom="${nomAccessible}"` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const style = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      texte: (el.textContent ?? '').trim().slice(0, 48),
      classe: el.className || '',
      id: el.id || '',
      attributs,
      // `:focus-visible` alone is not enough: an element can match it and
      // still paint nothing if a rule overrode the global ring.
      focusVisible: el.matches(':focus-visible'),
      anneauVisible: style.boxShadow !== 'none' && style.boxShadow !== '',
    };
  });

const decrire = (arret: Arret): string =>
  `<${arret.tag}${arret.id ? `#${arret.id}` : ''}${
    arret.classe ? `.${arret.classe.split(' ').filter(Boolean).join('.')}` : ''
  }${arret.attributs ? ` ${arret.attributs}` : ''}>${arret.texte ? ` "${arret.texte}"` : ''}`;

const signatureDe = (arret: Arret): string =>
  `${arret.tag}|${arret.id}|${arret.classe}|${arret.attributs}|${arret.texte}`;

let compteurCapture = 0;
const capturer = async (page: Page, nom: string): Promise<void> => {
  compteurCapture += 1;
  const chemin = join(
    DOSSIER_CAPTURES,
    `${String(compteurCapture).padStart(2, '0')}-${nom}.png`,
  ) as `${string}.png`;
  await page.screenshot({ path: chemin });
};

interface ResultatParcours {
  arrets: number;
  sansAnneau: string[];
  /** True when the sweep stopped because it ran out of Tab presses rather
   *  than because the order looped or the target was reached — the transcript
   *  says so rather than letting the list read as complete. */
  plafondAtteint: boolean;
}

/**
 * Tabs through a screen and records every distinct stop. Consecutive stops on
 * the same element are collapsed — a cross-origin iframe swallows Tab and
 * would otherwise fill the transcript with identical lines.
 */
const parcourirAuClavier = async (
  page: Page,
  journal: Journal,
  arreterQuand: (arret: Arret) => boolean,
): Promise<ResultatParcours> => {
  const sansAnneau: string[] = [];
  let arrets = 0;
  let signaturePrecedente: string | null = null;
  let premiereSignature: string | null = null;
  let plafondAtteint = true;

  for (let etape = 1; etape <= MAX_TAB; etape += 1) {
    await page.keyboard.press('Tab');
    const arret = await inspecterFocus(page);

    if (!arret) {
      journal.ligne(`  #${String(etape).padStart(2, '0')} — focus sur <body>`);
      continue;
    }

    const signature = signatureDe(arret);
    // A gap in the numbering is a control that swallowed several Tab presses
    // without the focus leaving it — `<input type="date">` does this, one
    // press per day/month/year segment. Collapsed rather than repeated.
    if (signature === signaturePrecedente) continue;

    // The tab order is a ring: once it comes back to where it started, every
    // further stop is a repeat. Stopping here keeps the transcript a list of
    // the screen's controls rather than three laps of the same list.
    if (signature === premiereSignature) {
      journal.ligne(
        '     ↺ retour au premier élément — l’ordre de tabulation boucle, fin du relevé',
      );
      plafondAtteint = false;
      break;
    }
    premiereSignature ??= signature;

    signaturePrecedente = signature;
    arrets += 1;

    journal.ligne(
      `  #${String(etape).padStart(2, '0')} ${decrire(arret)}` +
        ` — :focus-visible=${arret.focusVisible} anneau=${arret.anneauVisible}`,
    );

    if (!arret.texte && !arret.attributs.includes('nom=')) {
      journal.ligne('     ⚠ aucun nom accessible : ce contrôle n’est annoncé par rien');
    }

    if (!arret.focusVisible || !arret.anneauVisible) {
      sansAnneau.push(decrire(arret));
      journal.ligne('     ⚠ anneau de focus absent ou non peint à cet arrêt');
    }

    if (arreterQuand(arret)) {
      plafondAtteint = false;
      break;
    }
  }

  if (plafondAtteint) {
    journal.ligne(
      `     … relevé interrompu au plafond de ${MAX_TAB} appuis sur Tab : la liste ci-dessus ` +
        'n’épuise pas l’écran',
    );
  }

  return { arrets, sansAnneau, plafondAtteint };
};

const ecranInscription = async (page: Page, journal: Journal): Promise<ResultatParcours> => {
  journal.ligne('## 1. Parcours d’inscription — /inscription (sans compte)');
  journal.ligne('');

  await page.goto(`${WEB_URL}/inscription`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('form');

  const resultat = await parcourirAuClavier(page, journal, (arret) =>
    arret.texte.startsWith('Créer mon compte'),
  );
  await capturer(page, 'inscription-soumission-focus');

  // The age field is the one control the brief makes conditional: it appears
  // only for a job-seeker, so a keyboard path that never reveals it would not
  // be the real path.
  const dateDeNaissanceAtteignable = await page.$eval(
    '#birthDate',
    (el) => !(el as HTMLInputElement).disabled,
  );
  journal.ligne('');
  journal.ligne(`  champ « Date de naissance » présent et actif : ${dateDeNaissanceAtteignable}`);
  journal.ligne('');

  return resultat;
};

/** The seeded profile whose video ProfilsActifs hosts itself — the only one
 *  that carries a caption track, and the one the revocation proof deletes. */
const profilAvecVideoSousTitree = async (): Promise<string> => {
  const corps = (await fetch(`${API_URL}/profiles?limit=20`).then((r) => r.json())) as {
    data: { id: string; videos: { type: string; captionsUrl?: string }[] }[];
  };

  const trouve = corps.data.find((profil) =>
    profil.videos.some((video) => video.type === 'UPLOAD' && video.captionsUrl),
  );
  if (!trouve) {
    throw new Error('aucun profil public avec vidéo sous-titrée — lancez npm run db:seed.');
  }
  return trouve.id;
};

/**
 * The regression AD-6 exists for. Activating the poster replaces it with the
 * player; if nothing takes focus the keyboard falls back to <body> and the
 * next Tab restarts at the top of the document.
 */
const verifierRepriseDuFocus = async (page: Page, journal: Journal): Promise<boolean> => {
  await page.waitForSelector('.video-frame', { timeout: 5000 });

  const apres = await inspecterFocus(page);
  const repris = apres !== null && apres.classe.includes('video-frame');

  journal.ligne(
    `     après Entrée sur la vignette : focus = ${apres ? decrire(apres) : '<body> (perdu)'}`,
  );
  journal.ligne(
    repris
      ? '     ✓ le lecteur reprend le focus ; l’anneau est peint par la règle ' +
          '`.video-frame:focus` (l’<iframe> ne satisfait pas `:focus-visible`)'
      : '     ⚠ RÉGRESSION : le focus est perdu à l’activation de la vidéo',
  );

  return repris;
};

const ecranProfilPublic = async (
  page: Page,
  journal: Journal,
): Promise<ResultatParcours & { focusRepris: boolean }> => {
  const profilId = await profilAvecVideoSousTitree();

  journal.ligne('## 2. Fiche profil publique — /profils/:id (sans compte)');
  journal.ligne(`   profil visité : ${profilId}`);
  journal.ligne('');

  await page.goto(`${WEB_URL}/profils/${profilId}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('h1');

  let focusRepris = false;
  const resultat = await parcourirAuClavier(page, journal, () => false);

  // Re-walk to the poster and activate it, so the check below runs on a
  // deterministic element rather than on wherever the sweep above stopped.
  await page.goto(`${WEB_URL}/profils/${profilId}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.video-poster');
  await page.focus('.video-poster');
  await capturer(page, 'profil-vignette-focus');
  await page.keyboard.press('Enter');
  focusRepris = await verifierRepriseDuFocus(page, journal);
  await capturer(page, 'profil-lecteur-actif-focus');
  journal.ligne('');

  return { ...resultat, focusRepris };
};

const ecranCatalogue = async (page: Page, journal: Journal): Promise<ResultatParcours> => {
  journal.ligne('## 3. Catalogue recruteur — /recruteur/catalogue (compte recruteur)');
  journal.ligne('');

  await seConnecter(page, WEB_URL, COMPTE_RECRUTEUR, MOT_DE_PASSE);
  await page.goto(`${WEB_URL}/recruteur/catalogue`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('form, .profile-card, article');

  const resultat = await parcourirAuClavier(page, journal, (arret) =>
    arret.texte.startsWith('Voir le profil'),
  );
  await capturer(page, 'catalogue-carte-focus');
  journal.ligne('');

  return resultat;
};

const main = async (): Promise<void> => {
  mkdirSync(DOSSIER_CAPTURES, { recursive: true });

  const journal = creerJournal(RACINE);
  journal.entete('AD-6 — parcours clavier vérifié sur les trois écrans imposés', {
    web: WEB_URL,
    compte: `${COMPTE_RECRUTEUR} (pour le catalogue seulement)`,
    methode: 'Tab depuis un chargement neuf, aucun clic ; anneau lu en style calculé',
  });

  const { browser, page } = await ouvrirNavigateur();

  try {
    const inscription = await ecranInscription(page, journal);
    const profil = await ecranProfilPublic(page, journal);
    const catalogue = await ecranCatalogue(page, journal);

    journal.ligne('## Résultat');
    journal.ligne('');
    for (const [nom, resultat] of [
      ['/inscription', inscription],
      ['/profils/:id', profil],
      ['/recruteur/catalogue', catalogue],
    ] as const) {
      journal.ligne(
        `  ${nom.padEnd(24)} ${resultat.arrets} arrêts, ` +
          `${resultat.sansAnneau.length} sans anneau visible` +
          (resultat.plafondAtteint ? ' (relevé arrêté au plafond de Tab)' : ''),
      );
      for (const element of resultat.sansAnneau) journal.ligne(`      → ${element}`);
    }
    journal.ligne('');
    journal.ligne(`  reprise du focus à l’activation d’une vidéo : ${profil.focusRepris}`);

    const echecs =
      inscription.sansAnneau.length + profil.sansAnneau.length + catalogue.sansAnneau.length;
    journal.ligne('');
    journal.ligne(
      echecs === 0 && profil.focusRepris
        ? 'Aucun écart relevé sur les trois écrans à ce passage.'
        : `${echecs} arrêt(s) sans anneau visible — à corriger avant de déclarer ces écrans.`,
    );
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

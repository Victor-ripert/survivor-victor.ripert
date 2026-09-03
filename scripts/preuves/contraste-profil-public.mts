/**
 * VI-6 (3/3) — measures real text/background contrast pairs on the public
 * profile page, in both colour schemes, for Adrien to fold into the AD-6
 * consolidation. "Measured, not estimated" (per the task doc) means every
 * number here comes from `getComputedStyle` on a live, rendered page — never
 * a hex code read off global.css by eye, which would miss what `color-mix()`
 * (used throughout the badge styles) actually resolves to.
 *
 *   npm run dev -w @profils-actifs/api     # API on :3000
 *   npm run dev -w @profils-actifs/web     # web on :5173
 *   npm run db:seed
 *   npx tsx scripts/preuves/contraste-profil-public.mts
 *
 * Logs in as a recruiter so the "Contacter" section — canContact-gated —
 * actually renders; picks a COMPLETED profile with a badge, a video and a
 * skill so every text role on the page has something to measure.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from 'puppeteer-core';
import {
  parseCouleurCss,
  ratioContraste,
  SEUIL_COMPOSANT,
  SEUIL_TEXTE,
  type RGB,
} from './lib/contraste.js';
import { creerJournal } from './lib/journal-preuve.js';
import { ouvrirNavigateur, seConnecter } from './lib/navigateur.js';
import { choisirProfilCertifie } from './lib/profil-demo.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const RACINE = join(HERE, '../..');

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';
const API_URL = process.env.API_URL ?? 'http://localhost:3000/api';
const COMPTE_RECRUTEUR = process.env.COMPTE_RECRUTEUR ?? 'recruteur@profils-actifs.fr';
const MOT_DE_PASSE = process.env.MOT_DE_PASSE ?? 'Password123!';

const CHEMIN_TXT = join(RACINE, 'docs/preuves/VI-6-contrastes-profil-public.txt');

interface Paire {
  role: string;
  selecteurTexte: string;
  seuil: number;
}

// Un rôle de texte par section réellement affichée sur cette page — pas un
// balayage exhaustif de chaque nœud, un échantillon qui couvre chaque style
// de texte distinct qu'un lecteur y rencontre.
const PAIRES: Paire[] = [
  { role: 'Nom du candidat (h1)', selecteurTexte: 'article.two-col h1', seuil: SEUIL_TEXTE },
  {
    role: 'Accroche du profil',
    selecteurTexte: '.profile-header__headline',
    seuil: SEUIL_TEXTE,
  },
  { role: 'Lien « Retour aux profils »', selecteurTexte: '.back-link', seuil: SEUIL_TEXTE },
  {
    role: 'Titre de section « Vidéo de présentation »',
    selecteurTexte: '#profile-videos-heading',
    seuil: SEUIL_TEXTE,
  },
  { role: 'Nom de compétence', selecteurTexte: '.skill-table__name', seuil: SEUIL_TEXTE },
  { role: 'Niveau de compétence', selecteurTexte: '.skill-table__level', seuil: SEUIL_TEXTE },
  { role: 'Badge de certification', selecteurTexte: '.badge', seuil: SEUIL_TEXTE },
  {
    role: 'Bouton « Contacter »',
    selecteurTexte: 'section[aria-labelledby="profile-contact-heading"] button',
    seuil: SEUIL_TEXTE,
  },
];

interface CouleursMesurees {
  texte: string;
  fond: string;
  contenu: string;
}

/** Reads the element's own text colour, then walks up the DOM until it finds
 *  an ancestor with a non-transparent background — the "effective"
 *  background a reader actually sees behind the text. */
const mesurerPaire = async (page: Page, selecteur: string): Promise<CouleursMesurees | null> =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;

    const texte = getComputedStyle(el).color;

    let noeud: Element | null = el;
    let fond = 'rgba(0, 0, 0, 0)';
    while (noeud) {
      const candidat = getComputedStyle(noeud).backgroundColor;
      if (candidat && candidat !== 'rgba(0, 0, 0, 0)' && candidat !== 'transparent') {
        fond = candidat;
        break;
      }
      noeud = noeud.parentElement;
    }

    return { texte, fond, contenu: (el.textContent ?? '').trim().slice(0, 48) };
  }, selecteur);

// Lire `getPropertyValue('--accent')` renverrait le token littéral
// (`var(--brand-blue)`, potentiellement un hex non normalisé) plutôt que sa
// valeur résolue : on applique la variable à une vraie propriété CSS sur un
// nœud sonde, et c'est `getComputedStyle` sur *cette* propriété qui rend un
// `rgb()` fiable.
const mesurerAccentSur = async (
  page: Page,
  selecteurFond: string,
): Promise<CouleursMesurees | null> =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;

    const sonde = document.createElement('span');
    sonde.style.color = 'var(--accent)';
    document.body.appendChild(sonde);
    const accent = getComputedStyle(sonde).color;
    sonde.remove();

    const fond = getComputedStyle(el).backgroundColor;
    return { texte: accent, fond, contenu: '(anneau de focus, --accent)' };
  }, selecteurFond);

const mesurerSchema = async (
  page: Page,
  journal: ReturnType<typeof creerJournal>,
  nomSchema: string,
): Promise<void> => {
  journal.ligne('');
  journal.ligne(`── ${nomSchema} ${'─'.repeat(Math.max(0, 70 - nomSchema.length))}`);
  journal.ligne(
    'rôle'.padEnd(42) + 'ratio'.padEnd(9) + 'seuil'.padEnd(7) + 'verdict'.padEnd(9) + 'contenu',
  );

  for (const paire of PAIRES) {
    const mesure = await mesurerPaire(page, paire.selecteurTexte);
    if (!mesure) {
      journal.ligne(`${paire.role.padEnd(42)}absent sur cette page (élément non rendu)`);
      continue;
    }

    const [rgbTexte, rgbFond] = [parseCouleurCss(mesure.texte), parseCouleurCss(mesure.fond)];
    if (!rgbTexte || !rgbFond) {
      journal.ligne(
        `${paire.role.padEnd(42)}couleur non résolue (${mesure.texte} / ${mesure.fond})`,
      );
      continue;
    }

    const ratio = ratioContraste(rgbTexte as RGB, rgbFond as RGB);
    const verdict = ratio >= paire.seuil ? 'AA' : 'ÉCHEC';
    journal.ligne(
      paire.role.padEnd(42) +
        `${ratio.toFixed(2)}:1`.padEnd(9) +
        `${paire.seuil}:1`.padEnd(7) +
        verdict.padEnd(9) +
        `« ${mesure.contenu} »`,
    );
  }

  // L'anneau de focus n'est pas du texte : WCAG 1.4.11 (composant non
  // textuel) demande 3:1 contre le fond adjacent, pas 4.5:1.
  for (const [nom, selecteurFond] of [
    ['Anneau de focus sur fond de page', 'body'],
    ['Anneau de focus sur fond de carte', '.card'],
  ] as const) {
    const mesure = await mesurerAccentSur(page, selecteurFond);
    if (!mesure) continue;
    const [rgbTexte, rgbFond] = [parseCouleurCss(mesure.texte), parseCouleurCss(mesure.fond)];
    if (!rgbTexte || !rgbFond) continue;
    const ratio = ratioContraste(rgbTexte as RGB, rgbFond as RGB);
    const verdict = ratio >= SEUIL_COMPOSANT ? 'AA (composant)' : 'ÉCHEC';
    journal.ligne(
      nom.padEnd(42) +
        `${ratio.toFixed(2)}:1`.padEnd(9) +
        `${SEUIL_COMPOSANT}:1`.padEnd(7) +
        verdict,
    );
  }
};

const main = async (): Promise<void> => {
  const journal = creerJournal(RACINE);
  journal.entete('VI-6 (3/3) — paires de contraste mesurées, page profil public (§7.4)', {
    web: WEB_URL,
    compte: `${COMPTE_RECRUTEUR} (vue recruteur, pour que la section Contacter se rende)`,
  });

  const profilCible = await choisirProfilCertifie(API_URL);
  journal.ligne(`profil mesuré : ${profilCible.id} (certifié, vidéo + compétence présentes)`);

  const { browser, page } = await ouvrirNavigateur();

  try {
    await seConnecter(page, WEB_URL, COMPTE_RECRUTEUR, MOT_DE_PASSE);

    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.goto(`${WEB_URL}/profils/${profilCible.id}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('article.two-col h1');
    await mesurerSchema(page, journal, 'thème clair (prefers-color-scheme: light)');

    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('article.two-col h1');
    await mesurerSchema(page, journal, 'thème sombre (prefers-color-scheme: dark)');
  } finally {
    await browser.close();
  }

  journal.ligne('');
  journal.ligne(`fin — ${new Date().toISOString()}`);
  journal.ecrire(CHEMIN_TXT);

  console.log(`Tableau de contrastes écrit dans ${CHEMIN_TXT}`);
};

await main();

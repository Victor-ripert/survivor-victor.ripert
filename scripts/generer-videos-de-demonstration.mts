#!/usr/bin/env -S npx tsx
/**
 * FP-4 — produit les vidéos de démonstration que le seed dépose dans
 * `UPLOAD_DIR`, à la place des clips musicaux commerciaux que le jeu de
 * fixtures embarquait par identifiant YouTube.
 *
 * Ce que cela règle, dans l'ordre de gravité du relevé du 7 septembre :
 * l'usage est licite (nous produisons le fichier), le contenu correspond au
 * titre affiché et à la personne dont c'est la fiche, et chaque vidéo peut
 * porter une piste de sous-titres que notre propre lecteur affiche.
 *
 * Ce que cela ne prétend pas être : un vrai pitch filmé. Chaque carton le dit
 * à l'écran et dans ses sous-titres. Une vidéo de démonstration qui s'annonce
 * comme telle vaut mieux qu'un clip commercial sous un titre de candidat.
 *
 * La source de vérité reste `applicants.ts` : ce script itère les fixtures et
 * ne produit que les `basename` qu'elles déclarent, si bien qu'ajouter un
 * candidat avec une vidéo hébergée suffit à le faire entrer ici.
 *
 *   npx tsx scripts/generer-videos-de-demonstration.mts          # ce qui manque
 *   npx tsx scripts/generer-videos-de-demonstration.mts --force  # tout refaire
 *
 * `--force` réécrit aussi `presentation-leila-sassi`, qui est un vrai
 * enregistrement de l'équipe et non un carton : ne l'employer qu'en sachant
 * qu'il faudra le restaurer depuis git.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applicants } from '../packages/db/src/seed-data/applicants.js';

const MEDIA_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../packages/db/src/seed-data/media',
);

/** Bleu institutionnel du Ministère (charte du 3 septembre, `--brand-blue`).
 *  Sur ce fond, le blanc mesure 10,4:1 — au-delà du 4,5:1 exigé. */
const GROUND = '#1B3A6B';
const DURATION_SECONDS = 12;

/** Le carton reste lisible sans la police de titre : Marianne n'est pas
 *  versionnée (`packages/web/FONTS.md`), et un rendu vidéo ne peut pas se
 *  permettre de dépendre d'un fichier absent. */
const FONT_CANDIDATES = [
  '/usr/share/fonts/dejavu-sans-fonts/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/TTF/DejaVuSans.ttf',
  '/System/Library/Fonts/Supplemental/Arial.ttf',
];

const resolveFont = (): string => {
  const found = FONT_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      `Aucune police trouvée parmi :\n  ${FONT_CANDIDATES.join('\n  ')}\n` +
        'Installer dejavu-sans-fonts, ou ajouter un chemin à FONT_CANDIDATES.',
    );
  }
  return found;
};

type Card = { at: number; until: number; lines: string[]; spoken: string };

/** Les trois cartons, et la phrase que les sous-titres portent pour chacun.
 *  Les sous-titres transcrivent ce qui est à l'écran : la vidéo est muette,
 *  et une piste qui annoncerait une parole inexistante serait un mensonge
 *  d'accessibilité de plus, pas une conformité. */
const cardsFor = (
  name: string,
  headline: string,
  sector: string,
  location: string,
  title: string,
): Card[] => [
  { at: 0, until: 4, lines: [name, headline], spoken: `${name} — ${headline}` },
  { at: 4, until: 8, lines: [sector, location], spoken: `${sector}, ${location}` },
  {
    at: 8,
    until: DURATION_SECONDS,
    lines: [title, 'Vidéo de démonstration ProfilsActifs'],
    spoken: `${title}. Vidéo de démonstration ProfilsActifs.`,
  },
];

/** `drawtext` lit `:` comme séparateur d'options et `'` comme fin de valeur. */
const escapeForDrawtext = (text: string): string =>
  text.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, '\u2019');

const timestamp = (seconds: number): string => {
  const whole = Math.floor(seconds);
  const mm = String(Math.floor(whole / 60)).padStart(2, '0');
  const ss = String(whole % 60).padStart(2, '0');
  return `00:${mm}:${ss}.000`;
};

const buildFilter = (cards: Card[], font: string): string =>
  cards
    .flatMap((card) =>
      card.lines.map((line, lineIndex) => {
        const y = lineIndex === 0 ? 'h/2-42' : 'h/2+18';
        const size = lineIndex === 0 ? 34 : 22;
        const alpha = lineIndex === 0 ? 1 : 0.85;
        return [
          `drawtext=fontfile='${font}'`,
          `text='${escapeForDrawtext(line)}'`,
          `fontcolor=white@${alpha}`,
          `fontsize=${size}`,
          'x=(w-text_w)/2',
          `y=${y}`,
          `enable='between(t,${card.at},${card.until})'`,
        ].join(':');
      }),
    )
    .join(',');

const renderVideo = (basename: string, cards: Card[], font: string): void => {
  const output = path.join(MEDIA_DIR, `${basename}.mp4`);
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      `color=c=${GROUND}:s=640x360:d=${DURATION_SECONDS}:r=25`,
      '-f',
      'lavfi',
      '-i',
      `anullsrc=r=44100:cl=mono:d=${DURATION_SECONDS}`,
      '-vf',
      buildFilter(cards, font),
      '-c:v',
      'libx264',
      '-profile:v',
      'baseline',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-shortest',
      '-movflags',
      '+faststart',
      output,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
};

const renderCaptions = (basename: string, cards: Card[]): void => {
  const cues = cards
    .map(
      (card, index) =>
        `${index + 1}\n${timestamp(card.at)} --> ${timestamp(card.until)}\n${card.spoken}`,
    )
    .join('\n\n');
  writeFileSync(
    path.join(MEDIA_DIR, `${basename}.fr.vtt`),
    `WEBVTT\nKind: captions\nLanguage: fr\n\n${cues}\n`,
  );
};

const force = process.argv.includes('--force');
const font = resolveFont();
let written = 0;
let skipped = 0;

for (const applicant of applicants) {
  for (const video of applicant.videos) {
    if (video.kind !== 'upload') continue;

    const name = `${applicant.firstName} ${applicant.lastName}`;
    if (!force && existsSync(path.join(MEDIA_DIR, `${video.basename}.mp4`))) {
      console.log(`  = ${video.basename} (déjà présent)`);
      skipped += 1;
      continue;
    }

    const cards = cardsFor(
      name,
      applicant.headline,
      applicant.sector,
      applicant.location,
      video.title,
    );
    renderVideo(video.basename, cards, font);
    renderCaptions(video.basename, cards);
    console.log(`  + ${video.basename} — ${name}, ${DURATION_SECONDS} s`);
    written += 1;
  }
}

console.log(`\n${written} vidéo(s) produite(s), ${skipped} conservée(s), dans ${MEDIA_DIR}`);
console.log('Rejouer `npm run db:seed` pour les déposer dans UPLOAD_DIR.');

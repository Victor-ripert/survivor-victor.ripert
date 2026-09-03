/**
 * Transcript writer shared by the browser-driven proof scripts (the .ts
 * equivalent of lib/preuve-http.sh's `journal`, for scripts that drive
 * Puppeteer instead of curl). Pulled out here rather than left inline —
 * video-embed-capture.mts (VI-4) wrote its own copy of this first; this is
 * the same shape, so anything after VI-4 imports it instead of re-deriving
 * a header banner and a poll-until-true loop a third time.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const infosGit = (racine: string): { commit: string; branche: string } => {
  const git = (args: string[]): string =>
    execFileSync('git', ['-C', racine, ...args], { encoding: 'utf8' }).trim();

  return {
    commit: git(['rev-parse', 'HEAD']),
    branche: git(['rev-parse', '--abbrev-ref', 'HEAD']),
  };
};

export interface Journal {
  /** Appends one line to the transcript. */
  ligne(texte: string): void;
  /** The banner every transcript opens with: title, date, commit, branch,
   *  then one line per extra key/value the caller wants recorded (URL,
   *  compte, etc.) — order preserved, printed as given. */
  entete(titre: string, contexte?: Record<string, string>): void;
  /** Writes the accumulated transcript to disk, creating the parent
   *  directory if needed. */
  ecrire(cheminTxt: string): void;
}

export const creerJournal = (racine: string): Journal => {
  const lignes: string[] = [];

  return {
    ligne(texte) {
      lignes.push(texte);
    },
    entete(titre, contexte = {}) {
      const { commit, branche } = infosGit(racine);
      lignes.push(titre, 'ProfilsActifs — JEB/DNI/2026-003', '');
      lignes.push(`date        : ${new Date().toISOString()}`);
      lignes.push(`commit      : ${commit}`);
      lignes.push(`branche     : ${branche}`);
      for (const [cle, valeur] of Object.entries(contexte)) {
        lignes.push(`${cle.padEnd(12)}: ${valeur}`);
      }
      lignes.push('');
    },
    ecrire(cheminTxt) {
      mkdirSync(dirname(cheminTxt), { recursive: true });
      writeFileSync(cheminTxt, `${lignes.join('\n')}\n`);
    },
  };
};

/** Polls `condition` until it resolves true, or throws after `delaiMs`. Used
 *  instead of a fixed sleep for anything the DOM will confirm on its own
 *  (a card appearing, an iframe mounting) — see the caller's own comments
 *  for the one place a fixed delay is still needed (letting an iframe's
 *  cross-origin content actually paint after it mounts). */
export const attendreQue = async (
  condition: () => Promise<boolean>,
  description: string,
  delaiMs = 5000,
): Promise<void> => {
  const echeance = Date.now() + delaiMs;
  while (Date.now() < echeance) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`délai dépassé en attendant : ${description}`);
};

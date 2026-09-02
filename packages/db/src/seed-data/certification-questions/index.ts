import { communicationQuestions } from './communication.js';
import { organisationQuestions } from './organisation.js';
import { adaptabiliteQuestions } from './adaptabilite.js';
import { travailEquipeQuestions } from './travail-equipe.js';
import { resolutionProblemesQuestions } from './resolution-problemes.js';
import { autonomieQuestions } from './autonomie.js';
import { gestionStressQuestions } from './gestion-stress.js';
import { fiabiliteQuestions } from './fiabilite.js';
import { apprentissageQuestions } from './apprentissage.js';
import { leadershipQuestions } from './leadership.js';

export type { CertificationQuestionSeed, CertificationOptionSeed } from './types.js';

// 100 questions across 10 transversal aptitudes, 10 questions each (4
// MULTIPLE_CHOICE, 2 CHECKBOX, 2 LIKERT_SCALE, 2 SHORT_TEXT per aptitude).
// One file per aptitude keeps this reviewable — a 2500-line single file
// wasn't going to hold up to review or to merge conflicts between teammates.
export const certificationQuestions = [
  ...communicationQuestions,
  ...organisationQuestions,
  ...adaptabiliteQuestions,
  ...travailEquipeQuestions,
  ...resolutionProblemesQuestions,
  ...autonomieQuestions,
  ...gestionStressQuestions,
  ...fiabiliteQuestions,
  ...apprentissageQuestions,
  ...leadershipQuestions,
];

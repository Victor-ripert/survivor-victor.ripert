import type { QuestionType } from '@prisma/client';

interface CertificationOptionSeed {
  id: string;
  text: string;
  points: number;
  order: number;
}

interface CertificationQuestionSeed {
  id: string;
  order: number;
  type: QuestionType;
  text: string;
  description?: string;
  weight: number;
  maxPoints: number;
  options?: CertificationOptionSeed[];
}

// 15 questions covering the three transversal aptitudes named in the brief
// (communication, organisation, adaptabilité), five per aptitude, exercising
// all four QuestionType variants. Ids are deterministic (not cuid) so the
// seed can upsert instead of duplicating rows on every re-run.
export const certificationQuestions: CertificationQuestionSeed[] = [
  // ---- Communication ----
  {
    id: 'q-comm-mc-1',
    order: 1,
    type: 'MULTIPLE_CHOICE',
    text: "Un collègue ne comprend pas une consigne que vous lui avez donnée à l'oral. Que faites-vous ?",
    weight: 2,
    maxPoints: 10,
    options: [
      { id: 'q-comm-mc-1-opt-1', text: 'Je répète la même consigne, plus fort', points: 2, order: 1 },
      { id: 'q-comm-mc-1-opt-2', text: "Je le laisse se débrouiller, ce n'est pas mon rôle", points: 0, order: 2 },
      {
        id: 'q-comm-mc-1-opt-3',
        text: 'Je reformule avec un exemple concret et je vérifie sa compréhension',
        points: 10,
        order: 3,
      },
      { id: 'q-comm-mc-1-opt-4', text: 'Je lui demande de se référer à la documentation', points: 5, order: 4 },
    ],
  },
  {
    id: 'q-comm-mc-2',
    order: 2,
    type: 'MULTIPLE_CHOICE',
    text: "Lors d'une réunion, vous n'êtes pas d'accord avec une décision prise par votre manager. Que faites-vous ?",
    weight: 1,
    maxPoints: 10,
    options: [
      {
        id: 'q-comm-mc-2-opt-1',
        text: 'Je me tais pour éviter le conflit, même si cela pose problème',
        points: 2,
        order: 1,
      },
      {
        id: 'q-comm-mc-2-opt-2',
        text: "J'exprime mon désaccord de façon argumentée, au bon moment",
        points: 10,
        order: 2,
      },
      {
        id: 'q-comm-mc-2-opt-3',
        text: 'Je critique la décision devant les autres collègues après coup',
        points: 0,
        order: 3,
      },
      { id: 'q-comm-mc-2-opt-4', text: "J'applique la décision sans donner mon avis", points: 4, order: 4 },
    ],
  },
  {
    id: 'q-comm-checkbox-1',
    order: 3,
    type: 'CHECKBOX',
    text: "Parmi ces pratiques, lesquelles utilisez-vous pour vous assurer d'être bien compris ?",
    weight: 2,
    maxPoints: 10,
    options: [
      { id: 'q-comm-checkbox-1-opt-1', text: 'Je reformule ce que l’on me répond pour vérifier', points: 4, order: 1 },
      { id: 'q-comm-checkbox-1-opt-2', text: 'Je pose des questions ouvertes', points: 3, order: 2 },
      { id: 'q-comm-checkbox-1-opt-3', text: "Je varie mon vocabulaire selon mon interlocuteur", points: 3, order: 3 },
      { id: 'q-comm-checkbox-1-opt-4', text: 'Je parle plus fort si on ne comprend pas', points: 0, order: 4 },
    ],
  },
  {
    id: 'q-comm-likert-1',
    order: 4,
    type: 'LIKERT_SCALE',
    text: 'Je me sens à l’aise pour présenter mes idées devant un groupe.',
    description: "Répondez sur une échelle de 1 (pas du tout d'accord) à 5 (tout à fait d'accord).",
    weight: 1,
    maxPoints: 10,
  },
  {
    id: 'q-comm-text-1',
    order: 5,
    type: 'SHORT_TEXT',
    text: "Décrivez en quelques lignes une situation où vous avez dû expliquer une idée complexe à quelqu'un qui n'y connaissait rien.",
    weight: 1,
    maxPoints: 5,
  },

  // ---- Organisation ----
  {
    id: 'q-org-mc-1',
    order: 6,
    type: 'MULTIPLE_CHOICE',
    text: 'Vous avez trois tâches urgentes à rendre le même jour. Comment procédez-vous ?',
    weight: 2,
    maxPoints: 10,
    options: [
      { id: 'q-org-mc-1-opt-1', text: 'Je les traite dans l’ordre où elles sont arrivées', points: 3, order: 1 },
      { id: 'q-org-mc-1-opt-2', text: 'Je panique et je commence plusieurs tâches en même temps', points: 0, order: 2 },
      {
        id: 'q-org-mc-1-opt-3',
        text: "J'évalue l'impact et le délai de chacune puis je priorise",
        points: 10,
        order: 3,
      },
      { id: 'q-org-mc-1-opt-4', text: 'Je demande à quelqu’un d’autre de choisir pour moi', points: 1, order: 4 },
    ],
  },
  {
    id: 'q-org-mc-2',
    order: 7,
    type: 'MULTIPLE_CHOICE',
    text: "Vous réalisez à mi-parcours qu'un projet prendra plus de temps que prévu. Que faites-vous ?",
    weight: 1,
    maxPoints: 10,
    options: [
      { id: 'q-org-mc-2-opt-1', text: 'Je continue sans rien dire, en espérant rattraper le retard', points: 1, order: 1 },
      {
        id: 'q-org-mc-2-opt-2',
        text: "J'informe les parties concernées le plus tôt possible avec un nouveau délai réaliste",
        points: 10,
        order: 2,
      },
      {
        id: 'q-org-mc-2-opt-3',
        text: 'J’accélère en réduisant la qualité du travail sans le signaler',
        points: 0,
        order: 3,
      },
      { id: 'q-org-mc-2-opt-4', text: "J'attends la deadline pour voir si ça passe", points: 2, order: 4 },
    ],
  },
  {
    id: 'q-org-checkbox-1',
    order: 8,
    type: 'CHECKBOX',
    text: 'Quels outils ou méthodes utilisez-vous pour organiser votre travail ?',
    weight: 2,
    maxPoints: 10,
    options: [
      { id: 'q-org-checkbox-1-opt-1', text: 'Une liste de tâches priorisée', points: 4, order: 1 },
      { id: 'q-org-checkbox-1-opt-2', text: 'Un agenda ou calendrier partagé', points: 3, order: 2 },
      { id: 'q-org-checkbox-1-opt-3', text: 'Des rappels informels dans ma tête', points: 0, order: 3 },
      { id: 'q-org-checkbox-1-opt-4', text: 'Un découpage en petites étapes mesurables', points: 3, order: 4 },
    ],
  },
  {
    id: 'q-org-likert-1',
    order: 9,
    type: 'LIKERT_SCALE',
    text: 'Je respecte systématiquement les délais qui me sont fixés.',
    description: "Répondez sur une échelle de 1 (pas du tout d'accord) à 5 (tout à fait d'accord).",
    weight: 1,
    maxPoints: 10,
  },
  {
    id: 'q-org-text-1',
    order: 10,
    type: 'SHORT_TEXT',
    text: 'Racontez une situation où une bonne organisation vous a permis d’éviter un problème.',
    weight: 1,
    maxPoints: 5,
  },

  // ---- Adaptabilité ----
  {
    id: 'q-adapt-mc-1',
    order: 11,
    type: 'MULTIPLE_CHOICE',
    text: 'Votre mission change complètement à la dernière minute. Quelle est votre première réaction ?',
    weight: 2,
    maxPoints: 10,
    options: [
      { id: 'q-adapt-mc-1-opt-1', text: 'Je refuse le changement, le plan initial était validé', points: 0, order: 1 },
      {
        id: 'q-adapt-mc-1-opt-2',
        text: "Je m'adapte en identifiant ce qui reste utilisable du travail déjà fait",
        points: 10,
        order: 2,
      },
      { id: 'q-adapt-mc-1-opt-3', text: 'Je suis le changement sans poser de questions', points: 4, order: 3 },
      { id: 'q-adapt-mc-1-opt-4', text: 'Je repousse la décision au maximum', points: 1, order: 4 },
    ],
  },
  {
    id: 'q-adapt-mc-2',
    order: 12,
    type: 'MULTIPLE_CHOICE',
    text: 'On vous confie une tâche en dehors de votre domaine de compétence habituel. Comment réagissez-vous ?',
    weight: 1,
    maxPoints: 10,
    options: [
      { id: 'q-adapt-mc-2-opt-1', text: "Je refuse, ce n'est pas mon métier", points: 0, order: 1 },
      {
        id: 'q-adapt-mc-2-opt-2',
        text: 'Je l’accepte et je me forme rapidement sur ce qu’il me manque',
        points: 10,
        order: 2,
      },
      { id: 'q-adapt-mc-2-opt-3', text: "J'accepte mais je fais le strict minimum", points: 3, order: 3 },
      { id: 'q-adapt-mc-2-opt-4', text: 'Je délègue systématiquement à quelqu’un d’autre', points: 2, order: 4 },
    ],
  },
  {
    id: 'q-adapt-checkbox-1',
    order: 13,
    type: 'CHECKBOX',
    text: "Face à un changement inattendu dans votre environnement de travail, lesquelles de ces attitudes vous ressemblent ?",
    weight: 2,
    maxPoints: 10,
    options: [
      { id: 'q-adapt-checkbox-1-opt-1', text: 'Je cherche à comprendre les raisons du changement', points: 3, order: 1 },
      {
        id: 'q-adapt-checkbox-1-opt-2',
        text: 'Je m’informe rapidement sur les nouveaux outils ou process',
        points: 4,
        order: 2,
      },
      {
        id: 'q-adapt-checkbox-1-opt-3',
        text: "J'exprime mes inquiétudes de façon constructive si besoin",
        points: 3,
        order: 3,
      },
      { id: 'q-adapt-checkbox-1-opt-4', text: "Je considère que ce n'est pas mon problème", points: 0, order: 4 },
    ],
  },
  {
    id: 'q-adapt-likert-1',
    order: 14,
    type: 'LIKERT_SCALE',
    text: "Je m'adapte facilement à un changement d'environnement ou d'équipe de travail.",
    description: "Répondez sur une échelle de 1 (pas du tout d'accord) à 5 (tout à fait d'accord).",
    weight: 1,
    maxPoints: 10,
  },
  {
    id: 'q-adapt-text-1',
    order: 15,
    type: 'SHORT_TEXT',
    text: 'Décrivez une situation professionnelle ou personnelle où vous avez dû vous adapter rapidement à un imprévu.',
    weight: 1,
    maxPoints: 5,
  },
];

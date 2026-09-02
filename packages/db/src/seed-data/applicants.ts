import { CertificationStatus, ModerationStatus, SkillLevel } from '@prisma/client';

export interface ApplicantSeed {
  firstName: string;
  lastName: string;
  headline: string;
  bio: string;
  location: string;
  sector: string;
  skills: [string, SkillLevel][];
  certificationStatus: CertificationStatus;
  /** Kept consistent with the bands in `certification-levels.ts`: a fixture
   *  whose score and badge disagree would make the catalogue lie. */
  certificationScore?: number;
  certificationBadge?: string;
  moderationStatus: ModerationStatus;
  videos: { title: string; url: string; duration: number }[];
}

const video = (title: string, id: string, duration: number) => ({
  title,
  url: `https://www.youtube.com/embed/${id}`,
  duration,
});

export const applicants: ApplicantSeed[] = [
  {
    firstName: 'Amina',
    lastName: 'Berthier',
    headline: 'Développeuse front-end React',
    bio: "Trois ans d'alternance en agence, à la recherche d'un premier CDI.",
    location: 'Lyon',
    sector: 'Informatique',
    skills: [
      ['React', SkillLevel.ADVANCED],
      ['TypeScript', SkillLevel.INTERMEDIATE],
      ['Design UI', SkillLevel.INTERMEDIATE],
    ],
    certificationStatus: CertificationStatus.COMPLETED,
    certificationScore: 93,
    certificationBadge: 'Certifié JEB Expert',
    moderationStatus: ModerationStatus.APPROVED,
    videos: [video('Présentation en 90 secondes', 'dQw4w9WgXcQ', 92)],
  },
  {
    firstName: 'Marc',
    lastName: 'Delaunay',
    headline: 'Technicien de maintenance industrielle',
    bio: 'Quinze ans en maintenance de lignes de production, habilitations électriques à jour.',
    location: 'Lille',
    sector: 'Industrie',
    skills: [
      ['Électricité', SkillLevel.EXPERT],
      ['Soudure', SkillLevel.ADVANCED],
    ],
    certificationStatus: CertificationStatus.COMPLETED,
    certificationScore: 74,
    certificationBadge: 'Certifié JEB Confirmé',
    moderationStatus: ModerationStatus.APPROVED,
    videos: [video('Mon parcours en atelier', 'ScMzIvxBSi4', 120)],
  },
  {
    firstName: 'Sofia',
    lastName: 'Nguyen',
    headline: 'Chargée de gestion administrative',
    bio: "Reconversion après dix ans dans l'hôtellerie, formée en comptabilité générale.",
    location: 'Marseille',
    sector: 'Administration',
    skills: [
      ['Comptabilité', SkillLevel.INTERMEDIATE],
      ['Relation client', SkillLevel.ADVANCED],
      ['Anglais', SkillLevel.INTERMEDIATE],
    ],
    certificationStatus: CertificationStatus.COMPLETED,
    certificationScore: 68,
    certificationBadge: 'Certifié JEB',
    moderationStatus: ModerationStatus.APPROVED,
    videos: [video('Pourquoi la reconversion', 'aqz-KE-bpKQ', 105)],
  },
  {
    firstName: 'Yanis',
    lastName: 'Oubrahim',
    headline: 'Développeur back-end Node.js',
    bio: 'Autodidacte, deux projets open source en production, disponible immédiatement.',
    location: 'Lyon',
    sector: 'Informatique',
    skills: [
      ['Node.js', SkillLevel.ADVANCED],
      ['SQL', SkillLevel.INTERMEDIATE],
      ['TypeScript', SkillLevel.ADVANCED],
    ],
    certificationStatus: CertificationStatus.IN_PROGRESS,
    moderationStatus: ModerationStatus.APPROVED,
    videos: [video('Démonstration de projet', 'ZXsQAXx_ao0', 140)],
  },
  {
    firstName: 'Claire',
    lastName: 'Fontaine',
    headline: 'Cheffe de projet junior',
    bio: 'Master en management de projet, expérience associative en coordination.',
    location: 'Paris',
    sector: 'Gestion de projet',
    skills: [
      ['Gestion de projet', SkillLevel.INTERMEDIATE],
      ['Anglais', SkillLevel.ADVANCED],
    ],
    certificationStatus: CertificationStatus.COMPLETED,
    certificationScore: 57,
    certificationBadge: 'Certifié JEB',
    moderationStatus: ModerationStatus.APPROVED,
    videos: [],
  },
  {
    firstName: 'Idriss',
    lastName: 'Kamara',
    headline: 'Préparateur de commandes CACES 1-3-5',
    bio: 'Expérience en entrepôt frigorifique, permis cariste à jour.',
    location: 'Rennes',
    sector: 'Logistique',
    skills: [['Logistique', SkillLevel.ADVANCED]],
    certificationStatus: CertificationStatus.PENDING,
    moderationStatus: ModerationStatus.PENDING,
    videos: [video('Mon expérience en entrepôt', 'kJQP7kiw5Fk', 88)],
  },
  {
    firstName: 'Élise',
    lastName: 'Marchand',
    headline: 'Cheffe de partie',
    bio: 'Cuisine de brasserie et restauration collective, sept ans de métier.',
    location: 'Bordeaux',
    sector: 'Restauration',
    skills: [
      ['Cuisine', SkillLevel.EXPERT],
      ['Relation client', SkillLevel.INTERMEDIATE],
    ],
    certificationStatus: CertificationStatus.COMPLETED,
    certificationScore: 81,
    certificationBadge: 'Certifié JEB Confirmé',
    moderationStatus: ModerationStatus.APPROVED,
    videos: [video('En cuisine avec Élise', 'e-ORhEE9VVg', 110)],
  },
  {
    firstName: 'Thomas',
    lastName: 'Rivière',
    headline: 'Analyste de données junior',
    bio: 'Reconversion via une formation intensive en data, à l’aise en SQL et Python.',
    location: 'Nantes',
    sector: 'Informatique',
    skills: [
      ['Python', SkillLevel.INTERMEDIATE],
      ['SQL', SkillLevel.ADVANCED],
    ],
    certificationStatus: CertificationStatus.COMPLETED,
    certificationScore: 63,
    certificationBadge: 'Certifié JEB',
    moderationStatus: ModerationStatus.APPROVED,
    videos: [video('Mon projet de fin de formation', 'RgKAFK5djSk', 130)],
  },
  {
    firstName: 'Nadia',
    lastName: 'Lefèvre',
    headline: 'Rédactrice web SEO',
    bio: 'Freelance pendant quatre ans, cherche un poste salarié en interne.',
    location: 'Paris',
    sector: 'Communication',
    skills: [
      ['Rédaction web', SkillLevel.EXPERT],
      ['Anglais', SkillLevel.ADVANCED],
    ],
    certificationStatus: CertificationStatus.IN_PROGRESS,
    moderationStatus: ModerationStatus.APPROVED,
    videos: [],
  },
  {
    firstName: 'Bastien',
    lastName: 'Colin',
    headline: 'Conseiller clientèle',
    bio: 'Cinq ans en centre de relation client, formé aux outils CRM.',
    location: 'Marseille',
    sector: 'Relation client',
    skills: [
      ['Relation client', SkillLevel.EXPERT],
      ['Anglais', SkillLevel.INTERMEDIATE],
    ],
    certificationStatus: CertificationStatus.PENDING,
    moderationStatus: ModerationStatus.APPROVED,
    videos: [video('Ma manière de gérer un litige', 'CevxZvSJLk8', 95)],
  },
  {
    firstName: 'Leïla',
    lastName: 'Sassi',
    headline: 'Designer UI junior',
    bio: 'Portfolio orienté accessibilité, formée en design de services publics.',
    location: 'Lyon',
    sector: 'Design',
    skills: [
      ['Design UI', SkillLevel.ADVANCED],
      ['React', SkillLevel.BEGINNER],
    ],
    certificationStatus: CertificationStatus.COMPLETED,
    certificationScore: 79,
    certificationBadge: 'Certifié JEB Confirmé',
    moderationStatus: ModerationStatus.APPROVED,
    videos: [video('Refonte accessible', 'YykjpeuMNEk', 118)],
  },
  {
    firstName: 'Hugo',
    lastName: 'Ferrand',
    headline: 'Profil retiré par la modération',
    bio: 'Contenu signalé, conservé pour illustrer le filtrage côté recruteur.',
    location: 'Toulouse',
    sector: 'Industrie',
    skills: [['Soudure', SkillLevel.BEGINNER]],
    certificationStatus: CertificationStatus.REJECTED,
    moderationStatus: ModerationStatus.REJECTED,
    videos: [],
  },
];

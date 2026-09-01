import { PrismaPg } from '@prisma/adapter-pg';
import {
  CertificationStatus,
  InteractionType,
  ModerationStatus,
  PrismaClient,
  SkillLevel,
  UserRole,
  VideoType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { loadRepoEnv } from './load-env.js';

loadRepoEnv();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Every demo account shares this password; it never leaves local fixtures. */
const DEMO_PASSWORD = 'Password123!';
const SALT_ROUNDS = 12;

const CERTIFICATION_LEVELS = [
  { name: 'Bronze JEB', minScore: 50, maxScore: 64, order: 1 },
  { name: 'Argent JEB', minScore: 65, maxScore: 79, order: 2 },
  { name: 'Or JEB', minScore: 80, maxScore: 100, order: 3 },
];

const SKILLS = [
  'React',
  'TypeScript',
  'Node.js',
  'Python',
  'SQL',
  'Comptabilité',
  'Gestion de projet',
  'Relation client',
  'Logistique',
  'Soudure',
  'Électricité',
  'Cuisine',
  'Anglais',
  'Design UI',
  'Rédaction web',
];

interface ApplicantSeed {
  firstName: string;
  lastName: string;
  headline: string;
  bio: string;
  location: string;
  sector: string;
  skills: [string, SkillLevel][];
  certificationStatus: CertificationStatus;
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

const APPLICANTS: ApplicantSeed[] = [
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
    certificationScore: 86,
    certificationBadge: 'Or JEB',
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
    certificationBadge: 'Argent JEB',
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
    certificationBadge: 'Argent JEB',
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
    certificationBadge: 'Bronze JEB',
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
    certificationBadge: 'Or JEB',
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
    certificationBadge: 'Bronze JEB',
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
    certificationBadge: 'Argent JEB',
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

const emailFor = (firstName: string, lastName: string): string =>
  `${firstName}.${lastName}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z.]/g, '')
    .toLowerCase() + '@example.fr';

const upsertUser = async (
  email: string,
  firstName: string,
  lastName: string,
  role: UserRole,
  passwordHash: string,
) =>
  prisma.user.upsert({
    where: { email },
    update: { firstName, lastName, role },
    create: { email, firstName, lastName, role, passwordHash },
    select: { id: true, email: true },
  });

const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const seedApplicant = async (applicant: ApplicantSeed, passwordHash: string) => {
  const email = emailFor(applicant.firstName, applicant.lastName);
  const user = await upsertUser(
    email,
    applicant.firstName,
    applicant.lastName,
    UserRole.APPLICANT,
    passwordHash,
  );

  const profileData = {
    headline: applicant.headline,
    bio: applicant.bio,
    location: applicant.location,
    sector: applicant.sector,
    certificationStatus: applicant.certificationStatus,
    certificationScore: applicant.certificationScore ?? null,
    certificationBadge: applicant.certificationBadge ?? null,
    moderationStatus: applicant.moderationStatus,
  };

  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    update: profileData,
    create: { userId: user.id, ...profileData },
    select: { id: true },
  });

  await prisma.profileSkill.deleteMany({ where: { profileId: profile.id } });
  for (const [name, level] of applicant.skills) {
    const skill = await prisma.skill.findUniqueOrThrow({ where: { name } });
    await prisma.profileSkill.create({
      data: { profileId: profile.id, skillId: skill.id, level },
    });
  }

  await prisma.video.deleteMany({ where: { profileId: profile.id } });
  for (const entry of applicant.videos) {
    await prisma.video.create({
      data: {
        profileId: profile.id,
        title: entry.title,
        type: VideoType.EXTERNAL_LINK,
        url: entry.url,
        duration: entry.duration,
        moderationStatus: applicant.moderationStatus,
      },
    });
  }

  return user;
};

/** Spread over the trend window so the dashboards render a real curve rather
 *  than a single spike on the seeding day. */
const seedInteractions = async (recruiterId: string, applicantIds: string[]): Promise<void> => {
  await prisma.notification.deleteMany({ where: { interaction: { createdById: recruiterId } } });
  await prisma.interaction.deleteMany({ where: { createdById: recruiterId } });

  const plan = [
    { type: InteractionType.VIEW, applicant: 0, days: 26 },
    { type: InteractionType.VIEW, applicant: 1, days: 22 },
    { type: InteractionType.VIEW, applicant: 2, days: 18 },
    { type: InteractionType.VIEW, applicant: 4, days: 12 },
    { type: InteractionType.VIEW, applicant: 6, days: 9 },
    { type: InteractionType.VIEW, applicant: 7, days: 4 },
    { type: InteractionType.FAVORITE, applicant: 0, days: 25 },
    { type: InteractionType.FAVORITE, applicant: 6, days: 8 },
    { type: InteractionType.FAVORITE, applicant: 10, days: 3 },
    { type: InteractionType.CONTACT, applicant: 0, days: 24 },
    { type: InteractionType.CONTACT, applicant: 2, days: 17 },
    { type: InteractionType.CONTACT, applicant: 6, days: 7 },
    { type: InteractionType.MESSAGE, applicant: 0, days: 2 },
  ];

  for (const entry of plan) {
    const recipientId = applicantIds[entry.applicant];
    if (!recipientId) continue;

    const isMessage =
      entry.type === InteractionType.CONTACT || entry.type === InteractionType.MESSAGE;

    const interaction = await prisma.interaction.create({
      data: {
        createdById: recruiterId,
        recipientId,
        type: entry.type,
        isFavorite: entry.type === InteractionType.FAVORITE,
        message: isMessage
          ? 'Bonjour, votre profil correspond à un poste que nous ouvrons. Seriez-vous disponible pour un échange ?'
          : null,
        createdAt: daysAgo(entry.days),
      },
      select: { id: true },
    });

    if (isMessage) {
      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: 'NEW_INTERACTION_RECEIVED',
          title: 'Nouveau message de recruteur',
          message: 'Camille Duarte souhaite échanger avec vous.',
          interactionId: interaction.id,
          createdAt: daysAgo(entry.days),
        },
      });
    }
  }
};

const main = async (): Promise<void> => {
  // These are demo fixtures with a published password, including an admin
  // account: running them against a production database would hand over the
  // back office.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Le seed de démonstration ne doit pas être exécuté en production');
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

  for (const level of CERTIFICATION_LEVELS) {
    await prisma.certificationLevel.upsert({
      where: { name: level.name },
      update: level,
      create: level,
    });
  }

  for (const name of SKILLS) {
    await prisma.skill.upsert({ where: { name }, update: {}, create: { name } });
  }

  const admin = await upsertUser(
    'admin@profils-actifs.fr',
    'Awa',
    'Traoré',
    UserRole.ADMIN,
    passwordHash,
  );
  const recruiter = await upsertUser(
    'recruteur@profils-actifs.fr',
    'Camille',
    'Duarte',
    UserRole.RECRUITER,
    passwordHash,
  );
  const secondRecruiter = await upsertUser(
    'recruteur2@profils-actifs.fr',
    'Paul',
    'Ngoma',
    UserRole.RECRUITER,
    passwordHash,
  );

  const applicants = [];
  for (const applicant of APPLICANTS) {
    applicants.push(await seedApplicant(applicant, passwordHash));
  }

  await seedInteractions(
    recruiter.id,
    applicants.map((entry) => entry.id),
  );

  console.log('Seed terminé.');
  console.table([
    { role: 'ADMIN', email: admin.email },
    { role: 'RECRUITER', email: recruiter.email },
    { role: 'RECRUITER', email: secondRecruiter.email },
    { role: 'APPLICANT', email: `${applicants.length} comptes, ex. ${applicants[0]?.email}` },
  ]);
  console.log(`Mot de passe commun : ${DEMO_PASSWORD}`);
};

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

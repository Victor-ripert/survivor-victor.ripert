import { CertificationStatus, ModerationStatus, SkillLevel } from '@prisma/client';

export interface ApplicantSeed {
  firstName: string;
  lastName: string;
  /** ISO date. Every demo account carries one (brief §7.9.1 names the seed
   *  accounts explicitly); exactly one fixture is a minor, to show that a
   *  16-18 profile stays out of the public feed. */
  birthDate: string;
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
  videos: VideoSeed[];
}

/** A YouTube/Vimeo embed: nothing of it is stored here, and no caption track
 *  can be attached to it from outside the third party's own player. */
export interface EmbeddedVideoSeed {
  kind: 'embed';
  title: string;
  url: string;
  duration: number;
}

/**
 * A video ProfilsActifs hosts itself. The seed copies `basename`.mp4 and
 * `basename`.fr.vtt out of `seed-data/media/` into `UPLOAD_DIR` under
 * `storedName`, so a clean build has a real file on disk to play, to caption,
 * and — the point of the exercise — to watch disappear when consent is
 * revoked.
 */
export interface UploadedVideoSeed {
  kind: 'upload';
  title: string;
  basename: string;
  /** A fixed uuid rather than a fresh one, so re-seeding overwrites the same
   *  two files instead of littering the directory, and so a proof capture
   *  taken last week still names the file the reviewer will see. Shaped like
   *  what the local `VideoProvider`'s `store()` generates
   *  (`packages/api/src/services/video-providers/local.ts`): the name must
   *  not be guessable from the candidate's identity. */
  storedName: string;
  duration: number;
}

export type VideoSeed = EmbeddedVideoSeed | UploadedVideoSeed;

const uploadedVideo = (
  title: string,
  basename: string,
  storedName: string,
  duration: number,
): UploadedVideoSeed => ({ kind: 'upload', title, basename, storedName, duration });

/**
 * Les fixtures nommées portent toutes une vidéo que nous hébergeons (FP-4,
 * relevé du 7 septembre). Elles embarquaient jusqu'ici dix vidéos YouTube
 * par identifiant, dont neuf clips musicaux commerciaux — `dQw4w9WgXcQ` sous
 * le titre « Présentation en 90 secondes » — ce qui posait trois problèmes
 * dans cet ordre : un usage illicite, un contenu sans rapport avec le titre
 * affiché, et l'impossibilité d'y attacher la piste de sous-titres exigée.
 *
 * `scripts/generer-videos-de-demonstration.mts` produit les fichiers, que ce
 * module référence par `basename`. Le chemin d'intégration par lien externe
 * reste exercé : les 487 profils générés de `generated-applicants.ts` sont
 * des embeds, et la démonstration ajoute une vidéo YouTube en direct.
 */
export const applicants: ApplicantSeed[] = [
  {
    firstName: 'Amina',
    birthDate: '1998-03-14',
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
    videos: [
      uploadedVideo(
        'Présentation en 90 secondes',
        'presentation-amina-berthier',
        'e9d1dbe1-7bc6-5e2d-a254-00a9e2583e6f',
        12,
      ),
    ],
  },
  {
    firstName: 'Marc',
    birthDate: '1979-11-02',
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
    videos: [
      uploadedVideo(
        'Mon parcours en atelier',
        'presentation-marc-delaunay',
        'ff60caaf-8613-5a40-932d-9f9a928b5c5c',
        12,
      ),
    ],
  },
  {
    firstName: 'Sofia',
    birthDate: '1988-06-21',
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
    videos: [
      uploadedVideo(
        'Pourquoi la reconversion',
        'presentation-sofia-nguyen',
        '4e3082bd-d35d-5378-a68d-ec5bcab3e57c',
        12,
      ),
    ],
  },
  {
    firstName: 'Yanis',
    birthDate: '2001-01-09',
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
    videos: [
      uploadedVideo(
        'Démonstration de projet',
        'presentation-yanis-oubrahim',
        '09b41fb7-1b54-5a1e-8549-8a6e39f759ce',
        12,
      ),
    ],
  },
  {
    firstName: 'Claire',
    birthDate: '1999-09-30',
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
    birthDate: '1993-04-17',
    lastName: 'Kamara',
    headline: 'Préparateur de commandes CACES 1-3-5',
    bio: 'Expérience en entrepôt frigorifique, permis cariste à jour.',
    location: 'Rennes',
    sector: 'Logistique',
    skills: [['Logistique', SkillLevel.ADVANCED]],
    certificationStatus: CertificationStatus.PENDING,
    moderationStatus: ModerationStatus.PENDING,
    videos: [
      uploadedVideo(
        'Mon expérience en entrepôt',
        'presentation-idriss-kamara',
        'e5318a0d-3bad-5dbb-b72d-c846b0c27fd6',
        12,
      ),
    ],
  },
  {
    firstName: 'Élise',
    birthDate: '1990-12-05',
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
    videos: [
      uploadedVideo(
        'En cuisine avec Élise',
        'presentation-elise-marchand',
        '925c3116-ac36-575d-acc1-34822f754e31',
        12,
      ),
    ],
  },
  {
    firstName: 'Thomas',
    birthDate: '1996-07-23',
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
    videos: [
      uploadedVideo(
        'Mon projet de fin de formation',
        'presentation-thomas-riviere',
        '50adf95d-2ee0-5908-997d-9a4b841efc98',
        12,
      ),
    ],
  },
  {
    firstName: 'Nadia',
    birthDate: '1991-02-11',
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
    birthDate: '1994-10-28',
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
    videos: [
      uploadedVideo(
        'Ma manière de gérer un litige',
        'presentation-bastien-colin',
        'b785b485-a94c-5013-b588-2a997b143cf3',
        12,
      ),
    ],
  },
  {
    firstName: 'Leïla',
    birthDate: '2000-05-19',
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
    // The one fixture ProfilsActifs hosts itself, and the only one that can
    // therefore carry a caption track our own player displays — subtitles are
    // an accessibility obligation, not a comfort option. It is also the video
    // the revocation demonstration deletes.
    videos: [
      uploadedVideo(
        'Refonte accessible — présentation sous-titrée',
        'presentation-leila-sassi',
        '3f9a6c21-5d84-4b17-9e0c-8a2fd1b64e05',
        14,
      ),
    ],
  },
  {
    firstName: 'Hugo',
    birthDate: '1987-08-08',
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
  {
    firstName: 'Lucas',
    lastName: 'Morel',
    birthDate: '2009-05-12',
    headline: 'Apprenti boulanger, cherche un contrat pro',
    bio: 'Dix-sept ans, en CAP boulangerie. Disponible en alternance dès septembre.',
    location: 'Nantes',
    sector: 'Restauration',
    skills: [['Cuisine', SkillLevel.BEGINNER]],
    certificationStatus: CertificationStatus.PENDING,
    moderationStatus: ModerationStatus.APPROVED,
    videos: [
      uploadedVideo(
        'Mon premier fournil',
        'presentation-lucas-morel',
        'c509ea35-35e7-50f7-99bc-175c613b83ba',
        12,
      ),
    ],
  },
];

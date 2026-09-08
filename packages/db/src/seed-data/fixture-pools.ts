/**
 * Raw vocabulary for `generated-applicants.ts` — kept separate from the
 * generation logic so extending the variety (a new sector, a new city) never
 * touches the code that assembles fixtures from it.
 */

export const FIRST_NAMES: readonly string[] = [
  'Alice',
  'Antoine',
  'Camille',
  'Chloé',
  'Diane',
  'Emma',
  'Enzo',
  'Farid',
  'Gabriel',
  'Hana',
  'Ines',
  'Jules',
  'Karim',
  'Léa',
  'Louis',
  'Malia',
  'Manon',
  'Nathan',
  'Noor',
  'Oscar',
  'Paul',
  'Rania',
  'Sami',
  'Théo',
  'Zoé',
];

export const LAST_NAMES: readonly string[] = [
  'Bernard',
  'Bertrand',
  'Blanchard',
  'Boucher',
  'Carre',
  'Chevalier',
  'Dubois',
  'Dumont',
  'Fabre',
  'Fontaine',
  'Garnier',
  'Girard',
  'Guerin',
  'Lambert',
  'Lefevre',
  'Marchand',
  'Marty',
  'Meunier',
  'Moulin',
  'Perrin',
  'Renard',
  'Robin',
  'Roussel',
  'Simon',
  'Vidal',
];

/** `FIRST_NAMES.length * LAST_NAMES.length` combinations — comfortably above
 *  any applicant count this generator is asked for, so unique-pair sampling
 *  never runs out. */

export const SECTORS: readonly string[] = [
  'Informatique',
  'Industrie',
  'Administration',
  'Gestion de projet',
  'Logistique',
  'Restauration',
  'Communication',
  'Relation client',
  'Design',
  'Santé',
  'Bâtiment',
  'Commerce',
  'Finance',
  'Éducation',
];

export const LOCATIONS: readonly string[] = [
  'Lyon',
  'Lille',
  'Marseille',
  'Paris',
  'Rennes',
  'Bordeaux',
  'Nantes',
  'Toulouse',
  'Strasbourg',
  'Nice',
  'Montpellier',
  'Grenoble',
];

export const HEADLINE_TEMPLATES: readonly ((sector: string) => string)[] = [
  (sector) => `Candidat(e) ${sector.toLowerCase()}, à l'écoute d'opportunités`,
  (sector) => `Profil ${sector.toLowerCase()}, plusieurs années d'expérience`,
  (sector) => `En reconversion vers le secteur ${sector.toLowerCase()}`,
  (sector) => `Jeune diplômé(e), secteur ${sector.toLowerCase()}`,
  (sector) => `Disponible immédiatement — ${sector.toLowerCase()}`,
];

export const BIO_TEMPLATES: readonly ((sector: string, location: string) => string)[] = [
  (sector, location) =>
    `Basé(e) à ${location}, je recherche un poste dans le secteur ${sector.toLowerCase()}.`,
  (sector, location) =>
    `Expérience acquise à ${location} et alentours, mobile pour un poste en ${sector.toLowerCase()}.`,
  (sector, location) =>
    `Motivé(e) par les métiers du ${sector.toLowerCase()}, disponible sur ${location} et sa région.`,
];

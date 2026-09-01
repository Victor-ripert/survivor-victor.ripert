import type { UserRole } from '@prisma/client';

/** Every demo account shares this password; it never leaves local fixtures. */
export const DEMO_PASSWORD = 'Password123!';

export interface StaffSeed {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

/** The first recruiter owns the seeded interaction history, so the recruiter
 *  dashboard has something to draw on a fresh database. */
export const staff: StaffSeed[] = [
  {
    email: 'admin@profils-actifs.fr',
    firstName: 'Awa',
    lastName: 'Traoré',
    role: 'ADMIN',
  },
  {
    email: 'recruteur@profils-actifs.fr',
    firstName: 'Camille',
    lastName: 'Duarte',
    role: 'RECRUITER',
  },
  {
    email: 'recruteur2@profils-actifs.fr',
    firstName: 'Paul',
    lastName: 'Ngoma',
    role: 'RECRUITER',
  },
];

export const [, primaryRecruiter] = staff;

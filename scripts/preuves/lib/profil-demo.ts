/**
 * Picks a public profile that exercises every text role an audited screen
 * needs to show: a completed certification (so the badge renders its
 * "certified" variant, not the plain pending one), at least one video, at
 * least one skill. Shared by the profile-page proof scripts (VI-6's
 * contrast and keyboard captures so far) instead of each hand-rolling the
 * same `fetch` + `find`.
 */
interface ProfilFeedApi {
  id: string;
  certificationStatus: string;
  certificationBadge?: string | null;
  videos: unknown[];
  skills: unknown[];
}

export interface ProfilDemo {
  id: string;
}

export const choisirProfilCertifie = async (apiUrl: string): Promise<ProfilDemo> => {
  const corps = (await fetch(`${apiUrl}/profiles?limit=20`).then((r) => r.json())) as {
    data: ProfilFeedApi[];
  };

  const trouve = corps.data.find(
    (p) =>
      p.certificationStatus === 'COMPLETED' &&
      p.certificationBadge &&
      p.videos.length > 0 &&
      p.skills.length > 0,
  );

  if (!trouve) {
    throw new Error(
      'aucun profil public certifié avec vidéo et compétence dans le flux — lancez npm run db:seed.',
    );
  }

  return { id: trouve.id };
};

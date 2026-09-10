import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { signToken } from '../src/services/jwt.js';
import { buildVideoConsent } from '../src/services/video-consent.js';

const app = createApp();

/**
 * The preview video on a catalogue row carries what the player needs to tell
 * a hosted file from an embed. It used to be `{ id, title, url }` only, and
 * the recruiter's player took every uploaded video for an unknown embed.
 */
describe('recruiter catalogue preview video', () => {
  const sector = `Aperçu-${randomUUID()}`;
  const createdUserIds: string[] = [];
  let recruiterToken: string;

  const createApplicantWithVideo = async (
    lastName: string,
    video: { type: 'UPLOAD' | 'EXTERNAL_LINK'; url: string; captionsUrl?: string },
  ): Promise<string> => {
    const applicant = await prisma.user.create({
      data: {
        email: `applicant-${randomUUID()}@test.local`,
        passwordHash: 'x',
        firstName: 'Idriss',
        lastName,
        role: 'APPLICANT',
        birthDate: new Date('1995-06-02'),
        profile: { create: { location: 'Lyon', sector, headline: 'Préparateur de commandes' } },
      },
      include: { profile: true },
    });
    createdUserIds.push(applicant.id);

    const created = await prisma.video.create({
      data: {
        profileId: applicant.profile!.id,
        title: 'Mon expérience en entrepôt',
        moderationStatus: 'APPROVED',
        ...video,
        ...buildVideoConsent(),
      },
    });
    return created.id;
  };

  const catalogueRow = async (lastName: string) => {
    const response = await request(app)
      .get(`/api/recruiter/catalogue?sector=${encodeURIComponent(sector)}`)
      .set('Authorization', `Bearer ${recruiterToken}`);
    expect(response.status).toBe(200);
    return response.body.data.find((row: { lastName: string }) => row.lastName === lastName);
  };

  let uploadId: string;
  let embedId: string;

  beforeAll(async () => {
    const recruiter = await prisma.user.create({
      data: {
        email: `recruiter-${randomUUID()}@test.local`,
        passwordHash: 'x',
        firstName: 'Rémi',
        lastName: 'Recruteur',
        role: 'RECRUITER',
      },
    });
    createdUserIds.push(recruiter.id);
    recruiterToken = signToken({ id: recruiter.id, email: recruiter.email, role: 'RECRUITER' });

    uploadId = await createApplicantWithVideo('Hébergé', {
      type: 'UPLOAD',
      url: '/uploads/4e3082bd-d35d-5378-a68d-ec5bcab3e57c.mp4',
      captionsUrl: '/uploads/4e3082bd-d35d-5378-a68d-ec5bcab3e57c.fr.vtt',
    });
    embedId = await createApplicantWithVideo('Intégré', {
      type: 'EXTERNAL_LINK',
      url: 'https://www.youtube.com/embed/aqz-KE-bpKQ',
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it('marks an uploaded preview as a hosted file and sends its caption track', async () => {
    const row = await catalogueRow('Hébergé');

    expect(row.previewVideo).toEqual({
      id: uploadId,
      title: 'Mon expérience en entrepôt',
      type: 'UPLOAD',
      url: '/uploads/4e3082bd-d35d-5378-a68d-ec5bcab3e57c.mp4',
      captionsUrl: '/uploads/4e3082bd-d35d-5378-a68d-ec5bcab3e57c.fr.vtt',
    });
  });

  it('marks an embedded preview as such, with no caption track', async () => {
    const row = await catalogueRow('Intégré');

    expect(row.previewVideo).toEqual({
      id: embedId,
      title: 'Mon expérience en entrepôt',
      type: 'EXTERNAL_LINK',
      url: 'https://www.youtube.com/embed/aqz-KE-bpKQ',
    });
  });
});

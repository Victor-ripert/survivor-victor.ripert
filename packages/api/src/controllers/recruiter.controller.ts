import { InteractionType } from '@prisma/client';
import type { Request, Response } from 'express';
import { getCatalogueFacets, listCatalogue } from '../services/catalogue.service.js';
import type { CatalogueFilters } from '../services/catalogue.filters.js';
import { getRecruiterDashboard } from '../services/dashboard.service.js';
import { recordInteraction, removeFavorite } from '../services/interaction.service.js';
import { currentUser } from '../utils/current-user.js';
import {
  catalogueQuerySchema,
  idSchema,
  type CatalogueQueryInput,
} from '../validators/recruiter.js';

const toFilters = (query: CatalogueQueryInput): CatalogueFilters => ({
  q: query.q,
  sector: query.sector,
  location: query.location,
  skills: query.skills,
  certifiedOnly: query.certifiedOnly,
  minScore: query.minScore,
  hasVideo: query.hasVideo,
});

export const getCatalogue = async (req: Request, res: Response): Promise<void> => {
  const query = catalogueQuerySchema.parse(req.query);

  res.status(200).json(
    await listCatalogue({
      recruiterId: currentUser(req).id,
      filters: toFilters(query),
      sort: query.sort,
      page: query.page,
      limit: query.limit,
      favoritesOnly: query.favoritesOnly,
    }),
  );
};

export const getFacets = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(await getCatalogueFacets());
};

/** The favourites list is the catalogue narrowed to the recruiter's shortlist,
 *  so it accepts the same filters and returns the same rows. */
export const getFavorites = async (req: Request, res: Response): Promise<void> => {
  const query = catalogueQuerySchema.parse(req.query);

  res.status(200).json(
    await listCatalogue({
      recruiterId: currentUser(req).id,
      filters: toFilters(query),
      sort: query.sort,
      page: query.page,
      limit: query.limit,
      favoritesOnly: true,
    }),
  );
};

export const putFavorite = async (req: Request, res: Response): Promise<void> => {
  const applicantId = idSchema.parse(req.params.applicantId);
  const { interaction, created } = await recordInteraction({
    actorId: currentUser(req).id,
    applicantId,
    type: InteractionType.FAVORITE,
  });

  res.status(created ? 201 : 200).json(interaction);
};

export const deleteFavorite = async (req: Request, res: Response): Promise<void> => {
  const applicantId = idSchema.parse(req.params.applicantId);
  await removeFavorite(currentUser(req).id, applicantId);

  res.status(204).send();
};

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json(await getRecruiterDashboard(currentUser(req).id));
};

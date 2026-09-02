/**
 * Prints the SQL Prisma actually emits for the three catalogue filters named
 * in the digital advisor's mail (sector, location, skills).
 *
 * The point is not to read it — it is to stop the index benchmark from
 * measuring a hand-written paraphrase of the query instead of the query the
 * application runs. Whatever comes out of here is what scripts/preuves/
 * index-catalogue.sh puts under EXPLAIN ANALYZE.
 *
 *   npx tsx scripts/preuves/capturer-sql-catalogue.mts
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { loadRepoEnv } from '@profils-actifs/shared/node';
import {
  buildCatalogueOrderBy,
  buildCatalogueWhere,
  type CatalogueFilters,
} from '../../packages/api/src/services/catalogue.filters.js';

loadRepoEnv();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  log: [{ emit: 'event', level: 'query' }],
});

const CASES: { titre: string; filters: CatalogueFilters }[] = [
  { titre: 'sector', filters: { sector: 'Informatique' } },
  { titre: 'location', filters: { location: 'Lyon' } },
  { titre: 'skills', filters: { skills: ['React'] } },
  { titre: 'q', filters: { q: 'react' } },
];

const main = async (): Promise<void> => {
  let courant = CASES[0]?.titre ?? '';

  prisma.$on('query', (event) => {
    // The count query in the same transaction is a second event; both are
    // worth seeing, so nothing is filtered out here.
    console.log(`\n--- ${courant} ---`);
    console.log(event.query);
    console.log(`params: ${event.params}`);
  });

  for (const { titre, filters } of CASES) {
    courant = titre;
    await prisma.profile.findMany({
      where: buildCatalogueWhere(filters),
      select: { id: true },
      orderBy: buildCatalogueOrderBy('recent'),
      take: 20,
    });
  }

  await prisma.$disconnect();
};

await main();

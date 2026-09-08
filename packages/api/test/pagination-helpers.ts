import type { Paginated } from '@profils-actifs/shared';

/**
 * Concatenates every page of a paginated result into one array. Needed
 * because the local/CI database these integration tests run against also
 * carries the load-test seed's hundreds of rows (`packages/db/src/seed-data/
 * generated-applicants.ts`) alongside whatever a test creates — "the row I
 * just created is on page 1" stopped being a safe assumption once the seed
 * grew past the 20-per-page default. Bounded by `pagination.pages`, so this
 * never loops past what the server itself reports as the last page.
 */
export async function collectAllPages<T>(
  fetchPage: (page: number) => Promise<Paginated<T>>,
): Promise<T[]> {
  const first = await fetchPage(1);
  const items = [...first.data];

  for (let page = 2; page <= first.pagination.pages; page += 1) {
    items.push(...(await fetchPage(page)).data);
  }

  return items;
}

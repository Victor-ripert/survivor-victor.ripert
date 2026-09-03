/**
 * Prints the `properties` and `required` list declared for one
 * `components.schemas` entry of `packages/api/openapi.yaml`, as JSON.
 *
 * Any proof script that needs to check a captured JSON response against the
 * contract can shell out to this instead of hand-copying a field list that
 * then drifts the day someone edits openapi.yaml — see profils-contrat.sh
 * for the pattern (VI-2: no field returned that the Profile schema doesn't
 * declare).
 *
 *   npx tsx scripts/preuves/lib/openapi-schema.mts Profile
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OPENAPI_PATH = join(HERE, '../../../packages/api/openapi.yaml');

export interface SchemaFields {
  properties: string[];
  required: string[];
}

export const loadSchemaFields = (
  schemaName: string,
  openapiPath = DEFAULT_OPENAPI_PATH,
): SchemaFields => {
  const document = load(readFileSync(openapiPath, 'utf8')) as {
    components?: {
      schemas?: Record<string, { properties?: Record<string, unknown>; required?: string[] }>;
    };
  };
  const schema = document.components?.schemas?.[schemaName];

  if (!schema) {
    throw new Error(`no component schema named "${schemaName}" in ${openapiPath}`);
  }

  return {
    properties: Object.keys(schema.properties ?? {}).sort(),
    required: [...(schema.required ?? [])].sort(),
  };
};

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  const [schemaName, openapiPath] = process.argv.slice(2);

  if (!schemaName) {
    console.error('usage: openapi-schema.mts <SchemaName> [path/to/openapi.yaml]');
    process.exit(1);
  }

  process.stdout.write(JSON.stringify(loadSchemaFields(schemaName, openapiPath)));
}

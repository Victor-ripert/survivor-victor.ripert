import { z } from 'zod';

/**
 * Primitives every domain's validators build on, so an id, a page or a
 * free-text filter is checked the same way whichever route receives it.
 */

const MAX_ID_LENGTH = 64;

/** Postgres refuses a NUL byte inside a text value, so a payload carrying one
 *  would fail deep in the driver instead of at the edge. */
const NUL_BYTE = String.fromCharCode(0);

const withoutNulByte = <T extends z.ZodType<string>>(schema: T) =>
  schema.refine((value) => !value.includes(NUL_BYTE), { error: 'Caractère non autorisé' });

/** Required free text: trimmed, non-empty, capped. `requiredMessage` is what
 *  the user reads when the field is blank. */
export const printableText = (max: number, requiredMessage = 'Champ requis') =>
  withoutNulByte(
    z
      .string({ error: requiredMessage })
      .trim()
      .min(1, { error: requiredMessage })
      .max(max, { error: `Ne peut pas dépasser ${max} caractères` }),
  );

/** Free text that may be blank — a blank value clears the stored one. */
export const optionalText = (max: number) =>
  withoutNulByte(
    z
      .string()
      .trim()
      .max(max, { error: `Ne peut pas dépasser ${max} caractères` }),
  );

export const idSchema = printableText(MAX_ID_LENGTH, 'Identifiant requis');

/** Path parameters arrive as `string | undefined`; this turns a missing or
 *  malformed one into a 400 instead of an unchecked cast. */
export const parseId = (value: unknown): string => idSchema.parse(value);

/** Query strings carry booleans as text; anything but an explicit true value
 *  reads as false. */
export const booleanQueryParam = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((value) => value === true || value === 'true' || value === '1');

/** Accepts both `?key=a&key=b` and `?key=a,b`. */
export const listQueryParam = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? value : value.split(',')))
  .transform((entries) => entries.map((entry) => entry.trim()).filter((entry) => entry.length > 0));

/** Page and limit are clamped server-side by `resolvePageRequest`; this only
 *  rejects values that are not page numbers at all. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

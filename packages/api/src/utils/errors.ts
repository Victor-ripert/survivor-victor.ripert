/**
 * Thrown by a service (no Express in those files, by design — see
 * profile.service.ts/video.service.ts) to signal a business-rule failure
 * in a way a controller can translate straight into CLAUDE.md's uniform
 * `{ error, message, statusCode }` response shape:
 *
 *   try {
 *     await addExternalVideo(...);
 *   } catch (err) {
 *     if (err instanceof ServiceError) {
 *       res.status(err.statusCode).json({ error: err.errorCode, message: err.message, statusCode: err.statusCode });
 *       return;
 *     }
 *     throw err;
 *   }
 *
 * One class, reused by every service, instead of each one inventing its
 * own ad hoc error shape.
 */
export class ServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

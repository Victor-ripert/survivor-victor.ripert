import { AxiosError } from 'axios';
import { ApiError, toApiError } from '../../src/services/api.js';

const axiosFailure = (code: string): AxiosError => {
  const error = new AxiosError('failed');
  error.code = code;
  return error;
};

describe('toApiError', () => {
  it('keeps an ApiError as it is', () => {
    const original = new ApiError(404, 'not_found', 'Profil introuvable');

    expect(toApiError(original)).toBe(original);
  });

  it('reads the API’s own error body when there is one', () => {
    const error = new AxiosError('failed');
    error.response = {
      status: 422,
      data: { error: 'unprocessable_entity', message: 'optionId est requis', statusCode: 422 },
    } as AxiosError['response'];

    expect(toApiError(error)).toMatchObject({
      status: 422,
      code: 'unprocessable_entity',
      message: 'optionId est requis',
    });
  });

  // A request that never answers used to read as "server unreachable", which
  // sends the reader to check a server that is in fact running.
  it('tells a timeout apart from an unreachable server', () => {
    expect(toApiError(axiosFailure('ECONNABORTED'))).toMatchObject({
      code: 'service_unavailable',
      message: expect.stringContaining('trop de temps'),
    });

    expect(toApiError(axiosFailure('ERR_NETWORK'))).toMatchObject({
      code: 'internal_error',
      message: expect.stringContaining('injoignable'),
    });
  });

  it('gives an aborted request a shape rather than leaking an axios error', () => {
    expect(toApiError(axiosFailure('ERR_CANCELED'))).toMatchObject({
      status: 0,
      message: 'Requête annulée.',
    });
  });

  it('falls back to an opaque failure for anything that is not an axios error', () => {
    expect(toApiError(new Error('boom'))).toMatchObject({
      status: 500,
      code: 'internal_error',
      message: 'Une erreur inattendue est survenue.',
    });
  });
});

/**
 * Internal: maps API error responses to SDK error classes. Not re-exported from the package.
 */
import {
  VidNavigatorError,
  AuthenticationError,
  BadRequestError,
  AccessDeniedError,
  NotFoundError,
  RateLimitExceededError,
  PaymentRequiredError,
  ServerError,
  StorageQuotaExceededError,
  GeoRestrictedError,
  SystemOverloadError,
  InsufficientCreditsError,
  TooManyActiveJobsError,
} from './errors';

export function parseApiErrorPayload(data: any): {
  errorCode?: string;
  errorMessage?: string;
  details?: any;
} {
  const errorField = data?.error;
  const errorCode =
    (typeof errorField === 'string' ? errorField : errorField?.code) ?? data?.error_code;
  const errorMessage =
    data?.message ??
    (typeof errorField === 'object' ? errorField?.message : undefined);
  return { errorCode, errorMessage, details: data };
}

/** Map an HTTP error status + body to the matching SDK error class. */
export function buildApiError(status: number, data: any, fallbackMessage?: string): VidNavigatorError {
  const { errorCode, errorMessage, details } = parseApiErrorPayload(data);
  const message = `API request failed with status ${status}: ${errorMessage || fallbackMessage}`;

  switch (status) {
    case 400:
      return new BadRequestError(message, status, errorCode, errorMessage, details);
    case 401:
      return new AuthenticationError(message, status, errorCode, errorMessage, details);
    case 402:
      if (errorCode === 'limit_exceeded') {
        return new InsufficientCreditsError(message, status, errorCode, errorMessage, details);
      }
      return new PaymentRequiredError(message, status, errorCode, errorMessage, details);
    case 403:
      return new AccessDeniedError(message, status, errorCode, errorMessage, details);
    case 404:
      return new NotFoundError(message, status, errorCode, errorMessage, details);
    case 413:
      return new StorageQuotaExceededError(message, status, errorCode, errorMessage, details);
    case 429:
      if (errorCode === 'too_many_active_jobs') {
        return new TooManyActiveJobsError(message, status, errorCode, errorMessage, details);
      }
      return new RateLimitExceededError(message, status, errorCode, errorMessage, details);
    case 451:
      return new GeoRestrictedError(message, status, errorCode, errorMessage, details);
    case 503:
      return new SystemOverloadError(
        message,
        status,
        errorCode,
        errorMessage,
        details,
        data?.retry_after_seconds
      );
    default:
      if (status >= 500) {
        return new ServerError(message, status, errorCode, errorMessage, details);
      }
      return new VidNavigatorError(message, status, errorCode, errorMessage, details);
  }
}

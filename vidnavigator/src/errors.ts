/**
 * Custom exception classes for VidNavigator SDK.
 */

/**
 * Base class for all VidNavigator SDK errors.
 * Contains additional information from the API response when available.
 */
export class VidNavigatorError extends Error {
  public readonly status_code?: number;
  public readonly error_code?: string;
  public readonly error_message?: string;
  public readonly details?: any;

  constructor(
    message: string,
    status_code?: number,
    error_code?: string,
    error_message?: string,
    details?: any
  ) {
    super(message);
    this.name = 'VidNavigatorError';
    this.status_code = status_code;
    this.error_code = error_code;
    this.error_message = error_message;
    this.details = details;
    Object.setPrototypeOf(this, VidNavigatorError.prototype);
  }
}

/**
 * Raised on HTTP 401 errors (e.g., missing/invalid API key).
 */
export class AuthenticationError extends VidNavigatorError {
  constructor(message: string, status_code?: number, error_code?: string, error_message?: string, details?: any) {
    super(message, status_code, error_code, error_message, details);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Raised on HTTP 400 errors (invalid parameters).
 */
export class BadRequestError extends VidNavigatorError {
  constructor(message: string, status_code?: number, error_code?: string, error_message?: string, details?: any) {
    super(message, status_code, error_code, error_message, details);
    this.name = 'BadRequestError';
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * Raised on HTTP 403 errors (insufficient permissions).
 */
export class AccessDeniedError extends VidNavigatorError {
  constructor(message: string, status_code?: number, error_code?: string, error_message?: string, details?: any) {
    super(message, status_code, error_code, error_message, details);
    this.name = 'AccessDeniedError';
    Object.setPrototypeOf(this, AccessDeniedError.prototype);
  }
}

/**
 * Raised when a requested resource is not found (HTTP 404).
 */
export class NotFoundError extends VidNavigatorError {
  constructor(message: string, status_code?: number, error_code?: string, error_message?: string, details?: any) {
    super(message, status_code, error_code, error_message, details);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Raised when rate limits are exceeded (HTTP 429).
 */
export class RateLimitExceededError extends VidNavigatorError {
    constructor(message: string, status_code?: number, error_code?: string, error_message?: string, details?: any) {
    super(message, status_code, error_code, error_message, details);
    this.name = 'RateLimitExceededError';
    Object.setPrototypeOf(this, RateLimitExceededError.prototype);
  }
}

/**
 * Raised when usage limits are exceeded and payment is required (HTTP 402).
 */
export class PaymentRequiredError extends VidNavigatorError {
    constructor(message: string, status_code?: number, error_code?: string, error_message?: string, details?: any) {
    super(message, status_code, error_code, error_message, details);
    this.name = 'PaymentRequiredError';
    Object.setPrototypeOf(this, PaymentRequiredError.prototype);
  }
}

/**
 * Raised on 5xx server errors.
 */
export class ServerError extends VidNavigatorError {
    constructor(message: string, status_code?: number, error_code?: string, error_message?: string, details?: any) {
    super(message, status_code, error_code, error_message, details);
    this.name = 'ServerError';
    Object.setPrototypeOf(this, ServerError.prototype);
  }
} 
/**
 * Custom exception classes for VidNavigator SDK.
 */
import { FileScenesStatus, ScenesError } from './models';

/**
 * Base class for all VidNavigator SDK errors.
 * Contains additional information from the API response when available.
 */
export class VidNavigatorError extends Error {
  public readonly status_code?: number;
  public readonly error_code?: string;
  public readonly error_message?: string;
  public readonly details?: any;
  /**
   * Set on every error raised while submitting, polling, or waiting for an async job once a
   * `task_id` exists. The job keeps running server-side and its result stays readable for 1 hour
   * after it finishes, so keep this id to resume with `vn.<operation>.resume(task_id)`.
   */
  public task_id?: string;

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
 * Raised on HTTP 429: too many requests (`rate_limit_exceeded`). Wait `Retry-After` seconds.
 */
export class RateLimitExceededError extends VidNavigatorError {
    constructor(message: string, status_code?: number, error_code?: string, error_message?: string, details?: any) {
    super(message, status_code, error_code, error_message, details);
    this.name = 'RateLimitExceededError';
    Object.setPrototypeOf(this, RateLimitExceededError.prototype);
  }
}

/**
 * Raised on HTTP 402. Catch it for any 402, or one of its subclasses to know which:
 * `InsufficientCreditsError` (not enough credits) or `StorageQuotaExceededError` (the storage of the plan is full).
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

/**
 * Raised when the storage of the plan is full: HTTP 402 `storage_quota_exceeded`
 * on `uploadFile` (413 is still mapped here too). A `PaymentRequiredError`, so
 * code that catches that one keeps working.
 */
export class StorageQuotaExceededError extends PaymentRequiredError {
  constructor(message: string, status_code?: number, error_code?: string, error_message?: string, details?: any) {
    super(message, status_code, error_code, error_message, details);
    this.name = 'StorageQuotaExceededError';
    Object.setPrototypeOf(this, StorageQuotaExceededError.prototype);
  }
}

/**
 * Raised when content is not available in the user's region (HTTP 451).
 */
export class GeoRestrictedError extends VidNavigatorError {
  constructor(message: string, status_code?: number, error_code?: string, error_message?: string, details?: any) {
    super(message, status_code, error_code, error_message, details);
    this.name = 'GeoRestrictedError';
    Object.setPrototypeOf(this, GeoRestrictedError.prototype);
  }
}

/**
 * Raised when the system is temporarily overloaded (HTTP 503), e.g. extraction overload.
 */
export class SystemOverloadError extends VidNavigatorError {
  public readonly retry_after_seconds?: number;

  constructor(
    message: string,
    status_code?: number,
    error_code?: string,
    error_message?: string,
    details?: any,
    retry_after_seconds?: number
  ) {
    super(message, status_code, error_code, error_message, details);
    this.name = 'SystemOverloadError';
    this.retry_after_seconds = retry_after_seconds;
    Object.setPrototypeOf(this, SystemOverloadError.prototype);
  }
} 

/**
 * Raised when the account does not have enough credits: HTTP 402 `insufficient_credits`.
 * Thrown at job submit time (no task is created; e.g. less than 60 seconds of transcription
 * credit left) and by `result()` when a job runs out of credits. Extends `PaymentRequiredError`.
 */
export class InsufficientCreditsError extends PaymentRequiredError {
  constructor(message: string, status_code?: number, error_code?: string, error_message?: string, details?: any) {
    super(message, status_code, error_code, error_message, details);
    this.name = 'InsufficientCreditsError';
    Object.setPrototypeOf(this, InsufficientCreditsError.prototype);
  }
}

/**
 * Raised when an async job could not be submitted because too many jobs are already running
 * for this account (HTTP 429, `too_many_active_jobs`). No task is created; retry once some
 * of your running jobs finish. Extends `RateLimitExceededError`.
 */
export class TooManyActiveJobsError extends RateLimitExceededError {
  constructor(message: string, status_code?: number, error_code?: string, error_message?: string, details?: any) {
    super(message, status_code, error_code, error_message, details);
    this.name = 'TooManyActiveJobsError';
    Object.setPrototypeOf(this, TooManyActiveJobsError.prototype);
  }
}

/**
 * Raised when `include_scenes` was asked on an uploaded file that has no scenes to read
 * (HTTP 409, `scenes_not_available`). `scenes_status` says where their analysis stands: `none`
 * (never asked for: start it with `analyzeFileScenes(file_id)`), `processing` (call again once
 * `getFile()` reports `completed`) or `failed` (see `scenes_error`).
 */
export class ScenesNotAvailableError extends VidNavigatorError {
  public readonly scenes_status?: Exclude<FileScenesStatus, 'completed'>;
  /** Present when `scenes_status` is `failed`, e.g. `frames_not_available` for an audio file. */
  public readonly scenes_error?: ScenesError;

  constructor(
    message: string,
    status_code?: number,
    error_code?: string,
    error_message?: string,
    details?: any,
    scenes_status?: Exclude<FileScenesStatus, 'completed'>,
    scenes_error?: ScenesError
  ) {
    super(message, status_code, error_code, error_message, details);
    this.name = 'ScenesNotAvailableError';
    this.scenes_status = scenes_status;
    this.scenes_error = scenes_error;
    Object.setPrototypeOf(this, ScenesNotAvailableError.prototype);
  }
}

/**
 * Raised when waiting for a job exceeds `timeoutMs`. Always carries `task_id`: the job keeps
 * running server-side and its result stays readable for 1 hour after it finishes, so resume it
 * with `vn.<operation>.resume(err.task_id)`.
 */
export class TaskTimeoutError extends VidNavigatorError {
  constructor(message: string, task_id: string) {
    super(message);
    this.name = 'TaskTimeoutError';
    this.task_id = task_id;
    Object.setPrototypeOf(this, TaskTimeoutError.prototype);
  }
}

/**
 * Raised by `constructWebhookEvent()` when a webhook delivery's signature is missing,
 * malformed, does not match, or is older than the allowed tolerance.
 */
export class WebhookSignatureError extends VidNavigatorError {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookSignatureError';
    Object.setPrototypeOf(this, WebhookSignatureError.prototype);
  }
}

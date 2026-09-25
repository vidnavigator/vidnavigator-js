import { UsageBlock } from './Usage';

/** Async job kinds returned by the `/transcribe/async`, `/extract/video/async` and `/tweet/statement/async` endpoints. */
export type AsyncJobType = 'transcribe' | 'extract_video' | 'tweet_statement';

/** `processing` = accepted and being worked on. `completed` and `failed` are terminal. */
export type AsyncTaskStatus = 'processing' | 'completed' | 'failed';

/**
 * Present when `task_status === 'failed'`. Carries the same `error` code and HTTP status
 * the synchronous endpoint would have returned (e.g. `video_too_long` / 400).
 */
export interface AsyncJobError {
  error?: string;
  message?: string;
  http_status?: number;
}

/**
 * Delivery state of a job's webhook. `null` when no webhook was configured.
 * The webhook URL itself is never echoed back.
 */
export interface AsyncJobWebhookStatus {
  status?: 'pending' | 'delivered' | 'failed';
  /** Delivery attempts made (max 5). */
  attempts?: number;
  /** HTTP status your endpoint returned on the last attempt. */
  response_status?: number | null;
  last_error?: string | null;
  delivered_at?: string | null;
}

export interface AsyncJobAcceptedJSON {
  task_id: string;
  task_status: 'processing';
  job_type?: AsyncJobType;
  expires_at?: string;
  check_status_url?: string;
  webhook_url?: string | null;
  message?: string;
  docs_url?: string;
}

/** 202 response from an async submit endpoint. Poll with the matching `get...AsyncJob(task_id)` method. */
export class AsyncJobAccepted {
  task_id: string;
  task_status: 'processing';
  job_type?: AsyncJobType;
  /** Provisional submit-time bound; pushed out to finish time + 1 hour once the job completes. */
  expires_at?: string;
  /** Relative URL to poll for status and the result. */
  check_status_url?: string;
  /** The URL this job's result will be POSTed to, or `null` if no webhook applies. */
  webhook_url?: string | null;
  message?: string;
  docs_url?: string;

  constructor(data: AsyncJobAcceptedJSON) {
    this.task_id = data.task_id;
    this.task_status = data.task_status;
    this.job_type = data.job_type;
    this.expires_at = data.expires_at;
    this.check_status_url = data.check_status_url;
    this.webhook_url = data.webhook_url;
    this.message = data.message;
    this.docs_url = data.docs_url;
  }

  static fromJSON(json: AsyncJobAcceptedJSON): AsyncJobAccepted {
    return new AsyncJobAccepted(json);
  }
}

export interface AsyncJobJSON {
  task_id: string;
  task_status: AsyncTaskStatus;
  job_type?: string;
  request?: Record<string, unknown>;
  created_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
  expires_at?: string;
  check_status_url?: string;
  webhook?: AsyncJobWebhookStatus | null;
  result?: any;
  error?: AsyncJobError | null;
}

/**
 * State of an async job, returned by the `get...AsyncJob(task_id)` pollers.
 * `result` is populated only when `task_status === 'completed'` and is parsed into the same
 * shape the synchronous endpoint returns; `error` is populated only when `task_status === 'failed'`.
 */
export class AsyncJob<TResult> {
  task_id: string;
  task_status: AsyncTaskStatus;
  job_type?: string;
  /** Echo of the submitted parameters (`webhook_url` is never echoed). */
  request?: Record<string, unknown>;
  created_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
  /** Results are deleted after this time (1 hour after the job finishes). */
  expires_at?: string;
  check_status_url?: string;
  webhook?: AsyncJobWebhookStatus | null;
  result: TResult | null;
  error: AsyncJobError | null;
  /** Per-call usage, populated only when polled with `include_usage: true` and `task_status === 'completed'`. */
  usage?: UsageBlock;

  constructor(data: AsyncJobJSON, parseResult: (raw: any) => TResult) {
    this.task_id = data.task_id;
    this.task_status = data.task_status;
    this.job_type = data.job_type;
    this.request = data.request;
    this.created_at = data.created_at;
    this.started_at = data.started_at;
    this.completed_at = data.completed_at;
    this.expires_at = data.expires_at;
    this.check_status_url = data.check_status_url;
    this.webhook = data.webhook;
    this.result = data.result !== undefined && data.result !== null ? parseResult(data.result) : null;
    this.error = data.error ?? null;
  }

  static fromJSON<T>(json: AsyncJobJSON, parseResult: (raw: any) => T): AsyncJob<T> {
    return new AsyncJob<T>(json, parseResult);
  }
}

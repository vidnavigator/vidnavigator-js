import { AsyncJobError } from './models';
import { VidNavigatorError, TaskTimeoutError } from './errors';
import { buildApiError } from './http';

/**
 * Status of an async task. `completed` and `failed` are terminal; anything else (today only
 * `processing`) means the task is still running.
 */
export type TaskStatus = 'processing' | 'completed' | 'failed' | (string & {});

/** Minimal shape of every polled task (async jobs and TikTok tasks). */
export interface PollableTask {
  task_id: string;
  task_status: TaskStatus;
  error?: AsyncJobError | null;
}

export interface PollOptions<TTask = PollableTask> {
  /** Delay between polls once the task has run for 10 seconds, in ms. Default 3000. Polling is free and not rate-limited. */
  intervalMs?: number;
  /** Poll every second during the first 10 seconds so short clips return fast. Default true. */
  fastStart?: boolean;
  /**
   * Stop waiting after this many ms and throw {@link TaskTimeoutError} (which carries `task_id`).
   * The job keeps running server-side. Default 30 minutes; `0` waits forever.
   */
  timeoutMs?: number;
  /** Stop waiting early. The job keeps running server-side. */
  signal?: AbortSignal;
  /** Called with every polled task snapshot, including the final one. */
  onPoll?: (task: TTask) => void;
}

export const DEFAULT_POLL_INTERVAL_MS = 3000;
export const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const FAST_START_WINDOW_MS = 10_000;
const FAST_START_INTERVAL_MS = 1000;

export function isTerminal(status: TaskStatus): boolean {
  return status === 'completed' || status === 'failed';
}

function abortError(task_id: string): VidNavigatorError {
  const err = new VidNavigatorError(`Stopped waiting for task ${task_id} (aborted); the job keeps running server-side`);
  err.task_id = task_id;
  return err;
}

function sleep(ms: number, task_id: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError(task_id));
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError(task_id));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Poll `fetchTask` until `task_status` is `completed` or `failed`, and return that final snapshot. */
export async function pollUntilDone<TTask extends PollableTask>(
  task_id: string,
  fetchTask: () => Promise<TTask>,
  options: PollOptions<TTask> = {}
): Promise<TTask> {
  const intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const fastStart = options.fastStart ?? true;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const started = Date.now();

  let task = await withTaskId(task_id, fetchTask);
  options.onPoll?.(task);
  while (!isTerminal(task.task_status)) {
    const elapsed = Date.now() - started;
    const delay =
      fastStart && elapsed < FAST_START_WINDOW_MS ? Math.min(FAST_START_INTERVAL_MS, intervalMs) : intervalMs;
    if (timeoutMs > 0 && elapsed + delay > timeoutMs) {
      throw new TaskTimeoutError(
        `Task ${task_id} still ${task.task_status} after ${Math.round(elapsed / 1000)}s. ` +
          `It keeps running server-side; resume it with this task_id (results are kept 1 hour after it finishes).`,
        task_id
      );
    }
    await sleep(delay, task_id, options.signal);
    task = await withTaskId(task_id, fetchTask);
    options.onPoll?.(task);
  }
  return task;
}

/** Run `fn`, tagging any SDK error it throws with `task_id` so the job can always be resumed. */
async function withTaskId<T>(task_id: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof VidNavigatorError && !error.task_id) error.task_id = task_id;
    throw error;
  }
}

/**
 * Build the error for a `failed` task from its `error` object (`error`, `message`, `http_status`),
 * using the same class the API would have used for that status. Carries `task_id`.
 */
export function errorFromFailedTask(task: PollableTask): VidNavigatorError {
  const info = task.error;
  let err: VidNavigatorError;
  if (info?.http_status) {
    err = buildApiError(info.http_status, {
      error: info.error,
      message: info.message ?? `Task ${task.task_id} failed`,
      task_id: task.task_id,
    });
  } else {
    const message = info?.message ?? 'no error details returned';
    err = new VidNavigatorError(`Task ${task.task_id} failed: ${message}`, undefined, info?.error, info?.message, task);
  }
  err.task_id = task.task_id;
  return err;
}

export interface JobInfo {
  task_id: string;
  job_type: string;
  check_status_url?: string;
  /** Where the result notification will be POSTed, or `null` when no webhook applies. */
  webhook_url?: string | null;
  expires_at?: string;
}

/**
 * Handle to a submitted async job. Use it to run many jobs at once: submit them all, then
 * `await job.result()` on each (or check `await job.status()` yourself).
 *
 * Polling always works, whether or not a webhook is configured.
 */
export class Job<TTask extends PollableTask, TResult> {
  readonly task_id: string;
  readonly job_type: string;
  readonly check_status_url?: string;
  readonly webhook_url?: string | null;
  readonly expires_at?: string;
  /** Most recent task snapshot fetched by `status()`, `refresh()`, `wait()` or `result()`. */
  task?: TTask;

  private readonly fetchTask: () => Promise<TTask>;
  private readonly toResult: (task: TTask) => Promise<TResult>;

  constructor(
    info: JobInfo,
    fetchTask: () => Promise<TTask>,
    toResult: (task: TTask) => Promise<TResult>
  ) {
    this.task_id = info.task_id;
    this.job_type = info.job_type;
    this.check_status_url = info.check_status_url;
    this.webhook_url = info.webhook_url;
    this.expires_at = info.expires_at;
    this.fetchTask = async () => {
      const task = await fetchTask();
      this.task = task;
      return task;
    };
    this.toResult = toResult;
  }

  /** Poll once and return the full task snapshot. */
  async refresh(): Promise<TTask> {
    return withTaskId(this.task_id, this.fetchTask);
  }

  /** Poll once and return the current `task_status`. */
  async status(): Promise<TaskStatus> {
    return (await this.refresh()).task_status;
  }

  /** Poll until the task is `completed` or `failed` and return the final snapshot. Does not throw on `failed`. */
  async wait(options?: PollOptions<TTask>): Promise<TTask> {
    return pollUntilDone(this.task_id, this.fetchTask, options);
  }

  /**
   * Wait for the job and return its result. Throws the error from the task's `error` object when it
   * failed, or {@link TaskTimeoutError} on timeout. Every error carries `task_id`.
   */
  async result(options?: PollOptions<TTask>): Promise<TResult> {
    const task = await this.wait(options);
    if (task.task_status === 'failed') throw errorFromFailedTask(task);
    return withTaskId(this.task_id, () => this.toResult(task));
  }
}

/**
 * An async operation, callable as a blocking one-liner, with `.submit()` for a non-blocking
 * {@link Job} handle and `.resume(task_id)` to reattach to a job you already submitted.
 */
export interface JobOperation<TInput, TTask extends PollableTask, TResult> {
  /** Submit, poll until finished, and return the result. */
  (input: TInput, options?: RunOptions<TTask>): Promise<TResult>;
  /** Submit and return a {@link Job} handle immediately. */
  submit(input: TInput, options?: SubmitOptions): Promise<Job<TTask, TResult>>;
  /** Reattach to a submitted job by `task_id` (e.g. from a {@link TaskTimeoutError}). Makes no request. */
  resume(task_id: string, options?: SubmitOptions): Job<TTask, TResult>;
}

export interface SubmitOptions {
  /** Attach a `usage` block to the result. Billing happens in the background, so usage is read when polling. */
  include_usage?: boolean;
}

export type RunOptions<TTask = PollableTask> = SubmitOptions & PollOptions<TTask>;

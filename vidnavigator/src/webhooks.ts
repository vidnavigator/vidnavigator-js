import crypto from 'crypto';
import { AsyncJobError } from './models';
import { VidNavigatorError, WebhookSignatureError } from './errors';

/** Event types delivered to a `webhook_url` when an async job reaches a terminal state. */
export type WebhookEventType =
  | 'transcribe.completed'
  | 'transcribe.failed'
  | 'extract_video.completed'
  | 'extract_video.failed'
  | 'tweet_statement.completed'
  | 'tweet_statement.failed'
  | 'tiktok_profile.completed'
  | 'tiktok_profile.failed'
  | 'tiktok_search.completed'
  | 'tiktok_search.failed';

/** `data.result` of a `tiktok_profile.*` / `tiktok_search.*` event: a summary, not the videos. */
export interface TikTokWebhookResult {
  /** Same fields as the task's `stats` (e.g. `videos_matched`, or `results_count` / `sort_by` for searches). */
  stats?: Record<string, unknown>;
  /** Whether the full result can be downloaded as one JSON file (`download_url` on the task). */
  download_url_available?: boolean;
}

/** The JSON body POSTed to your `webhook_url`. */
export interface WebhookEvent {
  /** Event id, e.g. `evt_9f2c...`. */
  id: string;
  type: WebhookEventType;
  created_at: string;
  api_version?: string;
  data: {
    task_id: string;
    task_status: 'completed' | 'failed';
    job_type?: string;
    check_status_url?: string;
    /**
     * Raw (unparsed) result of the completed job. For transcription, extraction and tweet jobs it
     * is the same data the job's `result()` parses. For TikTok tasks it is a summary only,
     * {@link TikTokWebhookResult} (a scrape can hold thousands of videos); fetch the videos with
     * `vn.tiktokProfile.resume(task_id).result()`. Omitted when `result_truncated` is true.
     */
    result?: Record<string, unknown> | TikTokWebhookResult | null;
    /** True when the result exceeded 256 KB; fetch it with `resume(task_id).result()` instead. */
    result_truncated?: boolean;
    error?: AsyncJobError | null;
  };
}

/** Header names sent with every webhook delivery. */
export const WEBHOOK_HEADERS = {
  /** Same as the event `type`. */
  event: 'x-vidnavigator-event',
  /** Delivery id, stable across retries — dedupe on this. */
  delivery: 'x-vidnavigator-delivery',
  /** The job's `task_id`. */
  taskId: 'x-vidnavigator-task-id',
  /** `t=<unix_ts>,v1=<hmac_sha256 hex>` */
  signature: 'x-vidnavigator-signature',
} as const;

export interface VerifyWebhookOptions {
  /** Reject deliveries whose timestamp is older (or further in the future) than this. Default 300 (5 minutes). Pass `0` to disable. */
  toleranceSeconds?: number;
  /** Override "now" as a unix timestamp in seconds (useful for tests). */
  now?: number;
}

function parseSignatureHeader(header: string): { timestamp: number; signatures: string[] } | null {
  let timestamp: number | undefined;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === 't') timestamp = Number(value);
    else if (key === 'v1' && value) signatures.push(value);
  }
  if (timestamp === undefined || !Number.isFinite(timestamp) || signatures.length === 0) return null;
  return { timestamp, signatures };
}

function assertValidSignature(
  payload: string | Buffer,
  signatureHeader: string | string[] | undefined,
  secret: string,
  options: VerifyWebhookOptions = {}
): void {
  if (!secret) throw new WebhookSignatureError('A webhook signing secret is required.');
  const header = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  if (!header) throw new WebhookSignatureError('Missing X-VidNavigator-Signature header.');

  const parsed = parseSignatureHeader(header);
  if (!parsed) throw new WebhookSignatureError('Malformed X-VidNavigator-Signature header.');

  const tolerance = options.toleranceSeconds ?? 300;
  const now = options.now ?? Math.floor(Date.now() / 1000);
  if (tolerance > 0 && Math.abs(now - parsed.timestamp) > tolerance) {
    throw new WebhookSignatureError('Webhook timestamp is outside the allowed tolerance.');
  }

  const body = typeof payload === 'string' ? payload : payload.toString('utf8');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${parsed.timestamp}.${body}`)
    .digest();

  const matches = parsed.signatures.some((sig) => {
    if (!/^[0-9a-f]+$/i.test(sig)) return false;
    const received = Buffer.from(sig, 'hex');
    return received.length === expected.length && crypto.timingSafeEqual(received, expected);
  });
  if (!matches) throw new WebhookSignatureError('Webhook signature does not match.');
}

/**
 * Verify the `X-VidNavigator-Signature` header of a webhook delivery.
 *
 * `payload` must be the **raw** request body exactly as received (not re-serialized JSON).
 * Returns `true` when the HMAC-SHA256 signature matches and the timestamp is within tolerance.
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signatureHeader: string | string[] | undefined,
  secret: string,
  options?: VerifyWebhookOptions
): boolean {
  try {
    assertValidSignature(payload, signatureHeader, secret, options);
    return true;
  } catch (error) {
    if (error instanceof WebhookSignatureError) return false;
    throw error;
  }
}

/**
 * Verify a webhook delivery and parse its body into a {@link WebhookEvent}.
 * Throws {@link WebhookSignatureError} when the signature is invalid or stale.
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signatureHeader: string | string[] | undefined,
  secret: string,
  options?: VerifyWebhookOptions
): WebhookEvent {
  assertValidSignature(payload, signatureHeader, secret, options);
  const body = typeof payload === 'string' ? payload : payload.toString('utf8');
  try {
    return JSON.parse(body) as WebhookEvent;
  } catch {
    throw new VidNavigatorError('Webhook payload is not valid JSON.');
  }
}

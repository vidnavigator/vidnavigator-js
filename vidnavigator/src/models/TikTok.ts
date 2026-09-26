import { UsageBlock } from './Usage';
import { AsyncJobError, AsyncJobWebhookStatus } from './AsyncJob';

/** Sort order applied by TikTok itself for keyword searches. */
export type TikTokSearchSortBy = 'relevance' | 'most_liked' | 'newest';

/** Rolling publication window applied by TikTok itself (`this_week` = the last 7 days). */
export type TikTokPublishedWithin =
  | 'all'
  | 'past_24_hours'
  | 'this_week'
  | 'this_month'
  | 'last_3_months'
  | 'last_6_months';

export interface TikTokProfileScrapeRequest {
  profile_url: string;
  max_posts?: number;
  /** Format: YYYY-MM-DD or ISO datetime with timezone */
  after_datetime?: string;
  /** Format: YYYY-MM-DD or ISO datetime with timezone */
  before_datetime?: string;
  min_likes?: number;
  max_likes?: number;
  /**
   * Where to POST a notification when the task finishes. Overrides the account-level default
   * configured in Studio → API; pass an empty string to opt this task out of that default.
   * Must be a publicly reachable https URL. The event's `data.result` is a summary (`stats`, `download_url_available`),
   * not the videos (a scrape can hold thousands); read those with `vn.tiktokProfile.resume(task_id).result()`.
   */
  webhook_url?: string;
}

export interface TikTokSearchRequest {
  query: string;
  max_results?: number;
  parallel_search_slices?: number;
  /** Sort order applied by TikTok. When omitted, results are returned newest first. */
  sort_by?: TikTokSearchSortBy;
  /** Publication window applied by TikTok. Auto-selected from `after_datetime` when omitted. */
  published_within?: TikTokPublishedWithin;
  /** Format: YYYY-MM-DD or ISO datetime with timezone */
  after_datetime?: string;
  /** Format: YYYY-MM-DD or ISO datetime with timezone */
  before_datetime?: string;
  min_likes?: number;
  max_likes?: number;
  min_views?: number;
  max_views?: number;
  /**
   * Where to POST a notification when the task finishes. Overrides the account-level default
   * configured in Studio → API; pass an empty string to opt this task out of that default.
   * Must be a publicly reachable https URL. The event's `data.result` is a summary (`stats`, `download_url_available`);
   * read the results with `vn.tiktokSearch.resume(task_id).result()`.
   */
  webhook_url?: string;
}

function toInteger(value: number | null | undefined): number | null | undefined {
  if (value === null || value === undefined) return value;
  return Math.trunc(value);
}

function toOptionalInteger(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  return Math.trunc(value);
}

function toNullableDate(value: string | null | undefined): Date | null | undefined {
  if (value === null || value === undefined) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeFilters(filters: TikTokProfileFilters | undefined): TikTokProfileFilters | undefined {
  if (!filters) return undefined;
  return {
    max_posts: toInteger(filters.max_posts),
    after_datetime: filters.after_datetime,
    before_datetime: filters.before_datetime,
    min_likes: toInteger(filters.min_likes),
    max_likes: toInteger(filters.max_likes),
  };
}

function normalizeSearchFilters(
  filters: TikTokSearchFilters | undefined
): TikTokSearchFilters | undefined {
  if (!filters) return undefined;
  return {
    sort_by: filters.sort_by,
    published_within: filters.published_within,
    after_datetime: filters.after_datetime,
    before_datetime: filters.before_datetime,
    min_likes: toInteger(filters.min_likes),
    max_likes: toInteger(filters.max_likes),
    min_views: toInteger(filters.min_views),
    max_views: toInteger(filters.max_views),
  };
}

function normalizeStats(stats: TikTokProfileStats | undefined): TikTokProfileStats | undefined {
  if (!stats) return undefined;
  return {
    videos_scanned: toOptionalInteger(stats.videos_scanned),
    videos_matched: toOptionalInteger(stats.videos_matched),
    pages_consumed: toOptionalInteger(stats.pages_consumed),
  };
}

function normalizeSearchStats(stats: TikTokSearchStats | undefined): TikTokSearchStats | undefined {
  if (!stats) return undefined;
  return {
    pages_fetched: toOptionalInteger(stats.pages_fetched),
    results_count: toOptionalInteger(stats.results_count),
    next_search_cursor: toInteger(stats.next_search_cursor),
    sort_by: stats.sort_by,
    published_within: stats.published_within,
  };
}

function normalizePagination(
  pagination: TikTokProfilePagination | undefined
): TikTokProfilePagination | undefined {
  if (!pagination) return undefined;
  return {
    limit: toOptionalInteger(pagination.limit),
    offset: toOptionalInteger(pagination.offset),
    total_items: toOptionalInteger(pagination.total_items),
    has_next: pagination.has_next,
    has_prev: pagination.has_prev,
    next_cursor: pagination.next_cursor,
    prev_cursor: pagination.prev_cursor,
  };
}

export interface TikTokProfileScrapeSubmissionJSON {
  task_id: string;
  task_status: 'processing';
  profile_url: string;
  expires_at?: string;
  check_status_url?: string;
  message?: string;
  webhook_url?: string | null;
}

export class TikTokProfileScrapeSubmission {
  task_id: string;
  task_status: 'processing';
  profile_url: string;
  expires_at?: string;
  check_status_url?: string;
  message?: string;
  /** The URL this task's result notification will be POSTed to, or `null`. */
  webhook_url?: string | null;

  constructor(data: TikTokProfileScrapeSubmissionJSON) {
    this.task_id = data.task_id;
    this.task_status = data.task_status;
    this.profile_url = data.profile_url;
    this.expires_at = data.expires_at;
    this.check_status_url = data.check_status_url;
    this.message = data.message;
    this.webhook_url = data.webhook_url;
  }

  static fromJSON(json: TikTokProfileScrapeSubmissionJSON): TikTokProfileScrapeSubmission {
    return new TikTokProfileScrapeSubmission(json);
  }
}

export interface TikTokSearchSubmissionJSON {
  task_id: string;
  task_status: 'processing';
  query: string;
  max_results?: number;
  parallel_search_slices?: number;
  filters?: Record<string, unknown>;
  expires_at?: string;
  check_status_url?: string;
  message?: string;
  webhook_url?: string | null;
}

export class TikTokSearchSubmission {
  task_id: string;
  task_status: 'processing';
  query: string;
  max_results?: number;
  parallel_search_slices?: number;
  filters?: Record<string, unknown>;
  expires_at?: string;
  check_status_url?: string;
  message?: string;
  /** The URL this task's result notification will be POSTed to, or `null`. */
  webhook_url?: string | null;

  constructor(data: TikTokSearchSubmissionJSON) {
    this.task_id = data.task_id;
    this.task_status = data.task_status;
    this.query = data.query;
    this.max_results = toOptionalInteger(data.max_results);
    this.parallel_search_slices = toOptionalInteger(data.parallel_search_slices);
    this.filters = data.filters;
    this.expires_at = data.expires_at;
    this.check_status_url = data.check_status_url;
    this.message = data.message;
    this.webhook_url = data.webhook_url;
  }

  static fromJSON(json: TikTokSearchSubmissionJSON): TikTokSearchSubmission {
    return new TikTokSearchSubmission(json);
  }
}

export interface TikTokVideoJSON {
  id?: string;
  track?: string | null;
  artists?: string[];
  duration?: number | null;
  title?: string | null;
  description?: string | null;
  timestamp?: number | null;
  published_at?: string | null;
  views?: number | null;
  likes?: number | null;
  reposts?: number | null;
  comments?: number | null;
  thumbnails?: Array<Record<string, unknown>>;
  url?: string;
}

export class TikTokVideo {
  id?: string;
  track?: string | null;
  artists?: string[];
  duration?: number | null;
  title?: string | null;
  description?: string | null;
  timestamp?: number | null;
  published_at?: Date | null;
  views?: number | null;
  likes?: number | null;
  reposts?: number | null;
  comments?: number | null;
  thumbnails?: Array<Record<string, unknown>>;
  url?: string;

  constructor(data: TikTokVideoJSON) {
    this.id = data.id;
    this.track = data.track;
    this.artists = data.artists;
    this.duration = toInteger(data.duration);
    this.title = data.title;
    this.description = data.description;
    this.timestamp = toInteger(data.timestamp);
    this.published_at = toNullableDate(data.published_at);
    this.views = toInteger(data.views);
    this.likes = toInteger(data.likes);
    this.reposts = toInteger(data.reposts);
    this.comments = toInteger(data.comments);
    this.thumbnails = data.thumbnails;
    this.url = data.url;
  }

  static fromJSON(json: TikTokVideoJSON): TikTokVideo {
    return new TikTokVideo(json);
  }
}

export interface TikTokProfileFilters {
  max_posts?: number | null;
  after_datetime?: string | null;
  before_datetime?: string | null;
  min_likes?: number | null;
  max_likes?: number | null;
}

export interface TikTokProfileStats {
  videos_scanned?: number;
  videos_matched?: number;
  pages_consumed?: number;
}

export interface TikTokProfilePagination {
  limit?: number;
  offset?: number;
  total_items?: number;
  has_next?: boolean;
  has_prev?: boolean;
  next_cursor?: string | null;
  prev_cursor?: string | null;
}

export interface TikTokSearchAuthor {
  id?: string | null;
  unique_id?: string | null;
  nickname?: string | null;
  sec_uid?: string | null;
}

export interface TikTokSearchResultStats {
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  collects?: number | null;
}

export interface TikTokSearchMusic {
  id?: string | null;
  title?: string | null;
  author_name?: string | null;
  duration?: number | null;
}

export interface TikTokSearchResultJSON {
  id?: string | null;
  item_type?: number | null;
  description?: string | null;
  timestamp?: number | null;
  published_at?: string | null;
  author?: TikTokSearchAuthor;
  stats?: TikTokSearchResultStats;
  music?: TikTokSearchMusic;
  duration?: number | null;
  hashtags?: string[];
  url?: string | null;
}

export class TikTokSearchResult {
  id?: string | null;
  item_type?: number | null;
  description?: string | null;
  timestamp?: number | null;
  published_at?: Date | null;
  author?: TikTokSearchAuthor;
  stats?: TikTokSearchResultStats;
  music?: TikTokSearchMusic;
  duration?: number | null;
  hashtags?: string[];
  url?: string | null;

  constructor(data: TikTokSearchResultJSON) {
    this.id = data.id;
    this.item_type = toInteger(data.item_type);
    this.description = data.description;
    this.timestamp = toInteger(data.timestamp);
    this.published_at = toNullableDate(data.published_at);
    this.author = data.author;
    this.stats = data.stats
      ? {
          views: toInteger(data.stats.views),
          likes: toInteger(data.stats.likes),
          comments: toInteger(data.stats.comments),
          shares: toInteger(data.stats.shares),
          collects: toInteger(data.stats.collects),
        }
      : undefined;
    this.music = data.music
      ? {
          ...data.music,
          duration: toInteger(data.music.duration),
        }
      : undefined;
    this.duration = toInteger(data.duration);
    this.hashtags = data.hashtags;
    this.url = data.url;
  }

  static fromJSON(json: TikTokSearchResultJSON): TikTokSearchResult {
    return new TikTokSearchResult(json);
  }
}

export interface TikTokSearchFilters {
  sort_by?: TikTokSearchSortBy | null;
  published_within?: TikTokPublishedWithin | null;
  after_datetime?: string | null;
  before_datetime?: string | null;
  min_likes?: number | null;
  max_likes?: number | null;
  min_views?: number | null;
  max_views?: number | null;
}

export interface TikTokSearchStats {
  pages_fetched?: number;
  results_count?: number;
  next_search_cursor?: number | null;
  /** Sort order the search ran with (`relevance` when `sort_by` was omitted). */
  sort_by?: TikTokSearchSortBy;
  /** Date window the search ran with; `all` means no window. */
  published_within?: TikTokPublishedWithin;
}

export interface TikTokProfileTaskJSON {
  task_id: string;
  task_status: 'processing' | 'completed' | 'failed';
  profile_url?: string;
  profile?: Record<string, unknown> | null;
  filters?: TikTokProfileFilters;
  stats?: TikTokProfileStats;
  videos?: TikTokVideoJSON[];
  pagination?: TikTokProfilePagination;
  download_url?: string | null;
  error_message?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  expires_at?: string | null;
  error?: AsyncJobError | null;
  webhook?: AsyncJobWebhookStatus | null;
}

export class TikTokProfileTask {
  task_id: string;
  task_status: 'processing' | 'completed' | 'failed';
  profile_url?: string;
  profile?: Record<string, unknown> | null;
  filters?: TikTokProfileFilters;
  stats?: TikTokProfileStats;
  videos: TikTokVideo[];
  pagination?: TikTokProfilePagination;
  download_url?: string | null;
  /** @deprecated Use `error`, which carries a machine-readable code. */
  error_message?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  expires_at?: string | null;
  /** Present when `task_status === 'failed'`: error code, message and HTTP status. */
  error: AsyncJobError | null;
  /** Webhook delivery state, or `null` when no webhook was configured. */
  webhook?: AsyncJobWebhookStatus | null;
  /** Per-call usage, populated only when polled with `include_usage=true` and `task_status=completed`. */
  usage?: UsageBlock;

  constructor(data: TikTokProfileTaskJSON) {
    this.task_id = data.task_id;
    this.task_status = data.task_status;
    this.profile_url = data.profile_url;
    this.profile = data.profile;
    this.filters = normalizeFilters(data.filters);
    this.stats = normalizeStats(data.stats);
    this.videos = data.videos?.map(TikTokVideo.fromJSON) ?? [];
    this.pagination = normalizePagination(data.pagination);
    this.download_url = data.download_url;
    this.error_message = data.error_message;
    this.created_at = data.created_at;
    this.completed_at = data.completed_at;
    this.expires_at = data.expires_at;
    this.error = data.error ?? null;
    this.webhook = data.webhook;
  }

  static fromJSON(json: TikTokProfileTaskJSON): TikTokProfileTask {
    return new TikTokProfileTask(json);
  }
}

export interface TikTokSearchTaskJSON {
  task_id: string;
  task_status: 'processing' | 'completed' | 'failed';
  query?: string;
  parallel_search_slices?: number;
  filters?: TikTokSearchFilters;
  stats?: TikTokSearchStats;
  results?: TikTokSearchResultJSON[];
  pagination?: TikTokProfilePagination;
  download_url?: string | null;
  error_message?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  expires_at?: string | null;
  error?: AsyncJobError | null;
  webhook?: AsyncJobWebhookStatus | null;
}

export class TikTokSearchTask {
  task_id: string;
  task_status: 'processing' | 'completed' | 'failed';
  query?: string;
  parallel_search_slices?: number;
  filters?: TikTokSearchFilters;
  stats?: TikTokSearchStats;
  results: TikTokSearchResult[];
  pagination?: TikTokProfilePagination;
  download_url?: string | null;
  /** @deprecated Use `error`, which carries a machine-readable code. */
  error_message?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  expires_at?: string | null;
  /** Present when `task_status === 'failed'`: error code, message and HTTP status. */
  error: AsyncJobError | null;
  /** Webhook delivery state, or `null` when no webhook was configured. */
  webhook?: AsyncJobWebhookStatus | null;
  /** Per-call usage, populated only when polled with `include_usage=true` and `task_status=completed`. */
  usage?: UsageBlock;

  constructor(data: TikTokSearchTaskJSON) {
    this.task_id = data.task_id;
    this.task_status = data.task_status;
    this.query = data.query;
    this.parallel_search_slices = toOptionalInteger(data.parallel_search_slices);
    this.filters = normalizeSearchFilters(data.filters);
    this.stats = normalizeSearchStats(data.stats);
    this.results = data.results?.map(TikTokSearchResult.fromJSON) ?? [];
    this.pagination = normalizePagination(data.pagination);
    this.download_url = data.download_url;
    this.error_message = data.error_message;
    this.created_at = data.created_at;
    this.completed_at = data.completed_at;
    this.expires_at = data.expires_at;
    this.error = data.error ?? null;
    this.webhook = data.webhook;
  }

  static fromJSON(json: TikTokSearchTaskJSON): TikTokSearchTask {
    return new TikTokSearchTask(json);
  }
}

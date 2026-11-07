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
   * Two-letter country code (`'fr'`, `'de'`, `'jp'`, ...) whose TikTok results you get. Default `'gb'`.
   * `'us'` is refused: TikTok asks US visitors to log in. The API lists the accepted codes.
   */
  country?: string;
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
  const normalized: TikTokSearchStats = {
    pages_fetched: toOptionalInteger(stats.pages_fetched),
    videos_fetched: toOptionalInteger(stats.videos_fetched),
    results_count: toOptionalInteger(stats.results_count),
    next_search_cursor: toInteger(stats.next_search_cursor),
    parallel_search_slices: toOptionalInteger(stats.parallel_search_slices),
    sort_by: stats.sort_by,
    published_within: stats.published_within,
    country: stats.country,
    items_examined: toOptionalInteger(stats.items_examined),
    items_filtered_out: toOptionalInteger(stats.items_filtered_out),
    items_deduplicated: toOptionalInteger(stats.items_deduplicated),
  };
  // Leave out what the API did not send (the items_* counters are conditional).
  for (const key of Object.keys(normalized) as Array<keyof TikTokSearchStats>) {
    if (normalized[key] === undefined) delete normalized[key];
  }
  return normalized;
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
  country?: string;
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
  /** Country whose TikTok results the search returns. */
  country?: string;
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
    this.country = data.country;
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
  /**
   * Distinct videos TikTok returned, including those your filters dropped. Billed at
   * 1 `residential_request` per 30, minimum 1 per search.
   */
  videos_fetched?: number;
  results_count?: number;
  next_search_cursor?: number | null;
  /** Slice count the search actually ran with. */
  parallel_search_slices?: number;
  /** Sort order the search ran with (`relevance` when `sort_by` was omitted). */
  sort_by?: TikTokSearchSortBy;
  /** Date window the search ran with; `all` means no window. */
  published_within?: TikTokPublishedWithin;
  /** Country whose TikTok results the search returned. */
  country?: string;
  /** Only when filters were set: videos checked against them. */
  items_examined?: number;
  /** Only when filters were set: videos they dropped. */
  items_filtered_out?: number;
  /** Only with `parallel_search_slices` > 1: videos several slices returned, counted once. */
  items_deduplicated?: number;
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
  country?: string;
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
  /** Country whose TikTok results the search returned (`gb` by default). */
  country?: string;
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
    this.country = data.country;
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

// --- LIVE search ---

export interface TikTokLiveSearchRequest {
  query: string;
  /** Cap on rooms. `0` or omitted means as many as TikTok serves, about 50 per keyword. */
  max_results?: number;
  /** Two-letter country code whose LIVE rooms you get. Default `'us'`. The API lists the accepted codes. */
  country?: string;
  /**
   * The API returns each room's playback URLs by default (FLV and HLS by quality, plus an
   * audio-only stream). Pass `false` to leave them out.
   */
  include_stream_urls?: boolean;
  /**
   * Where to POST a notification when the task finishes. Overrides the account-level default
   * configured in Studio → API; pass an empty string to opt this task out of that default.
   * The event's `data.result` is a summary; read the rooms with `vn.tiktokLiveSearch.resume(task_id).result()`.
   */
  webhook_url?: string;
}

export interface TikTokLiveSearchSubmissionJSON {
  task_id: string;
  task_status: 'processing';
  query: string;
  country?: string;
  max_results?: number;
  include_stream_urls?: boolean;
  expires_at?: string;
  check_status_url?: string;
  message?: string;
  webhook_url?: string | null;
}

export class TikTokLiveSearchSubmission {
  task_id: string;
  task_status: 'processing';
  query: string;
  country?: string;
  max_results?: number;
  include_stream_urls?: boolean;
  expires_at?: string;
  check_status_url?: string;
  message?: string;
  /** The URL this task's result notification will be POSTed to, or `null`. */
  webhook_url?: string | null;

  constructor(data: TikTokLiveSearchSubmissionJSON) {
    this.task_id = data.task_id;
    this.task_status = data.task_status;
    this.query = data.query;
    this.country = data.country;
    this.max_results = toOptionalInteger(data.max_results);
    this.include_stream_urls = data.include_stream_urls;
    this.expires_at = data.expires_at;
    this.check_status_url = data.check_status_url;
    this.message = data.message;
    this.webhook_url = data.webhook_url;
  }

  static fromJSON(json: TikTokLiveSearchSubmissionJSON): TikTokLiveSearchSubmission {
    return new TikTokLiveSearchSubmission(json);
  }
}

export interface TikTokLiveAuthor {
  id?: string | null;
  /** Username, without @. */
  unique_id?: string | null;
  nickname?: string | null;
  sec_uid?: string | null;
  followers?: number | null;
  avatar_url?: string | null;
}

export interface TikTokLiveStats {
  /** Watching when the search ran. */
  viewers?: number | null;
  /** Since the LIVE started. */
  total_viewers?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
}

/** Quality keys of the playback URLs: those the LIVE offers, best first. */
export type TikTokLiveQuality = 'origin' | 'uhd' | 'hd' | 'sd' | 'ld' | (string & {});

export interface TikTokLiveStreamUrlsJSON {
  default_quality?: TikTokLiveQuality | null;
  flv?: Record<string, string>;
  hls?: Record<string, string>;
  audio_only?: string | null;
  expires_at?: string | null;
}

/** Playback URLs of a LIVE room. They stop working when the LIVE ends. */
export interface TikTokLiveStreamUrls {
  /** The quality TikTok plays by default (a key of `flv`). */
  default_quality: TikTokLiveQuality | null;
  /** HTTP-FLV URLs keyed by quality. */
  flv: Record<string, string>;
  /** HLS (`.m3u8`) URLs keyed by quality, when TikTok provides them. Can be empty. */
  hls: Record<string, string>;
  /** HTTP-FLV URL of the audio-only stream. */
  audio_only: string | null;
  /** Expiry of the URL signatures. */
  expires_at: Date | null;
}

export interface TikTokLiveRoomJSON {
  id?: string | null;
  title?: string | null;
  url?: string | null;
  started_at?: string | null;
  author?: TikTokLiveAuthor;
  stats?: TikTokLiveStats;
  hashtags?: string[];
  category?: string | null;
  game_tags?: string[];
  cover_url?: string | null;
  stream_urls?: TikTokLiveStreamUrlsJSON;
}

/** A TikTok LIVE room that was broadcasting when the search ran. */
export class TikTokLiveRoom {
  id?: string | null;
  title?: string | null;
  /** `https://www.tiktok.com/@username/live` */
  url?: string | null;
  started_at?: Date | null;
  author?: TikTokLiveAuthor;
  stats?: TikTokLiveStats;
  /** `#tags` written in the title, without `#`. */
  hashtags: string[];
  /** The LIVE's category on TikTok, e.g. `'Gaming'`. */
  category?: string | null;
  game_tags: string[];
  cover_url?: string | null;
  /** Absent when the search was submitted with `include_stream_urls: false`. */
  stream_urls?: TikTokLiveStreamUrls;

  constructor(data: TikTokLiveRoomJSON) {
    this.id = data.id;
    this.title = data.title;
    this.url = data.url;
    this.started_at = toNullableDate(data.started_at);
    this.author = data.author
      ? { ...data.author, followers: toInteger(data.author.followers) }
      : undefined;
    this.stats = data.stats
      ? {
          viewers: toInteger(data.stats.viewers),
          total_viewers: toInteger(data.stats.total_viewers),
          likes: toInteger(data.stats.likes),
          comments: toInteger(data.stats.comments),
          shares: toInteger(data.stats.shares),
        }
      : undefined;
    this.hashtags = data.hashtags ?? [];
    this.category = data.category;
    this.game_tags = data.game_tags ?? [];
    this.cover_url = data.cover_url;
    if (data.stream_urls) {
      this.stream_urls = {
        default_quality: data.stream_urls.default_quality ?? null,
        flv: data.stream_urls.flv ?? {},
        hls: data.stream_urls.hls ?? {},
        audio_only: data.stream_urls.audio_only ?? null,
        expires_at: toNullableDate(data.stream_urls.expires_at) ?? null,
      };
    }
  }

  static fromJSON(json: TikTokLiveRoomJSON): TikTokLiveRoom {
    return new TikTokLiveRoom(json);
  }
}

// --- LIVE room ---

/** Exactly one of `room_id`, `username` or `url`. */
export interface TikTokLiveRoomRequest {
  /**
   * A LIVE room ID, e.g. the `id` of a LIVE search room. Pass it as a string: room IDs have more
   * digits than a JavaScript number holds.
   */
  room_id?: string;
  /** The streamer, with or without `@`: their current LIVE, or their last one when they are offline. */
  username?: string;
  /** `https://www.tiktok.com/@username/live`, the profile URL, or a room's `share_url`. */
  url?: string;
  /**
   * Also return the latest comments (up to 50, newest first), the pinned comment, the intro and the
   * top viewers. Bills 2 `residential_request` instead of 1. Default `false`.
   */
  include_comments?: boolean;
  /** At most this many comments, 1-50 (default 50). */
  comments_limit?: number;
  /** Playback URLs are returned by default; pass `false` to leave them out. */
  include_stream_urls?: boolean;
  /** Add the `usage` block to the result. */
  include_usage?: boolean;
}

export interface TikTokLiveRoomAuthor extends TikTokLiveAuthor {
  bio?: string | null;
  /** Accounts the streamer follows. */
  following?: number | null;
}

/** A single room's counters. Likes, comments and shares come with LIVE search only. */
export interface TikTokLiveRoomStats {
  /** Watching now (0 once the LIVE has ended). */
  viewers?: number | null;
  /** Since the LIVE started. */
  total_viewers?: number | null;
  /** Followers the streamer gained during this LIVE. */
  new_followers?: number | null;
}

export interface TikTokLiveRoomDetailJSON extends TikTokLiveRoomJSON {
  author?: TikTokLiveRoomAuthor;
  stats?: TikTokLiveRoomStats;
  status?: 'live' | 'ended' | 'unknown';
  ended_at?: string | null;
  share_url?: string | null;
  age_restricted?: boolean;
  subscribers_only?: boolean;
  chat_enabled?: boolean;
  products?: number;
}

/** One LIVE room, as `getTikTokLiveRoom` returns it. */
export class TikTokLiveRoomDetail extends TikTokLiveRoom {
  declare author?: TikTokLiveRoomAuthor;
  declare stats?: TikTokLiveRoomStats;
  /** `'live'` while broadcasting, `'ended'` once finished. */
  status?: 'live' | 'ended' | 'unknown';
  ended_at?: Date | null;
  /** The room's share link; it can be passed back as `url`. */
  share_url?: string | null;
  age_restricted?: boolean;
  /** Only the streamer's paying subscribers can watch. */
  subscribers_only?: boolean;
  chat_enabled?: boolean;
  /** Products on sale in the LIVE. */
  products?: number;

  constructor(data: TikTokLiveRoomDetailJSON) {
    super(data);
    this.author = data.author
      ? { ...data.author, followers: toInteger(data.author.followers), following: toInteger(data.author.following) }
      : undefined;
    this.stats = data.stats
      ? {
          viewers: toInteger(data.stats.viewers),
          total_viewers: toInteger(data.stats.total_viewers),
          new_followers: toInteger(data.stats.new_followers),
        }
      : undefined;
    this.status = data.status;
    this.ended_at = toNullableDate(data.ended_at);
    this.share_url = data.share_url;
    this.age_restricted = data.age_restricted;
    this.subscribers_only = data.subscribers_only;
    this.chat_enabled = data.chat_enabled;
    this.products = toOptionalInteger(data.products);
  }

  get isLive(): boolean {
    return this.status === 'live';
  }

  static fromJSON(json: TikTokLiveRoomDetailJSON): TikTokLiveRoomDetail {
    return new TikTokLiveRoomDetail(json);
  }
}

export interface TikTokLiveCommentJSON {
  id?: string | null;
  text?: string | null;
  language?: string | null;
  created_at?: string | null;
  author?: TikTokLiveAuthor;
  author_is_follower?: boolean;
  author_is_moderator?: boolean;
  author_is_subscriber?: boolean;
}

/** A comment posted in a LIVE's chat. */
export interface TikTokLiveComment {
  id?: string | null;
  text?: string | null;
  /** ISO 639-1 code TikTok detected, or `null`. */
  language?: string | null;
  created_at?: Date | null;
  author?: TikTokLiveAuthor;
  author_is_follower?: boolean;
  author_is_moderator?: boolean;
  /** A paying subscriber of the streamer. */
  author_is_subscriber?: boolean;
}

/** One of a LIVE's top viewers, ranked by the gifts they sent. */
export interface TikTokLiveTopViewer {
  rank?: number | null;
  score?: number | null;
  user?: TikTokLiveAuthor;
}

export interface TikTokLiveRoomResultJSON {
  room: TikTokLiveRoomDetailJSON;
  comments?: TikTokLiveCommentJSON[];
  pinned_comment?: TikTokLiveCommentJSON | null;
  intro?: string | null;
  top_viewers?: TikTokLiveTopViewer[];
}

export interface TikTokLiveRoomResult {
  room: TikTokLiveRoomDetail;
  /** Latest comments, newest first (TikTok keeps about the last 50). Only with `include_comments`. */
  comments?: TikTokLiveComment[];
  /** The comment the streamer pinned. Only with `include_comments`. */
  pinned_comment?: TikTokLiveComment | null;
  /** The LIVE's intro text. Only with `include_comments`. */
  intro?: string | null;
  /** Top viewers by gifts sent. Only with `include_comments`. */
  top_viewers?: TikTokLiveTopViewer[];
  /** Present when called with `include_usage: true`. */
  usage?: UsageBlock;
}

function liveCommentFromJSON(json: TikTokLiveCommentJSON): TikTokLiveComment {
  return {
    ...json,
    created_at: toNullableDate(json.created_at),
    author: json.author ? { ...json.author, followers: toInteger(json.author.followers) } : undefined,
  };
}

export function tiktokLiveRoomResultFromJSON(json: TikTokLiveRoomResultJSON): TikTokLiveRoomResult {
  const result: TikTokLiveRoomResult = { room: TikTokLiveRoomDetail.fromJSON(json.room) };
  if (json.comments !== undefined) result.comments = (json.comments ?? []).map(liveCommentFromJSON);
  if (json.pinned_comment !== undefined) {
    result.pinned_comment = json.pinned_comment ? liveCommentFromJSON(json.pinned_comment) : null;
  }
  if (json.intro !== undefined) result.intro = json.intro;
  if (json.top_viewers !== undefined) {
    result.top_viewers = (json.top_viewers ?? []).map((v) => ({
      ...v,
      rank: toInteger(v.rank),
      score: toInteger(v.score),
    }));
  }
  return result;
}

export interface TikTokLiveSearchStats {
  /** TikTok pages fetched (up to 50 rooms each). */
  pages_fetched?: number;
  /**
   * Distinct rooms TikTok returned, including any past `max_results`. Billed at
   * 1 `residential_request` per 30, minimum 1 per search.
   */
  rooms_fetched?: number;
  results_count?: number;
  /** Whether TikTok had more rooms when the search stopped. */
  has_more?: boolean;
  country?: string;
}

export interface TikTokLiveSearchTaskJSON {
  task_id: string;
  task_status: 'processing' | 'completed' | 'failed';
  query?: string;
  country?: string;
  stats?: TikTokLiveSearchStats;
  results?: TikTokLiveRoomJSON[];
  pagination?: TikTokProfilePagination;
  download_url?: string | null;
  error_message?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  expires_at?: string | null;
  error?: AsyncJobError | null;
  webhook?: AsyncJobWebhookStatus | null;
}

export class TikTokLiveSearchTask {
  task_id: string;
  task_status: 'processing' | 'completed' | 'failed';
  query?: string;
  /** Country whose LIVE rooms the search returned (`us` by default). */
  country?: string;
  stats?: TikTokLiveSearchStats;
  /** Rooms in TikTok's ranking. */
  results: TikTokLiveRoom[];
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

  constructor(data: TikTokLiveSearchTaskJSON) {
    this.task_id = data.task_id;
    this.task_status = data.task_status;
    this.query = data.query;
    this.country = data.country;
    this.stats = data.stats
      ? {
          ...data.stats,
          pages_fetched: toOptionalInteger(data.stats.pages_fetched),
          rooms_fetched: toOptionalInteger(data.stats.rooms_fetched),
          results_count: toOptionalInteger(data.stats.results_count),
        }
      : undefined;
    this.results = data.results?.map(TikTokLiveRoom.fromJSON) ?? [];
    this.pagination = normalizePagination(data.pagination);
    this.download_url = data.download_url;
    this.error_message = data.error_message;
    this.created_at = data.created_at;
    this.completed_at = data.completed_at;
    this.expires_at = data.expires_at;
    this.error = data.error ?? null;
    this.webhook = data.webhook;
  }

  static fromJSON(json: TikTokLiveSearchTaskJSON): TikTokLiveSearchTask {
    return new TikTokLiveSearchTask(json);
  }
}

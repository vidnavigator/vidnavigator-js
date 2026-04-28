export interface TikTokProfileScrapeRequest {
  profile_url: string;
  max_posts?: number;
  /** Format: YYYY-MM-DD or ISO datetime with timezone */
  after_datetime?: string;
  /** Format: YYYY-MM-DD or ISO datetime with timezone */
  before_datetime?: string;
  min_likes?: number;
  max_likes?: number;
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

function normalizeStats(stats: TikTokProfileStats | undefined): TikTokProfileStats | undefined {
  if (!stats) return undefined;
  return {
    videos_scanned: toOptionalInteger(stats.videos_scanned),
    videos_matched: toOptionalInteger(stats.videos_matched),
    pages_consumed: toOptionalInteger(stats.pages_consumed),
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
}

export class TikTokProfileScrapeSubmission {
  task_id: string;
  task_status: 'processing';
  profile_url: string;
  expires_at?: string;
  check_status_url?: string;
  message?: string;

  constructor(data: TikTokProfileScrapeSubmissionJSON) {
    this.task_id = data.task_id;
    this.task_status = data.task_status;
    this.profile_url = data.profile_url;
    this.expires_at = data.expires_at;
    this.check_status_url = data.check_status_url;
    this.message = data.message;
  }

  static fromJSON(json: TikTokProfileScrapeSubmissionJSON): TikTokProfileScrapeSubmission {
    return new TikTokProfileScrapeSubmission(json);
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
  error_message?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  expires_at?: string | null;

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
  }

  static fromJSON(json: TikTokProfileTaskJSON): TikTokProfileTask {
    return new TikTokProfileTask(json);
  }
}

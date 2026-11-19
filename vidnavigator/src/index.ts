import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import {
  VideoInfo,
  VideoInfoJSON,
  TranscriptSegmentJSON,
  TranscriptOutput,
  transcriptFromJSON,
  FileInfo,
  FileInfoJSON,
  AnalysisResult,
  AnalysisResultJSON,
  VideoSearchResult,
  VideoSearchResultJSON,
  FileSearchResult,
  FileSearchResultJSON,
  UsageData,
  UsageDataJSON,
  Namespace,
  NamespaceJSON,
  NamespaceRef,
  NamespaceRefJSON,
  ExtractionEvidence,
  ExtractionSchema,
  UsageBlock,
  UsageBlockJSON,
  CarouselInfo,
  CarouselInfoJSON,
  CarouselVideoResult,
  CarouselVideoResultJSON,
  TikTokProfileScrapeRequest,
  TikTokProfileScrapeSubmission,
  TikTokProfileScrapeSubmissionJSON,
  TikTokProfileTask,
  TikTokProfileTaskJSON,
  TikTokSearchRequest,
  TikTokSearchSubmission,
  TikTokSearchSubmissionJSON,
  TikTokSearchTask,
  TikTokSearchTaskJSON,
  TikTokLiveSearchRequest,
  TikTokLiveSearchSubmission,
  TikTokLiveSearchSubmissionJSON,
  TikTokLiveSearchTask,
  TikTokLiveSearchTaskJSON,
  TikTokLiveRoomRequest,
  TikTokLiveRoomResult,
  TikTokLiveRoomResultJSON,
  tiktokLiveRoomResultFromJSON,
  TweetStatement,
  WatchResult,
  WatchResultJSON,
  WatchTranscriptError,
  VideoScene,
  VideoSceneJSON,
  ScenesError,
  FileScenesStatus,
  AsyncJob,
  AsyncJobJSON,
  AsyncJobAccepted,
  AsyncJobAcceptedJSON,
  TikTokProfilePagination,
} from './models';
import { VidNavigatorError, PaymentRequiredError } from './errors';
import { buildApiError } from './http';
import { Job, JobInfo, JobOperation, PollableTask, PollOptions, RunOptions, SubmitOptions } from './jobs';

export * from './models';
export * from './errors';
export * from './webhooks';
export { Job } from './jobs';
export type { TaskStatus, PollableTask, PollOptions, JobOperation, SubmitOptions, RunOptions, JobInfo } from './jobs';

/** SDK version (keep in sync with package.json) */
export const SDK_VERSION = '2.7.0';

/**
 * A LIVE room usually answers in 1-5 s, up to ~30 s when the API has to open a TikTok page, and two
 * minutes at worst. A shorter configured axios timeout is raised to this for that call only.
 */
const LIVE_ROOM_TIMEOUT_MS = 120_000;

//region --- Interfaces ---
export interface SDKConfig {
  apiKey: string;
  baseURL?: string;
  axiosConfig?: AxiosRequestConfig;
}

interface ApiSuccessResponse<T> {
  status: 'success';
  data: T;
  usage?: UsageBlockJSON;
}

export type TranscriptRequestPayload = {
  video_url: string;
  language?: string;
  metadata_only?: boolean;
  fallback_to_metadata?: boolean;
  transcript_text?: boolean;
  include_usage?: boolean;
};

export type TranscribeVideoPayload = {
  video_url: string;
  transcript_text?: boolean;
  all_videos?: boolean;
  include_usage?: boolean;
} & WebhookOption;

/**
 * Where to POST a notification when an async job finishes. Overrides the account-level default
 * configured in Studio → API; pass an empty string to opt this job out of that default.
 * Must be a publicly reachable https URL. This is a pass-through: polling always works either way.
 */
export type WebhookOption = { webhook_url?: string };

/** Input for {@link VidNavigatorClient.transcribe}. A plain string is treated as `video_url`. */
export type TranscribeInput = {
  video_url: string;
  transcript_text?: boolean;
  /** Instagram carousel posts only: transcribe every video in the post. */
  all_videos?: boolean;
} & WebhookOption;

/** How closely {@link VidNavigatorClient.watch} follows the picture. */
export type WatchDetail = 'low' | 'auto' | 'high';

/** Input for {@link VidNavigatorClient.watch}. A plain string is treated as `video_url`. */
export type WatchInput = {
  /** `?img_index=N` selects one video of an Instagram carousel or a Snapchat highlight. */
  video_url: string;
  /**
   * How closely the picture is followed. Default `auto`. The number of frames depends on the
   * video at every level; a higher level analyzes more frames when the picture changes often.
   */
  detail?: WatchDetail;
  /** Default true. `false` returns the scenes only: the result has no `transcript`. */
  include_transcript?: boolean;
  /** Return the transcript as a single string instead of segments. */
  transcript_text?: boolean;
} & WebhookOption;

/** Payload of {@link VidNavigatorClient.watchVideo}: a {@link WatchInput} with `include_usage`. */
export type WatchVideoPayload = WatchInput & { include_usage?: boolean };

/** Input for {@link VidNavigatorClient.analyze}. A plain string is treated as `video_url`. */
export type AnalyzeVideoInput = {
  video_url: string;
  /** Optional question about the video. */
  query?: string;
  /**
   * Default false. `true` also reads what the video shows: the analysis is made from the
   * transcript and the scenes together, and the result has `scenes` and `frames_analyzed`.
   */
  include_scenes?: boolean;
  /** Return the transcript as a single string instead of segments. */
  transcript_text?: boolean;
} & WebhookOption;

/**
 * Input for {@link VidNavigatorClient.extractVideo}: a JSON Schema `schema`, or a JSON/YAML
 * `schemaFilePath`, or neither with `what_to_extract`: the schema is then written from that text
 * and comes back as `schema` on the result.
 */
export type ExtractVideoInput =
  | ({
      video_url: string;
      /** The fields to extract, as a standard JSON Schema. Optional when `what_to_extract` is given. */
      schema?: ExtractionSchema;
      /** What to extract, in plain words. Guides the extraction, or alone, writes the schema. */
      what_to_extract?: string;
      /** Speech-to-text the audio when no platform transcript exists. Default true. */
      transcribe?: boolean;
      /**
       * Default false. `true` also reads what the video shows: the fields are extracted from the
       * transcript and the scenes together, and the result has `frames_analyzed`.
       */
      include_scenes?: boolean;
    } & WebhookOption)
  | ({
      video_url: string;
      /** Path to a JSON or YAML schema file (sent as multipart form-data). */
      schemaFilePath: string;
      what_to_extract?: string;
      transcribe?: boolean;
      include_scenes?: boolean;
    } & WebhookOption);

/** Input for {@link VidNavigatorClient.tweetStatement}. A plain string is treated as `tweet_id`. */
export type TweetStatementInput = { tweet_id: string } & WebhookOption;

export type TranscriptResult = {
  video_info: VideoInfo;
  transcript: TranscriptOutput;
  usage?: UsageBlock;
};

export type TranscribeVideoSingleResult = {
  video_info: VideoInfo;
  transcript: TranscriptOutput;
  usage?: UsageBlock;
};

export type TranscribeVideoCarouselResult = {
  carousel_info: CarouselInfo;
  videos: CarouselVideoResult[];
  usage?: UsageBlock;
};

export type TranscribeVideoResult = TranscribeVideoSingleResult | TranscribeVideoCarouselResult;

/** Snapshot of a transcription task. `result` has the same shape as {@link VidNavigatorClient.transcribe}'s return value. */
export type TranscribeAsyncJob = AsyncJob<TranscribeVideoResult>;

/** Snapshot of a watch task. `result` is a {@link WatchResult}. */
export type WatchAsyncJob = AsyncJob<WatchResult>;

/** Snapshot of a video analysis task. `result` has the same shape as {@link VidNavigatorClient.analyzeVideo}'s return value. */
export type AnalyzeVideoAsyncJob = AsyncJob<AnalyzeVideoResult>;

/** Snapshot of an extraction task. `result` is the extracted object, shaped like your schema. */
export type ExtractVideoAsyncJob = AsyncJob<Record<string, unknown>>;

/** Snapshot of a tweet claim analysis task. `result` is a {@link TweetStatement}. */
export type TweetStatementAsyncJob = AsyncJob<TweetStatement>;

export type TranscribeJob = Job<TranscribeAsyncJob, TranscribeVideoResult>;

/** Input that always yields a single-video result (the carousel shape needs `all_videos: true`). */
type SingleTranscribeInput = string | (TranscribeInput & { all_videos?: false });

/**
 * {@link JobOperation} for transcription, typed so that a plain URL (or `all_videos` left off)
 * resolves to {@link TranscribeVideoSingleResult}.
 */
export interface TranscribeOperation extends JobOperation<string | TranscribeInput, TranscribeAsyncJob, TranscribeVideoResult> {
  (input: SingleTranscribeInput, options?: RunOptions<TranscribeAsyncJob>): Promise<TranscribeVideoSingleResult>;
  (input: string | TranscribeInput, options?: RunOptions<TranscribeAsyncJob>): Promise<TranscribeVideoResult>;
  submit(input: SingleTranscribeInput, options?: SubmitOptions): Promise<Job<TranscribeAsyncJob, TranscribeVideoSingleResult>>;
  submit(input: string | TranscribeInput, options?: SubmitOptions): Promise<Job<TranscribeAsyncJob, TranscribeVideoResult>>;
}
export type WatchJob = Job<WatchAsyncJob, WatchResult>;
export type AnalyzeVideoJob = Job<AnalyzeVideoAsyncJob, AnalyzeVideoResult>;
export type ExtractVideoJob = Job<ExtractVideoAsyncJob, ExtractDataResult>;
export type TweetStatementJob = Job<TweetStatementAsyncJob, TweetStatement>;
/** `result()` resolves to the completed task with **all** pages of `videos` collected. */
export type TikTokProfileJob = Job<TikTokProfileTask, TikTokProfileTask>;
/** `result()` resolves to the completed task with **all** pages of `results` collected. */
export type TikTokSearchJob = Job<TikTokSearchTask, TikTokSearchTask>;
/** `result()` resolves to the completed task with **all** pages of rooms collected. */
export type TikTokLiveSearchJob = Job<TikTokLiveSearchTask, TikTokLiveSearchTask>;

export type UploadFileSuccessResult = {
  status: 'success';
  file_id: string;
  file_name: string;
  file_status: 'processing' | 'completed';
  message: string;
  file_info: FileInfo;
};

export type UploadFileAcceptedResult = {
  status: 'accepted';
  file_id: string;
  file_name: string;
  file_status: 'processing';
  message: string;
  note?: string;
  file_info?: FileInfo;
};

export type UploadFileResult = UploadFileSuccessResult | UploadFileAcceptedResult;

/** Answer of {@link VidNavigatorClient.analyzeFileScenes}. */
export type AnalyzeFileScenesResult = {
  file_id: string;
  /** `processing`: the analysis was started, or is already running. `completed`: the scenes are already there. */
  scenes_status: Extract<FileScenesStatus, 'processing' | 'completed'>;
  message: string;
};

/** Answer of {@link VidNavigatorClient.getFile}. */
export type GetFileResult = {
  file_info: FileInfo;
  /** Present once the file has a transcript. */
  transcript?: TranscriptOutput;
  /** What the file shows, in chronological order. Present once `file_info.scenes_status` is `completed`. */
  scenes?: VideoScene[];
};

export interface ExtractDataResult {
  data: Record<string, unknown>;
  /** When the request had no schema: the schema written from `what_to_extract`, to pass as `schema` next time. */
  schema?: ExtractionSchema;
  /** For each field of `data` that has a value, the moments of the video it comes from. */
  evidence?: ExtractionEvidence;
  video_info?: VideoInfo;
  file_info?: FileInfo;
  /** With `include_scenes: true`: number of frames that were analyzed to produce the scenes. */
  frames_analyzed?: number;
  /** With `include_scenes: true`, when the picture could not be read: the fields were extracted from the transcript alone. */
  scenes_error?: ScenesError;
  /** With `include_scenes: true`, when there is no transcript: the fields were extracted from the scenes alone. */
  transcript_error?: WatchTranscriptError;
  usage?: UsageBlock;
}

/**
 * What comes first among the videos that match the query: the best matches
 * (`relevance`), the most recent (`recency`), the most viewed (`popularity`)
 * or the shortest (`brevity`).
 */
export type YouTubeSearchFocus = 'relevance' | 'recency' | 'popularity' | 'brevity';

export type SearchYouTubePayload = {
  query: string;
  use_enhanced_search?: boolean;
  /** Only videos published in or after this year. */
  start_year?: number;
  /** Only videos published in or before this year. */
  end_year?: number;
  /** Defaults to `relevance`. With another value, `explanation` is empty. */
  focus?: YouTubeSearchFocus;
  /** Maximum duration in seconds: longer videos are left out. */
  duration?: number;
  max_results?: number;
  include_usage?: boolean;
};

export type SearchYouTubeResult = {
  results: VideoSearchResult[];
  query: string;
  total_found: number;
  explanation?: string;
  usage?: UsageBlock;
  /** Present when a 402 partial-results response is returned. */
  status?: 'success' | 'partial';
  /** Present on partial results (e.g. `insufficient_credits_video_search`). */
  error_code?: string;
};

export type SearchFilesPayload = {
  query: string;
  namespace_ids?: string[];
  include_usage?: boolean;
};

export type SearchFilesResult = {
  results: FileSearchResult[];
  query: string;
  total_found: number;
  explanation?: string;
  usage?: UsageBlock;
};

export type AnalyzeVideoPayload = {
  video_url: string;
  query?: string;
  /**
   * Default false. `true` also reads what the video shows: the analysis is made from the
   * transcript and the scenes together, and the result has `scenes` and `frames_analyzed`.
   */
  include_scenes?: boolean;
  transcript_text?: boolean;
  include_usage?: boolean;
};

export type AnalyzeFilePayload = {
  file_id: string;
  query?: string;
  /**
   * Default false. `true` analyzes the file from its transcript and its scenes together. The
   * scenes are the ones kept with the file: ask for them at the upload (`include_scenes`) or with
   * {@link VidNavigatorClient.analyzeFileScenes}. A file that has none is refused with
   * `ScenesNotAvailableError`.
   */
  include_scenes?: boolean;
  transcript_text?: boolean;
  include_usage?: boolean;
};

export type AnalyzeVideoResult = {
  video_info: VideoInfo;
  transcript: TranscriptOutput;
  transcript_analysis: AnalysisResult;
  /**
   * With `include_scenes: true`: what the video shows, in chronological order. Empty when the
   * picture could not be read (see `scenes_error`).
   */
  scenes?: VideoScene[];
  /** With `include_scenes: true`: number of frames that were analyzed to produce the scenes. */
  frames_analyzed?: number;
  /** With `include_scenes: true`, when the picture could not be read: the analysis was made from the transcript alone. */
  scenes_error?: ScenesError;
  /** With `include_scenes: true`, when there is no transcript: the analysis was made from the scenes alone. */
  transcript_error?: WatchTranscriptError;
  usage?: UsageBlock;
};

export type AnalyzeFileResult = {
  file_info: FileInfo;
  transcript: TranscriptOutput;
  transcript_analysis: AnalysisResult;
  /** With `include_scenes: true`: what the file shows, in chronological order. */
  scenes?: VideoScene[];
  /** With `include_scenes: true`: number of frames that were analyzed to produce the scenes. */
  frames_analyzed?: number;
  /** Why the scenes could not be read, when the answer carries it. A file that has no scenes at all is refused with `ScenesNotAvailableError` instead. */
  scenes_error?: ScenesError;
  /** With `include_scenes: true`, when the file has no speech: the analysis was made from the scenes alone. */
  transcript_error?: WatchTranscriptError;
  usage?: UsageBlock;
};

export type ExtractVideoDataPayload = {
  video_url: string;
  /** A standard JSON Schema. Optional when `what_to_extract` is given. */
  schema?: ExtractionSchema;
  what_to_extract?: string;
  transcribe?: boolean;
  /**
   * Default false. `true` also reads what the video shows: the fields are extracted from the
   * transcript and the scenes together, and the result has `frames_analyzed`.
   */
  include_scenes?: boolean;
  include_usage?: boolean;
} & WebhookOption;

export type ExtractVideoDataMultipartPayload = {
  video_url: string;
  /** Path to a JSON or YAML schema file. The API accepts either a raw schema or a full extraction request object. */
  schemaFilePath: string;
  what_to_extract?: string;
  transcribe?: boolean;
  include_scenes?: boolean;
  include_usage?: boolean;
} & WebhookOption;

export type TweetStatementPayload = { tweet_id: string } & WebhookOption;

export type ExtractFileDataPayload = {
  file_id: string;
  /** A standard JSON Schema. Optional when `what_to_extract` is given. */
  schema?: ExtractionSchema;
  what_to_extract?: string;
  /**
   * Default false. `true` extracts from the transcript of the file and its scenes together. The
   * scenes are the ones kept with the file: ask for them at the upload (`include_scenes`) or with
   * {@link VidNavigatorClient.analyzeFileScenes}. A file that has none is refused with
   * `ScenesNotAvailableError`.
   */
  include_scenes?: boolean;
  include_usage?: boolean;
};

export type ExtractFileDataMultipartPayload = {
  file_id: string;
  /** Path to a JSON or YAML schema file. The API accepts either a raw schema or a full extraction request object. */
  schemaFilePath: string;
  what_to_extract?: string;
  include_scenes?: boolean;
  include_usage?: boolean;
};
//endregion

function parseTranscribeData(
  inner:
    | { video_info: VideoInfoJSON; transcript: TranscriptSegmentJSON[] | string }
    | { carousel_info: CarouselInfoJSON; videos: CarouselVideoResultJSON[] },
  usage?: UsageBlock
): TranscribeVideoResult {
  if ('videos' in inner && 'carousel_info' in inner) {
    return {
      carousel_info: CarouselInfo.fromJSON(inner.carousel_info),
      videos: inner.videos.map((v) => CarouselVideoResult.fromJSON(v)),
      usage,
    };
  }
  const single = inner as { video_info: VideoInfoJSON; transcript: TranscriptSegmentJSON[] | string };
  return {
    video_info: VideoInfo.fromJSON(single.video_info),
    transcript: transcriptFromJSON(single.transcript)!,
    usage,
  };
}

/**
 * An extraction needs a schema (`schema` or `schemaFilePath`) or, without one, `what_to_extract`,
 * from which the API writes the schema. Checked before anything is sent.
 */
function checkSchemaInput(input: { schema?: unknown; schemaFilePath?: string; what_to_extract?: string }): void {
  if (input.schema !== undefined && input.schemaFilePath !== undefined) {
    throw new Error('Pass at most one of schema or schemaFilePath.');
  }
  if (input.schema === undefined && input.schemaFilePath === undefined && !input.what_to_extract?.trim()) {
    throw new Error('Pass schema, schemaFilePath or what_to_extract.');
  }
}

/** What `include_scenes` adds beside the scenes themselves. */
interface SceneNotes {
  frames_analyzed?: number;
  scenes_error?: ScenesError;
  transcript_error?: WatchTranscriptError;
}

/** The `data` block of an analysis: the same for a video, its background job and an uploaded file. */
interface AnalysisDataJSON extends SceneNotes {
  transcript: TranscriptSegmentJSON[] | string;
  transcript_analysis: AnalysisResultJSON;
  scenes?: VideoSceneJSON[];
}

// The scene fields are set only when the response carries them, so a result asked without
// `include_scenes` keeps the shape it always had.
function pickSceneNotes(raw: SceneNotes): SceneNotes {
  const notes: SceneNotes = {};
  if (raw.frames_analyzed != null) notes.frames_analyzed = raw.frames_analyzed;
  if (raw.scenes_error) notes.scenes_error = raw.scenes_error;
  if (raw.transcript_error) notes.transcript_error = raw.transcript_error;
  return notes;
}

function parseScenes(raw: VideoSceneJSON[] | undefined): { scenes?: VideoScene[] } {
  return raw ? { scenes: raw.map((scene) => VideoScene.fromJSON(scene)) } : {};
}

function parseAnalysisData(raw: AnalysisDataJSON) {
  return {
    transcript: transcriptFromJSON(raw.transcript)!,
    transcript_analysis: AnalysisResult.fromJSON(raw.transcript_analysis),
    ...parseScenes(raw.scenes),
    ...pickSceneNotes(raw),
  };
}

function parseAnalyzeVideoData(
  raw: AnalysisDataJSON & { video_info: VideoInfoJSON },
  usage?: UsageBlock
): AnalyzeVideoResult {
  return { video_info: VideoInfo.fromJSON(raw.video_info), ...parseAnalysisData(raw), usage };
}

function buildAsyncJobParams(options?: SubmitOptions): Record<string, string> | undefined {
  // Like the TikTok pollers, the async job pollers take include_usage as a query string value.
  return options?.include_usage ? { include_usage: 'true' } : undefined;
}

function requireResult<T>(task: AsyncJob<T>): T {
  if (task.result === null) {
    const err = new VidNavigatorError(`Task ${task.task_id} completed without a result`);
    err.task_id = task.task_id;
    throw err;
  }
  return task.result;
}

/** TikTok results are paginated; fetch every page of a completed task and merge the items. */
async function collectAllPages<TTask extends { pagination?: TikTokProfilePagination }, TItem>(
  fetchPage: (query: { cursor?: string; limit: number; include_usage?: boolean }) => Promise<TTask>,
  items: (task: TTask) => TItem[],
  setItems: (task: TTask, all: TItem[]) => void,
  include_usage?: boolean
): Promise<TTask> {
  const first = await fetchPage({ limit: TIKTOK_PAGE_SIZE, include_usage });
  const all = [...items(first)];
  let cursor = first.pagination?.next_cursor ?? undefined;
  while (cursor) {
    const page = await fetchPage({ limit: TIKTOK_PAGE_SIZE, cursor });
    all.push(...items(page));
    cursor = page.pagination?.next_cursor ?? undefined;
  }
  setItems(first, all);
  if (first.pagination) {
    first.pagination = { ...first.pagination, limit: all.length, has_next: false, next_cursor: null };
  }
  return first;
}

const TIKTOK_PAGE_SIZE = 500;

interface OperationSpec<TInput, TTask extends PollableTask, TResult> {
  jobType: string;
  submit: (input: TInput) => Promise<JobInfo>;
  fetchTask: (task_id: string, options: SubmitOptions) => Promise<TTask>;
  toResult: (task: TTask, options: SubmitOptions) => Promise<TResult>;
}

function appendOptionalFormField(form: FormData, name: string, value: string | number | boolean | undefined): void {
  if (value !== undefined) {
    form.append(name, String(value));
  }
}

function buildTikTokPollParams(query?: {
  cursor?: string;
  limit?: number;
  include_usage?: boolean;
}): Record<string, string | number> | undefined {
  if (!query) return undefined;
  const params: Record<string, string | number> = {};
  if (query.cursor !== undefined) params.cursor = query.cursor;
  if (query.limit !== undefined) params.limit = query.limit;
  // The TikTok pollers expect include_usage as a query string value.
  if (query.include_usage) params.include_usage = 'true';
  return params;
}

const _deprecationWarned = new Set<string>();

function warnDeprecated(oldName: string, newName: string): void {
  if (_deprecationWarned.has(oldName)) return;
  _deprecationWarned.add(oldName);
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(
      `[vidnavigator] ${oldName}() is deprecated and will be removed in a future release; use ${newName}() instead.`
    );
  }
}

export class VidNavigatorClient {
  private client: AxiosInstance;

  /**
   * Speech-to-text transcription of any length (Instagram, TikTok, X, Facebook, Vimeo, ...),
   * built on `POST /transcribe/async`.
   *
   * - `await vn.transcribe(url)` submits, polls, and returns the result.
   * - `await vn.transcribe.submit(url)` returns a {@link Job} handle right away.
   * - `vn.transcribe.resume(task_id)` reattaches to a job you already submitted.
   */
  readonly transcribe: TranscribeOperation;

  /**
   * What a video shows, scene by scene, next to what it says, built on `POST /watch/async`. The
   * result is a {@link WatchResult}: `scenes` (for each one its `start` and `end` in seconds, a
   * `description` of the picture and the `on_screen_text`), the `transcript` and `frames_analyzed`.
   * Works with every platform `getTranscript` and `transcribe` support.
   *
   * A video without a transcript is not an error: `transcript` is empty and `transcript_error`
   * says why. Same shapes as {@link VidNavigatorClient.transcribe}.
   */
  readonly watch: JobOperation<string | WatchInput, WatchAsyncJob, WatchResult>;

  /**
   * Analysis of an online video as a background job, built on `POST /analyze/video/async`: the
   * same analysis and the same result as {@link VidNavigatorClient.analyzeVideo}, without holding
   * a connection open while it runs. Use it with `include_scenes: true` on a video longer than
   * about 10 minutes. Same shapes as {@link VidNavigatorClient.transcribe}.
   */
  readonly analyze: JobOperation<string | AnalyzeVideoInput, AnalyzeVideoAsyncJob, AnalyzeVideoResult>;

  /**
   * Structured-data extraction from a video of any length, built on `POST /extract/video/async`.
   * The schema is validated when you submit. With `include_scenes: true` the fields are extracted
   * from the transcript and from what the video shows. Same shapes as
   * {@link VidNavigatorClient.transcribe}.
   */
  readonly extractVideo: JobOperation<ExtractVideoInput, ExtractVideoAsyncJob, ExtractDataResult>;

  /**
   * Structured claim analysis of an X/Twitter tweet (attached media of any length), built on
   * `POST /tweet/statement/async`. Same shapes as {@link VidNavigatorClient.transcribe}.
   */
  readonly tweetStatement: JobOperation<string | TweetStatementInput, TweetStatementAsyncJob, TweetStatement>;

  /**
   * TikTok profile scrape, built on `POST /tiktok/profile`. The result is the completed task with
   * every page of `videos` collected. Same shapes as {@link VidNavigatorClient.transcribe}.
   */
  readonly tiktokProfile: JobOperation<string | TikTokProfileScrapeRequest, TikTokProfileTask, TikTokProfileTask>;

  /**
   * TikTok keyword search, built on `POST /tiktok/search`. The result is the completed task with
   * every page of `results` collected. Same shapes as {@link VidNavigatorClient.transcribe}.
   */
  readonly tiktokSearch: JobOperation<string | TikTokSearchRequest, TikTokSearchTask, TikTokSearchTask>;

  /**
   * TikTok LIVE search, built on `POST /tiktok/live/search`: rooms broadcasting now for a keyword,
   * with their FLV / HLS / audio-only stream URLs. The result is the completed task with every
   * page of `results` collected. Same shapes as {@link VidNavigatorClient.transcribe}.
   */
  readonly tiktokLiveSearch: JobOperation<string | TikTokLiveSearchRequest, TikTokLiveSearchTask, TikTokLiveSearchTask>;

  constructor(config: SDKConfig) {
    if (!config?.apiKey) {
      throw new Error('An API key is required to use the VidNavigator SDK.');
    }

    this.client = axios.create({
      baseURL: config.baseURL ?? 'https://api.vidnavigator.com/v1',
      headers: {
        'X-API-Key': config.apiKey,
        'User-Agent': `vidnavigator-js/${SDK_VERSION}`,
      },
      ...config.axiosConfig,
    });

    this.transcribe = this.defineOperation({
      jobType: 'transcribe',
      submit: (input: string | TranscribeInput) =>
        this.submitAsyncJob('/transcribe/async', typeof input === 'string' ? { video_url: input } : input),
      fetchTask: (task_id, options) =>
        this.getAsyncJob(`/transcribe/${encodeURIComponent(task_id)}`, options, (raw) => parseTranscribeData(raw)),
      toResult: async (task) => ({ ...requireResult(task), usage: task.usage }),
    }) as TranscribeOperation;

    this.watch = this.defineOperation({
      jobType: 'watch',
      submit: (input: string | WatchInput) =>
        this.submitAsyncJob('/watch/async', typeof input === 'string' ? { video_url: input } : input),
      fetchTask: (task_id, options) =>
        this.getAsyncJob(`/watch/${encodeURIComponent(task_id)}`, options, (raw: WatchResultJSON) =>
          WatchResult.fromJSON(raw)
        ),
      toResult: async (task) => {
        const watched = requireResult(task);
        watched.usage = task.usage;
        return watched;
      },
    });

    this.analyze = this.defineOperation({
      jobType: 'analyze_video',
      submit: (input: string | AnalyzeVideoInput) =>
        this.submitAsyncJob('/analyze/video/async', typeof input === 'string' ? { video_url: input } : input),
      fetchTask: (task_id, options) =>
        this.getAsyncJob(`/analyze/video/${encodeURIComponent(task_id)}`, options, (raw) =>
          parseAnalyzeVideoData(raw)
        ),
      toResult: async (task) => ({ ...requireResult(task), usage: task.usage }),
    });

    this.extractVideo = this.defineOperation({
      jobType: 'extract_video',
      submit: (input: ExtractVideoInput) => this.submitExtractVideo(input),
      fetchTask: (task_id, options) =>
        this.getAsyncJob(
          `/extract/video/${encodeURIComponent(task_id)}`,
          options,
          (raw) => raw as Record<string, unknown>
        ),
      toResult: async (task) => ({
        data: requireResult(task),
        video_info: task.video_info,
        ...pickSceneNotes(task),
        ...(task.schema ? { schema: task.schema } : {}),
        ...(task.evidence ? { evidence: task.evidence } : {}),
        usage: task.usage,
      }),
    });

    this.tweetStatement = this.defineOperation({
      jobType: 'tweet_statement',
      submit: (input: string | TweetStatementInput) =>
        this.submitAsyncJob('/tweet/statement/async', typeof input === 'string' ? { tweet_id: input } : input),
      fetchTask: (task_id, options) =>
        this.getAsyncJob(`/tweet/statement/${encodeURIComponent(task_id)}`, options, (raw) =>
          TweetStatement.fromJSON(raw)
        ),
      toResult: async (task) => {
        const statement = requireResult(task);
        statement.usage = task.usage;
        return statement;
      },
    });

    this.tiktokProfile = this.defineOperation({
      jobType: 'tiktok_profile',
      submit: async (input: string | TikTokProfileScrapeRequest) => {
        const sub = await this.submitTikTokProfileScrape(typeof input === 'string' ? { profile_url: input } : input);
        return { ...sub, job_type: 'tiktok_profile' };
      },
      // Status polls ask for one video only; the full result is paged in once the task completes.
      fetchTask: (task_id) => this.getTikTokProfileScrape(task_id, { limit: 1 }),
      toResult: (task, options) =>
        collectAllPages(
          (query) => this.getTikTokProfileScrape(task.task_id, query),
          (page) => page.videos,
          (page, all) => { page.videos = all; },
          options.include_usage
        ),
    });

    this.tiktokSearch = this.defineOperation({
      jobType: 'tiktok_search',
      submit: async (input: string | TikTokSearchRequest) => {
        const sub = await this.submitTikTokSearch(typeof input === 'string' ? { query: input } : input);
        return { ...sub, job_type: 'tiktok_search' };
      },
      fetchTask: (task_id) => this.getTikTokSearch(task_id, { limit: 1 }),
      toResult: (task, options) =>
        collectAllPages(
          (query) => this.getTikTokSearch(task.task_id, query),
          (page) => page.results,
          (page, all) => { page.results = all; },
          options.include_usage
        ),
    });

    this.tiktokLiveSearch = this.defineOperation({
      jobType: 'tiktok_live_search',
      submit: async (input: string | TikTokLiveSearchRequest) => {
        const sub = await this.submitTikTokLiveSearch(typeof input === 'string' ? { query: input } : input);
        return { ...sub, job_type: 'tiktok_live_search' };
      },
      fetchTask: (task_id) => this.getTikTokLiveSearch(task_id, { limit: 1 }),
      toResult: (task, options) =>
        collectAllPages(
          (query) => this.getTikTokLiveSearch(task.task_id, query),
          (page) => page.results,
          (page, all) => { page.results = all; },
          options.include_usage
        ),
    });
  }

  private defineOperation<TInput, TTask extends PollableTask, TResult>(
    spec: OperationSpec<TInput, TTask, TResult>
  ): JobOperation<TInput, TTask, TResult> {
    const makeJob = (info: JobInfo, options: SubmitOptions = {}) =>
      new Job<TTask, TResult>(
        info,
        () => spec.fetchTask(info.task_id, options),
        (task) => spec.toResult(task, options)
      );
    const submit = async (input: TInput, options?: SubmitOptions) => makeJob(await spec.submit(input), options);
    const run = async (input: TInput, options: RunOptions<TTask> = {}) => {
      const { include_usage, ...pollOptions } = options;
      const job = await submit(input, { include_usage });
      return job.result(pollOptions);
    };
    return Object.assign(run, {
      submit,
      resume: (task_id: string, options?: SubmitOptions) =>
        makeJob({ task_id, job_type: spec.jobType }, options),
    });
  }

  private async submitAsyncJob(url: string, body: unknown, headers?: Record<string, string>): Promise<JobInfo> {
    const response = await this.request<ApiSuccessResponse<AsyncJobAcceptedJSON>>('POST', url, body, undefined, headers);
    const accepted = AsyncJobAccepted.fromJSON(response.data);
    return { ...accepted, job_type: accepted.job_type ?? url.split('/')[1] };
  }

  private submitExtractVideo(input: ExtractVideoInput): Promise<JobInfo> {
    checkSchemaInput(input);
    if ('schemaFilePath' in input) {
      const form = new FormData();
      form.append('video_url', input.video_url);
      form.append('schema', fs.createReadStream(input.schemaFilePath));
      appendOptionalFormField(form, 'what_to_extract', input.what_to_extract);
      appendOptionalFormField(form, 'transcribe', input.transcribe);
      appendOptionalFormField(form, 'include_scenes', input.include_scenes);
      appendOptionalFormField(form, 'webhook_url', input.webhook_url);
      return this.submitAsyncJob('/extract/video/async', form, form.getHeaders());
    }
    return this.submitAsyncJob('/extract/video/async', input);
  }

  private async getAsyncJob<T>(
    url: string,
    options: SubmitOptions | undefined,
    parseResult: (raw: any) => T
  ): Promise<AsyncJob<T>> {
    const response = await this.request<ApiSuccessResponse<AsyncJobJSON>>(
      'GET',
      url,
      undefined,
      buildAsyncJobParams(options)
    );
    const job = AsyncJob.fromJSON(response.data, parseResult);
    if (response.usage) job.usage = UsageBlock.fromJSON(response.usage);
    return job;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE' | 'PUT',
    url: string,
    data?: any,
    params?: any,
    extraHeaders?: any,
    minTimeoutMs?: number
  ): Promise<T> {
    // A call known to run long raises a configured timeout, never lowers it
    // (0 / unset means no timeout at all).
    const configured = this.client.defaults.timeout;
    const timeout = minTimeoutMs && configured ? Math.max(configured, minTimeoutMs) : undefined;
    try {
      const response = await this.client.request<T>({
        method,
        url,
        data,
        params,
        headers: extraHeaders,
        ...(timeout !== undefined ? { timeout } : {}),
      });
      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        throw buildApiError(error.response.status, error.response.data, error.message);
      }
      throw new VidNavigatorError(error.message);
    }
  }

  //region --- Transcripts ---
  /**
   * Get a transcript for any supported video. The endpoint auto-detects the
   * platform (YouTube, Vimeo, X/Twitter, TikTok, Facebook, Dailymotion, Loom, Snapchat, etc.)
   * from `video_url`. For Instagram, use {@link VidNavigatorClient.transcribeVideo}.
   */
  async getTranscript(payload: TranscriptRequestPayload): Promise<TranscriptResult> {
    const response = await this.request<
      ApiSuccessResponse<{
        video_info: VideoInfoJSON;
        transcript: TranscriptSegmentJSON[] | string;
      }>
    >('POST', '/transcript', payload);

    return {
      video_info: VideoInfo.fromJSON(response.data.video_info),
      transcript: transcriptFromJSON(response.data.transcript)!,
      usage: response.usage ? UsageBlock.fromJSON(response.usage) : undefined,
    };
  }

  /**
   * @deprecated There is now a single `/transcript` endpoint that auto-detects the
   * platform. Use {@link VidNavigatorClient.getTranscript} instead. This alias
   * forwards to `getTranscript` and will be removed in a future release.
   */
  async getYouTubeTranscript(payload: TranscriptRequestPayload): Promise<TranscriptResult> {
    warnDeprecated('getYouTubeTranscript', 'getTranscript');
    return this.getTranscript(payload);
  }

  /**
   * Speech-to-text transcription. Blocking convenience wrapper around {@link VidNavigatorClient.transcribe}:
   * submits to `POST /transcribe/async` and polls until the job finishes, so media of any length works.
   */
  async transcribeVideo(
    payload: TranscribeVideoPayload,
    options?: PollOptions<TranscribeAsyncJob>
  ): Promise<TranscribeVideoResult> {
    const { include_usage, ...input } = payload;
    return this.transcribe(input, { ...options, include_usage });
  }
  //endregion

  //region --- Watch ---
  /**
   * What a video shows, scene by scene, next to what it says. Blocking convenience wrapper around
   * {@link VidNavigatorClient.watch}: submits to `POST /watch/async` and polls until the job
   * finishes, so media of any length works.
   */
  async watchVideo(payload: WatchVideoPayload, options?: PollOptions<WatchAsyncJob>): Promise<WatchResult> {
    const { include_usage, ...input } = payload;
    return this.watch(input, { ...options, include_usage });
  }
  //endregion

  //region --- TikTok ---
  async submitTikTokProfileScrape(
    payload: TikTokProfileScrapeRequest
  ): Promise<TikTokProfileScrapeSubmission> {
    const response = await this.request<ApiSuccessResponse<TikTokProfileScrapeSubmissionJSON>>(
      'POST',
      '/tiktok/profile',
      payload
    );
    return TikTokProfileScrapeSubmission.fromJSON(response.data);
  }

  async getTikTokProfileScrape(
    task_id: string,
    query?: { cursor?: string; limit?: number; include_usage?: boolean }
  ): Promise<TikTokProfileTask> {
    const response = await this.request<ApiSuccessResponse<TikTokProfileTaskJSON>>(
      'GET',
      `/tiktok/profile/${task_id}`,
      undefined,
      buildTikTokPollParams(query)
    );
    const task = TikTokProfileTask.fromJSON(response.data);
    if (response.usage) task.usage = UsageBlock.fromJSON(response.usage);
    return task;
  }

  async submitTikTokSearch(payload: TikTokSearchRequest): Promise<TikTokSearchSubmission> {
    const response = await this.request<ApiSuccessResponse<TikTokSearchSubmissionJSON>>(
      'POST',
      '/tiktok/search',
      payload
    );
    return TikTokSearchSubmission.fromJSON(response.data);
  }

  async getTikTokSearch(
    task_id: string,
    query?: { cursor?: string; limit?: number; include_usage?: boolean }
  ): Promise<TikTokSearchTask> {
    const response = await this.request<ApiSuccessResponse<TikTokSearchTaskJSON>>(
      'GET',
      `/tiktok/search/${task_id}`,
      undefined,
      buildTikTokPollParams(query)
    );
    const task = TikTokSearchTask.fromJSON(response.data);
    if (response.usage) task.usage = UsageBlock.fromJSON(response.usage);
    return task;
  }

  async submitTikTokLiveSearch(payload: TikTokLiveSearchRequest): Promise<TikTokLiveSearchSubmission> {
    const response = await this.request<ApiSuccessResponse<TikTokLiveSearchSubmissionJSON>>(
      'POST',
      '/tiktok/live/search',
      payload
    );
    return TikTokLiveSearchSubmission.fromJSON(response.data);
  }

  async getTikTokLiveSearch(
    task_id: string,
    query?: { cursor?: string; limit?: number; include_usage?: boolean }
  ): Promise<TikTokLiveSearchTask> {
    const response = await this.request<ApiSuccessResponse<TikTokLiveSearchTaskJSON>>(
      'GET',
      `/tiktok/live/search/${task_id}`,
      undefined,
      buildTikTokPollParams(query)
    );
    const task = TikTokLiveSearchTask.fromJSON(response.data);
    if (response.usage) task.usage = UsageBlock.fromJSON(response.usage);
    return task;
  }

  /**
   * One TikTok LIVE room, right away (`POST /tiktok/live/room`, no job): by `room_id`, `username`
   * or `url`, exactly one. The room says whether it is live or ended (and when), its viewers and new
   * followers, the streamer's bio, and more. With `include_comments: true` the result also has the
   * latest comments (up to 50), the pinned comment, the intro and the top viewers.
   *
   * The room has no likes, comment count or share count: TikTok gives those to LIVE search only.
   * A room or account that does not exist throws `NotFoundError` (`error_code` `live_not_found`)
   * and is not billed. Billing: 1 `residential_request`, 2 with `include_comments`.
   */
  async getTikTokLiveRoom(payload: TikTokLiveRoomRequest): Promise<TikTokLiveRoomResult> {
    const targets = (['room_id', 'username', 'url'] as const).filter((key) => payload?.[key]);
    if (targets.length !== 1) {
      throw new VidNavigatorError('Pass exactly one of room_id, username or url');
    }
    let body: TikTokLiveRoomRequest = payload;
    const roomId: unknown = payload.room_id;
    if (typeof roomId === 'number') {
      if (!Number.isSafeInteger(roomId)) {
        throw new VidNavigatorError(
          'room_id has more digits than a JavaScript number holds: pass it as a string'
        );
      }
      body = { ...payload, room_id: String(roomId) };
    }
    const response = await this.request<ApiSuccessResponse<TikTokLiveRoomResultJSON>>(
      'POST',
      '/tiktok/live/room',
      body,
      undefined,
      undefined,
      LIVE_ROOM_TIMEOUT_MS
    );
    const result = tiktokLiveRoomResultFromJSON(response.data);
    if (response.usage) result.usage = UsageBlock.fromJSON(response.usage);
    return result;
  }
  //endregion

  //region --- Files ---
  async getFiles(query?: {
    limit?: number;
    offset?: number;
    status?: 'processing' | 'completed' | 'failed' | 'cancelled';
    namespace_id?: string;
  }): Promise<{
    files: FileInfo[];
    total_count: number;
    limit: number;
    offset: number;
    has_more: boolean;
  }> {
    const response = await this.request<
      ApiSuccessResponse<{
        files: FileInfoJSON[];
        total_count: number;
        limit: number;
        offset: number;
        has_more: boolean;
      }>
    >('GET', '/files', undefined, query);

    return {
      files: response.data.files.map(FileInfo.fromJSON),
      total_count: response.data.total_count,
      limit: response.data.limit,
      offset: response.data.offset,
      has_more: response.data.has_more,
    };
  }

  /**
   * A file's metadata, its transcript once it has one, and its scenes once they are analyzed.
   * `file_info.scenes_status` says where the scene analysis stands; when it is `completed`, the
   * result has `scenes`, as {@link VidNavigatorClient.watch} returns them for an online video.
   */
  async getFile(file_id: string, query?: { transcript_text?: boolean }): Promise<GetFileResult> {
    const response = await this.request<
      ApiSuccessResponse<{
        file_info: FileInfoJSON;
        transcript?: TranscriptSegmentJSON[] | string;
        scenes?: VideoSceneJSON[];
      }>
    >('GET', `/file/${file_id}`, undefined, query);

    return {
      file_info: FileInfo.fromJSON(response.data.file_info),
      transcript: transcriptFromJSON(response.data.transcript),
      ...parseScenes(response.data.scenes),
    };
  }

  /**
   * Upload an audio or video file. With `include_scenes: true` the picture of a video file is
   * analyzed as well, next to its transcription: follow `file_info.scenes_status` with
   * {@link VidNavigatorClient.getFile}, which returns the scenes once it is `completed`. An audio
   * file has no picture: its `scenes_status` is `failed`, with `frames_not_available`.
   */
  async uploadFile(options: {
    filePath: string;
    wait_for_completion?: boolean;
    namespace_ids?: string[];
    /** Default false. `true` also analyzes the scenes of the file (video files only). */
    include_scenes?: boolean;
  }): Promise<UploadFileResult> {
    const form = new FormData();
    form.append('file', fs.createReadStream(options.filePath));
    if (options.wait_for_completion) {
      form.append('wait_for_completion', 'true');
    }
    if (options.namespace_ids?.length) {
      form.append('namespace_ids', JSON.stringify(options.namespace_ids));
    }
    appendOptionalFormField(form, 'include_scenes', options.include_scenes);

    try {
      const response = await this.client.post<{
        status: 'success' | 'accepted';
        file_id: string;
        file_name: string;
        file_status: 'processing' | 'completed';
        message: string;
        note?: string;
        data?: { file_info: FileInfoJSON };
      }>('/upload/file', form, { headers: form.getHeaders() });

      const body = response.data;
      const fileInfo = body.data?.file_info ? FileInfo.fromJSON(body.data.file_info) : undefined;
      if (body.status === 'accepted') {
        return {
          status: 'accepted',
          file_id: body.file_id,
          file_name: body.file_name,
          file_status: body.file_status as 'processing',
          message: body.message,
          note: body.note,
          file_info: fileInfo,
        };
      }
      return {
        status: 'success',
        file_id: body.file_id,
        file_name: body.file_name,
        file_status: body.file_status,
        message: body.message,
        file_info: fileInfo!,
      };
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        throw buildApiError(error.response.status, error.response.data, error.message);
      }
      throw new VidNavigatorError(error.message);
    }
  }

  async deleteFile(file_id: string): Promise<{ file_id: string; file_name: string; message: string }> {
    const response = await this.request<
      ApiSuccessResponse<{ file_id: string; file_name: string; message: string }>
    >('DELETE', `/file/${file_id}/delete`);
    return response.data;
  }

  async getFileUrl(file_id: string): Promise<{ file_id: string; file_url: string }> {
    const response = await this.request<
      ApiSuccessResponse<{ file_id: string; file_url: string }>
    >('GET', `/file/${file_id}/url`);
    return response.data;
  }

  async retryFileProcessing(
    file_id: string
  ): Promise<{ file_id: string; file_name: string; file_status: string; message: string }> {
    const response = await this.request<
      ApiSuccessResponse<{
        file_id: string;
        file_name: string;
        file_status: string;
        message: string;
      }>
    >('POST', `/file/${file_id}/retry`);
    return response.data;
  }

  /**
   * Start the scene analysis of a file already uploaded: what its picture shows, scene by scene,
   * with the text readable on screen. The scenes of a file are analyzed once and kept with it.
   *
   * The answer has `scenes_status` `processing` when the analysis was started or is already
   * running, and `completed` when the scenes are already there (nothing new is started). Follow
   * `file_info.scenes_status` with {@link VidNavigatorClient.getFile}, which returns the scenes
   * once it is `completed`; `analyzeFile` and `extractFileData` read them with `include_scenes: true`.
   *
   * An audio file has no picture: the call throws `BadRequestError` with `error_code`
   * `frames_not_available`.
   */
  async analyzeFileScenes(file_id: string): Promise<AnalyzeFileScenesResult> {
    const response = await this.request<ApiSuccessResponse<AnalyzeFileScenesResult>>(
      'POST',
      `/file/${file_id}/scenes`
    );
    return response.data;
  }

  async cancelFileUpload(
    file_id: string
  ): Promise<{ file_id: string; file_name: string; message: string }> {
    const response = await this.request<
      ApiSuccessResponse<{ file_id: string; file_name: string; message: string }>
    >('POST', `/file/${file_id}/cancel`);
    return response.data;
  }
  //endregion

  //region --- Namespaces ---
  async getNamespaces(): Promise<Namespace[]> {
    const response = await this.request<ApiSuccessResponse<NamespaceJSON[]>>('GET', '/namespaces');
    return response.data.map((n) => Namespace.fromJSON(n));
  }

  async createNamespace(payload: { name: string }): Promise<Namespace> {
    const response = await this.request<ApiSuccessResponse<NamespaceJSON>>('POST', '/namespaces', payload);
    return Namespace.fromJSON(response.data);
  }

  async updateNamespace(namespace_id: string, payload: { name: string }): Promise<{ message: string }> {
    const body = await this.request<{ status: string; message: string }>(
      'PUT',
      `/namespaces/${namespace_id}`,
      payload
    );
    return { message: body.message };
  }

  async deleteNamespace(namespace_id: string): Promise<{ message: string }> {
    const body = await this.request<{ status: string; message: string }>(
      'DELETE',
      `/namespaces/${namespace_id}`
    );
    return { message: body.message };
  }

  async updateFileNamespaces(
    file_id: string,
    payload: { namespace_ids: string[] }
  ): Promise<{ message: string; namespace_ids: string[]; namespaces: NamespaceRef[] }> {
    const body = await this.request<{
      status: string;
      message: string;
      data: { namespace_ids: string[]; namespaces: NamespaceRefJSON[] };
    }>('PUT', `/file/${file_id}/namespaces`, payload);
    return {
      message: body.message,
      namespace_ids: body.data.namespace_ids,
      namespaces: body.data.namespaces.map(NamespaceRef.fromJSON),
    };
  }
  //endregion

  //region --- Analysis ---
  /**
   * Analyze an online video: a summary, the people, places and key subjects, and the answer to
   * an optional `query`. With `include_scenes: true` the analysis is made from the transcript and
   * from what the video shows, and the result also has `scenes` and `frames_analyzed`, as
   * {@link VidNavigatorClient.watch} returns them. When the picture cannot be read, the analysis
   * is made from the transcript alone and `scenes_error` says why; a video without a transcript
   * is analyzed from its scenes, and `transcript_error` says why the transcript is missing.
   *
   * This call waits on one HTTP request. With `include_scenes` on a video longer than about
   * 10 minutes, use {@link VidNavigatorClient.analyze}, which runs the same analysis as a
   * background job.
   */
  async analyzeVideo(payload: AnalyzeVideoPayload): Promise<AnalyzeVideoResult> {
    const response = await this.request<ApiSuccessResponse<AnalysisDataJSON & { video_info: VideoInfoJSON }>>(
      'POST',
      '/analyze/video',
      payload
    );

    return parseAnalyzeVideoData(response.data, response.usage ? UsageBlock.fromJSON(response.usage) : undefined);
  }

  /**
   * Analyze an uploaded file. With `include_scenes: true` the analysis is made from the transcript
   * of the file and its scenes together, and the result also has `scenes` and `frames_analyzed`.
   * The scenes are the ones kept with the file: ask for them at the upload (`include_scenes`) or
   * with {@link VidNavigatorClient.analyzeFileScenes}. A file that has none is refused with
   * `ScenesNotAvailableError` (HTTP 409), whose `scenes_status` says where their analysis stands.
   */
  async analyzeFile(payload: AnalyzeFilePayload): Promise<AnalyzeFileResult> {
    const response = await this.request<ApiSuccessResponse<AnalysisDataJSON & { file_info: FileInfoJSON }>>(
      'POST',
      '/analyze/file',
      payload
    );

    return {
      file_info: FileInfo.fromJSON(response.data.file_info),
      ...parseAnalysisData(response.data),
      usage: response.usage ? UsageBlock.fromJSON(response.usage) : undefined,
    };
  }

  /**
   * Structured claim analysis of an X/Twitter tweet. Blocking convenience wrapper around
   * {@link VidNavigatorClient.tweetStatement}: submits to `POST /tweet/statement/async` and polls.
   */
  async getTweetStatement(
    payload: TweetStatementPayload,
    options?: RunOptions<TweetStatementAsyncJob>
  ): Promise<TweetStatement> {
    return this.tweetStatement(payload, options);
  }
  //endregion

  //region --- Extraction ---
  /**
   * Structured-data extraction from an online video. Blocking convenience wrapper around
   * {@link VidNavigatorClient.extractVideo}: submits to `POST /extract/video/async` and polls, so
   * media of any length works. The result carries the extracted `data` and the video's `video_info`.
   * With `include_scenes: true` the fields are extracted from the transcript and from what the video
   * shows, and the result also has `frames_analyzed`.
   */
  async extractVideoData(
    payload: ExtractVideoDataPayload | ExtractVideoDataMultipartPayload,
    options?: PollOptions<ExtractVideoAsyncJob>
  ): Promise<ExtractDataResult> {
    const { include_usage, ...input } = payload;
    return this.extractVideo(input as ExtractVideoInput, { ...options, include_usage });
  }

  /**
   * Structured-data extraction from an uploaded file. With `include_scenes: true` the fields are
   * extracted from the transcript of the file and its scenes together, and the result has
   * `frames_analyzed`. The scenes are the ones kept with the file: ask for them at the upload
   * (`include_scenes`) or with {@link VidNavigatorClient.analyzeFileScenes}. A file that has none
   * is refused with `ScenesNotAvailableError` (HTTP 409).
   */
  async extractFileData(
    payload: ExtractFileDataPayload | ExtractFileDataMultipartPayload
  ): Promise<ExtractDataResult> {
    checkSchemaInput(payload);
    type ExtractFileBody = {
      status: 'success';
      data: Record<string, unknown>;
      file_info?: FileInfoJSON;
      schema?: ExtractionSchema;
      evidence?: ExtractionEvidence;
      usage?: UsageBlockJSON;
    } & SceneNotes;
    let body: ExtractFileBody;

    if ('schemaFilePath' in payload) {
      const form = new FormData();
      form.append('file_id', payload.file_id);
      form.append('schema', fs.createReadStream(payload.schemaFilePath));
      appendOptionalFormField(form, 'what_to_extract', payload.what_to_extract);
      appendOptionalFormField(form, 'include_scenes', payload.include_scenes);
      appendOptionalFormField(form, 'include_usage', payload.include_usage);
      body = await this.request<ExtractFileBody>('POST', '/extract/file', form, undefined, form.getHeaders());
    } else {
      body = await this.request<ExtractFileBody>('POST', '/extract/file', payload);
    }

    return {
      data: body.data,
      file_info: body.file_info ? FileInfo.fromJSON(body.file_info) : undefined,
      ...pickSceneNotes(body),
      ...(body.schema ? { schema: body.schema } : {}),
      ...(body.evidence ? { evidence: body.evidence } : {}),
      usage: body.usage ? UsageBlock.fromJSON(body.usage) : undefined,
    };
  }
  //endregion

  //region --- Search ---
  /**
   * Search YouTube for videos with AI analysis and ranking.
   *
   * If the account runs out of `residential_request` credits mid-search, the API
   * returns HTTP 402 with `status: "partial"` and the videos analysed so far. The
   * SDK surfaces that partial payload (results, `status: "partial"`, `error_code`,
   * and `usage` when requested) instead of throwing.
   */
  async searchYouTube(payload: SearchYouTubePayload): Promise<SearchYouTubeResult> {
    let response: {
      status?: 'success' | 'partial';
      error_code?: string;
      data: {
        results: VideoSearchResultJSON[];
        query: string;
        total_found: number;
        explanation?: string;
      };
      usage?: UsageBlockJSON;
    };

    try {
      response = await this.request('POST', '/youtube/search', payload);
    } catch (error: any) {
      const body = error?.details;
      if (error instanceof PaymentRequiredError && body?.status === 'partial' && body?.data) {
        response = body;
      } else {
        throw error;
      }
    }

    return {
      results: (response.data.results ?? []).map(VideoSearchResult.fromJSON),
      query: response.data.query,
      total_found: response.data.total_found,
      explanation: response.data.explanation,
      usage: response.usage ? UsageBlock.fromJSON(response.usage) : undefined,
      status: response.status,
      error_code: response.error_code,
    };
  }

  /**
   * @deprecated `/search/video` moved to `/youtube/search`. Use
   * {@link VidNavigatorClient.searchYouTube} instead. This alias forwards to
   * `searchYouTube` and will be removed in a future release.
   */
  async searchVideos(payload: SearchYouTubePayload): Promise<SearchYouTubeResult> {
    warnDeprecated('searchVideos', 'searchYouTube');
    return this.searchYouTube(payload);
  }

  async searchFiles(payload: SearchFilesPayload): Promise<SearchFilesResult> {
    const response = await this.request<
      ApiSuccessResponse<{
        results: FileSearchResultJSON[];
        query: string;
        total_found: number;
        explanation?: string;
      }>
    >('POST', '/search/file', payload);

    return {
      results: response.data.results.map(FileSearchResult.fromJSON),
      query: response.data.query,
      total_found: response.data.total_found,
      explanation: response.data.explanation,
      usage: response.usage ? UsageBlock.fromJSON(response.usage) : undefined,
    };
  }
  //endregion

  //region --- System ---
  async getUsage(): Promise<UsageData> {
    const response = await this.request<ApiSuccessResponse<UsageDataJSON>>('GET', '/usage');
    return UsageData.fromJSON(response.data);
  }

  async healthCheck(): Promise<{
    status?: string;
    message?: string;
    version?: string;
    endpoints?: Array<{
      path?: string;
      method?: string;
      description?: string;
      auth_required?: boolean;
    }>;
  }> {
    const response = await this.client.get('/health');
    return response.data;
  }
  //endregion
}

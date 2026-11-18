import { FileInfoJSON } from './FileInfo';
import { VideoInfoJSON } from './VideoInfo';
import { ScenesError, WatchTranscriptError } from './Watch';

/** JSON Schema types a property of an extraction schema can have. */
export type ExtractionFieldType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';

/**
 * One property of an extraction schema, in standard JSON Schema. Give it a `type` and a
 * `description` (what to put in it); `enum` restricts it to a list of values. Other JSON Schema
 * keywords are accepted (`$ref`, `format`, `minimum`, ...).
 */
export interface ExtractionField {
  type?: ExtractionFieldType | Array<ExtractionFieldType | 'null'>;
  description?: string;
  properties?: Record<string, ExtractionField>;
  items?: ExtractionField;
  enum?: Array<string | number | boolean | null>;
  [keyword: string]: unknown;
}

/**
 * The fields to extract, as a standard JSON Schema whose root is an object, for example what
 * `zod-to-json-schema` or Pydantic's `model_json_schema()` produce. At most 10 fields per level
 * and 3 levels of nesting.
 */
export interface ExtractionSchema {
  type: 'object';
  properties: Record<string, ExtractionField>;
  required?: string[];
  [keyword: string]: unknown;
}

export interface ExtractionTokenUsageJSON {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface ExtractionResponseJSON {
  status: 'success';
  data: Record<string, unknown>;
  video_info?: VideoInfoJSON;
  file_info?: FileInfoJSON;
  /** With `include_scenes`: number of frames that were analyzed to produce the scenes. */
  frames_analyzed?: number;
  scenes_error?: ScenesError;
  transcript_error?: WatchTranscriptError;
  /** When the request had no schema: the schema written from `what_to_extract`, to pass as `schema` next time. */
  schema?: ExtractionSchema;
  usage?: ExtractionTokenUsageJSON;
}

export class ExtractionTokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;

  constructor(data: ExtractionTokenUsageJSON) {
    this.prompt_tokens = data.prompt_tokens;
    this.completion_tokens = data.completion_tokens;
    this.total_tokens = data.total_tokens;
  }

  static fromJSON(json: ExtractionTokenUsageJSON): ExtractionTokenUsage {
    return new ExtractionTokenUsage(json);
  }
}

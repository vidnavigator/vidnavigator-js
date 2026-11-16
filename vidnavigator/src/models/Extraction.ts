import { FileInfoJSON } from './FileInfo';
import { VideoInfoJSON } from './VideoInfo';
import { ScenesError, WatchTranscriptError } from './Watch';

export type ExtractionFieldType =
  | 'String'
  | 'Number'
  | 'Boolean'
  | 'Integer'
  | 'Object'
  | 'Array'
  | 'Enum';

export interface ExtractionField {
  type: ExtractionFieldType;
  description: string;
  properties?: Record<string, ExtractionField>;
  items?: ExtractionField;
  enum?: string[];
}

/** Custom schema: field name -> field definition */
export type ExtractionSchema = Record<string, ExtractionField>;

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

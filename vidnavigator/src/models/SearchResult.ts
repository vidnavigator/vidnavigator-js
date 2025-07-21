import { FileInfo, FileInfoJSON } from './FileInfo';
import { VideoInfo, VideoInfoJSON } from './VideoInfo';

export interface BaseSearchResult {
  relevance_score?: number;
  transcript_summary?: string;
}

export interface VideoSearchResultJSON extends VideoInfoJSON, BaseSearchResult {}
export interface FileSearchResultJSON extends FileInfoJSON, BaseSearchResult {
  file_url?: string;
}

/**
 * Represents a single video result from a search query.
 */
export class VideoSearchResult extends VideoInfo implements BaseSearchResult {
  relevance_score?: number;
  transcript_summary?: string;

  constructor(data: Partial<VideoSearchResultJSON>) {
    super(data);
    this.relevance_score = data.relevance_score;
    this.transcript_summary = data.transcript_summary;
  }

  static fromJSON(json: VideoSearchResultJSON): VideoSearchResult {
    return new VideoSearchResult(json);
  }
}

/**
 * Represents a single file result from a search query.
 */
export class FileSearchResult extends FileInfo implements BaseSearchResult {
  relevance_score?: number;
  transcript_summary?: string;
  file_url?: string;

  constructor(data: FileSearchResultJSON) {
    super(data);
    this.relevance_score = data.relevance_score;
    this.transcript_summary = data.transcript_summary;
    this.file_url = data.file_url;
  }

  static fromJSON(json: FileSearchResultJSON): FileSearchResult {
    return new FileSearchResult(json);
  }
} 
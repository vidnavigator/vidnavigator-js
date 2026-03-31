import { NamedEntity } from './AnalysisResult';
import { FileInfo, FileInfoJSON } from './FileInfo';
import { VideoInfo, VideoInfoJSON } from './VideoInfo';

export interface SearchKeySubject {
  name?: string;
  description?: string;
}

export interface BaseSearchResult {
  relevance_score?: number;
  transcript_summary?: string;
}

export interface VideoSearchResultJSON extends VideoInfoJSON, BaseSearchResult {
  people?: NamedEntity[];
  places?: NamedEntity[];
  key_subjects?: SearchKeySubject[];
  timestamp?: number;
  relevant_text?: string;
  query_relevance?: string;
}

export interface FileSearchResultJSON extends FileInfoJSON, BaseSearchResult {
  file_url?: string;
  people?: NamedEntity[];
  places?: NamedEntity[];
  key_subjects?: SearchKeySubject[];
  timestamps?: number[];
  relevant_text?: string;
  query_answer?: string;
}

/**
 * Represents a single video result from a search query.
 */
export class VideoSearchResult extends VideoInfo implements BaseSearchResult {
  relevance_score?: number;
  transcript_summary?: string;
  people?: NamedEntity[];
  places?: NamedEntity[];
  key_subjects?: SearchKeySubject[];
  timestamp?: number;
  relevant_text?: string;
  query_relevance?: string;

  constructor(data: Partial<VideoSearchResultJSON>) {
    super(data);
    this.relevance_score = data.relevance_score;
    this.transcript_summary = data.transcript_summary;
    this.people = data.people;
    this.places = data.places;
    this.key_subjects = data.key_subjects;
    this.timestamp = data.timestamp;
    this.relevant_text = data.relevant_text;
    this.query_relevance = data.query_relevance;
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
  people?: NamedEntity[];
  places?: NamedEntity[];
  key_subjects?: SearchKeySubject[];
  timestamps?: number[];
  relevant_text?: string;
  query_answer?: string;

  constructor(data: FileSearchResultJSON) {
    super(data);
    this.relevance_score = data.relevance_score;
    this.transcript_summary = data.transcript_summary;
    this.file_url = data.file_url;
    this.people = data.people;
    this.places = data.places;
    this.key_subjects = data.key_subjects;
    this.timestamps = data.timestamps;
    this.relevant_text = data.relevant_text;
    this.query_answer = data.query_answer;
  }

  static fromJSON(json: FileSearchResultJSON): FileSearchResult {
    return new FileSearchResult(json);
  }
} 
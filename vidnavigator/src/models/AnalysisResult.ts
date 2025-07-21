export interface NamedEntity {
  name?: string;
  context?: string;
}

export interface KeySubject {
  name?: string;
  description?: string;
  importance?: string;
}

export interface QueryAnswer {
  answer?: string;
  best_segment_index?: number;
  relevant_segments?: string[];
}

export interface AnalysisResultJSON {
  summary?: string;
  people?: NamedEntity[];
  places?: NamedEntity[];
  key_subjects?: KeySubject[];
  timestamp?: number;
  relevant_text?: string;
  query_answer?: QueryAnswer;
}

/**
 * Represents the result of an AI analysis on a video or file.
 */
export class AnalysisResult {
  summary?: string;
  people?: NamedEntity[];
  places?: NamedEntity[];
  key_subjects?: KeySubject[];
  timestamp?: number;
  relevant_text?: string;
  query_answer?: QueryAnswer;

  constructor(data: Partial<AnalysisResultJSON>) {
    Object.assign(this, data);
  }

  static fromJSON(json: AnalysisResultJSON): AnalysisResult {
    return new AnalysisResult(json);
  }

  toJSON(): AnalysisResultJSON {
    return { ...this };
  }
} 
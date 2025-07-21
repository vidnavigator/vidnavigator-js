export interface TranscriptSegmentJSON {
  text: string;
  start: number;
  end: number;
}

/**
 * Represents a single segment of a video or audio transcript.
 */
export class TranscriptSegment {
  /** The text content of the transcript segment. */
  text: string;
  /** The start time of the segment in seconds. */
  start: number;
  /** The end time of the segment in seconds. */
  end: number;

  constructor(data: TranscriptSegmentJSON) {
    this.text = data.text;
    this.start = data.start;
    this.end = data.end;
  }

  /**
   * Creates a TranscriptSegment instance from a JSON object.
   */
  static fromJSON(json: TranscriptSegmentJSON): TranscriptSegment {
    return new TranscriptSegment(json);
  }

  /**
   * Converts the instance to its JSON representation.
   */
  toJSON(): TranscriptSegmentJSON {
    return { ...this };
  }
} 
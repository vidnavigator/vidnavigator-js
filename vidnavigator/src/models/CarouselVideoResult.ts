import { VideoInfo, VideoInfoJSON } from './VideoInfo';
import { transcriptFromJSON, TranscriptOutput, TranscriptOutputJSON } from './TranscriptSegment';

export type { TranscriptOutputJSON };

export interface CarouselVideoResultJSON {
  index?: number;
  status?: 'success' | 'error';
  video_info?: VideoInfoJSON;
  transcript?: TranscriptOutputJSON;
  error?: string;
  message?: string;
}

export class CarouselVideoResult {
  index?: number;
  status?: 'success' | 'error';
  video_info?: VideoInfo;
  transcript?: TranscriptOutput;
  error?: string;
  message?: string;

  constructor(data: Partial<{
    index?: number;
    status?: 'success' | 'error';
    video_info?: VideoInfo;
    transcript?: TranscriptOutput;
    error?: string;
    message?: string;
  }>) {
    Object.assign(this, data);
  }

  static fromJSON(json: CarouselVideoResultJSON): CarouselVideoResult {
    return new CarouselVideoResult({
      index: json.index,
      status: json.status,
      video_info: json.video_info ? VideoInfo.fromJSON(json.video_info) : undefined,
      transcript: transcriptFromJSON(json.transcript),
      error: json.error,
      message: json.message,
    });
  }
}

import { UsageBlock } from './Usage';
import { VideoInfo, VideoInfoJSON } from './VideoInfo';
import { transcriptFromJSON, TranscriptOutput, TranscriptOutputJSON } from './TranscriptSegment';

export interface VideoSceneJSON {
  start: number;
  end: number;
  description?: string;
  on_screen_text?: string;
}

/** What a video shows between `start` and `end`. */
export class VideoScene {
  /** Start of the scene, in seconds from the beginning of the video. */
  start: number;
  /** End of the scene, in seconds: the start of the next scene, or the end of the video. */
  end: number;
  /** What is visible: people, setting, action, objects. */
  description: string;
  /** Text readable on screen (captions, titles, signs), verbatim. Empty when there is none. */
  on_screen_text: string;

  constructor(data: VideoSceneJSON) {
    this.start = data.start;
    this.end = data.end;
    this.description = data.description ?? '';
    this.on_screen_text = data.on_screen_text ?? '';
  }

  static fromJSON(json: VideoSceneJSON): VideoScene {
    return new VideoScene(json);
  }
}

/** Why a watched video came back without a transcript (e.g. `transcript_not_available`). */
export interface WatchTranscriptError {
  error?: string;
  message?: string;
}

export interface WatchResultJSON {
  video_info: VideoInfoJSON;
  transcript?: TranscriptOutputJSON;
  transcript_error?: WatchTranscriptError;
  scenes?: VideoSceneJSON[];
  frames_analyzed?: number;
}

/**
 * A watched video: its metadata, what it says and what it shows.
 *
 * `transcript` is left out when the request set `include_transcript: false`, and empty when the
 * video has none; `transcript_error` then says why. The scenes are returned in both cases.
 */
export class WatchResult {
  video_info: VideoInfo;
  /** What is said: segments, or one string with `transcript_text: true`. */
  transcript?: TranscriptOutput;
  /** Present only when the transcript could not be had, for instance on a video without speech. */
  transcript_error?: WatchTranscriptError;
  /** What is shown, in chronological order. */
  scenes: VideoScene[];
  /** Number of frames of the video that were analyzed to produce the scenes. */
  frames_analyzed?: number;
  /** Per-call usage, populated when requested with include_usage. */
  usage?: UsageBlock;

  constructor(data: WatchResultJSON) {
    this.video_info = VideoInfo.fromJSON(data.video_info ?? {});
    this.transcript = transcriptFromJSON(data.transcript);
    this.transcript_error = data.transcript_error;
    this.scenes = (data.scenes ?? []).map((scene) => VideoScene.fromJSON(scene));
    this.frames_analyzed = data.frames_analyzed;
  }

  static fromJSON(json: WatchResultJSON): WatchResult {
    return new WatchResult(json);
  }
}

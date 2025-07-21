export interface VideoInfoJSON {
  title?: string;
  description?: string;
  thumbnail?: string;
  url?: string;
  channel?: string;
  channel_url?: string;
  duration?: number;
  views?: number;
  likes?: number;
  published_date?: string;
  keywords?: string[];
  category?: string;
  available_languages?: string[];
  selected_language?: string;
}

/**
 * Represents detailed information about a video, typically from an online source like YouTube.
 */
export class VideoInfo {
  title?: string;
  description?: string;
  thumbnail?: string;
  url?: string;
  channel?: string;
  channel_url?: string;
  duration?: number;
  views?: number;
  likes?: number;
  published_date?: string;
  keywords?: string[];
  category?: string;
  available_languages?: string[];
  selected_language?: string;

  constructor(data: Partial<VideoInfoJSON>) {
    Object.assign(this, data);
  }

  /**
   * Creates a VideoInfo instance from a JSON object.
   * @param json - The raw JSON object from the API.
   * @returns A new VideoInfo instance.
   */
  static fromJSON(json: VideoInfoJSON): VideoInfo {
    return new VideoInfo(json);
  }

  /**
   * Converts the VideoInfo instance to its JSON representation.
   */
  toJSON(): VideoInfoJSON {
    return { ...this };
  }
} 
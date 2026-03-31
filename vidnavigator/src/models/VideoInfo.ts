import { VideoCarouselInfo, VideoCarouselInfoJSON } from './Carousel';

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
  carousel_info?: VideoCarouselInfoJSON;
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
  carousel_info?: VideoCarouselInfo;

  constructor(
    data: Partial<VideoInfoJSON> & { carousel_info?: VideoCarouselInfo | VideoCarouselInfoJSON }
  ) {
    const { carousel_info, ...rest } = data;
    Object.assign(this, rest);
    if (carousel_info !== undefined) {
      this.carousel_info =
        carousel_info instanceof VideoCarouselInfo
          ? carousel_info
          : VideoCarouselInfo.fromJSON(carousel_info);
    }
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
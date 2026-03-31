export interface VideoCarouselInfoJSON {
  total_items?: number;
  video_count?: number;
  image_count?: number;
  selected_index?: number;
}

export class VideoCarouselInfo {
  total_items?: number;
  video_count?: number;
  image_count?: number;
  selected_index?: number;

  constructor(data: Partial<VideoCarouselInfoJSON>) {
    Object.assign(this, data);
  }

  static fromJSON(json: VideoCarouselInfoJSON): VideoCarouselInfo {
    return new VideoCarouselInfo(json);
  }
}

export interface CarouselInfoJSON {
  total_items?: number;
  video_count?: number;
  image_count?: number;
  transcribed_count?: number;
  total_duration?: number;
}

export class CarouselInfo {
  total_items?: number;
  video_count?: number;
  image_count?: number;
  transcribed_count?: number;
  total_duration?: number;

  constructor(data: Partial<CarouselInfoJSON>) {
    Object.assign(this, data);
  }

  static fromJSON(json: CarouselInfoJSON): CarouselInfo {
    return new CarouselInfo(json);
  }
}

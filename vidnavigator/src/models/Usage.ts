export type UnlimitedOrNumber = number | 'unlimited';

export interface CreditsInfoJSON {
  monthly_total: UnlimitedOrNumber;
  monthly_remaining: UnlimitedOrNumber;
  purchased: number;
}

export class CreditsInfo {
  monthly_total: UnlimitedOrNumber;
  monthly_remaining: UnlimitedOrNumber;
  purchased: number;

  constructor(data: CreditsInfoJSON) {
    this.monthly_total = data.monthly_total;
    this.monthly_remaining = data.monthly_remaining;
    this.purchased = data.purchased;
  }

  static fromJSON(data: CreditsInfoJSON): CreditsInfo {
    return new CreditsInfo(data);
  }
}

export interface ActivityCountJSON {
  used: number;
  unit?: string;
}

export class ActivityCount {
  used: number;
  unit?: string;

  constructor(data: ActivityCountJSON) {
    this.used = data.used;
    this.unit = data.unit;
  }

  static fromJSON(data: ActivityCountJSON): ActivityCount {
    return new ActivityCount(data);
  }
}

export interface CapacityMetricJSON {
  used: number;
  limit: number | 'unlimited';
  remaining: number | 'unlimited';
  percentage: number;
}

export class CapacityMetric {
  used: number;
  limit: number | 'unlimited';
  remaining: number | 'unlimited';
  percentage: number;

  constructor(data: CapacityMetricJSON) {
    this.used = data.used;
    this.limit = data.limit;
    this.remaining = data.remaining;
    this.percentage = data.percentage;
  }

  static fromJSON(data: CapacityMetricJSON): CapacityMetric {
    return new CapacityMetric(data);
  }
}

export interface StorageUsageJSON {
  used_bytes: number;
  used_formatted: string;
  limit_bytes: number | 'unlimited';
  limit_formatted: string;
  remaining_bytes: number | 'unlimited';
  remaining_formatted: string;
  percentage: number;
}

export class StorageUsage {
  public usedBytes: number;
  public usedFormatted: string;
  public limitBytes: number | 'unlimited';
  public limitFormatted: string;
  public remainingBytes: number | 'unlimited';
  public remainingFormatted: string;
  public percentage: number;

  constructor(data: StorageUsageJSON) {
    this.usedBytes = data.used_bytes;
    this.usedFormatted = data.used_formatted;
    this.limitBytes = data.limit_bytes;
    this.limitFormatted = data.limit_formatted;
    this.remainingBytes = data.remaining_bytes;
    this.remainingFormatted = data.remaining_formatted;
    this.percentage = data.percentage;
  }

  static fromJSON(data: StorageUsageJSON): StorageUsage {
    return new StorageUsage(data);
  }
}

export type PlanInterval = 'month' | 'year';

export interface UsageDataJSON {
  usage_period: {
    start: string;
    end: string;
  };
  billing_period: {
    start: string;
    end: string;
    interval: PlanInterval;
  };
  subscription: {
    plan_id: string;
    plan_name: string;
    interval: PlanInterval;
    status: string;
    cancel_at_period_end: boolean;
  };
  credits: CreditsInfoJSON;
  usage: {
    standard_request?: ActivityCountJSON;
    residential_request?: ActivityCountJSON;
    search_request?: ActivityCountJSON;
    analysis_request?: ActivityCountJSON;
    transcription_hour?: ActivityCountJSON;
    video_scene_analyses?: ActivityCountJSON;
    video_transcripts?: ActivityCountJSON;
    youtube_transcripts?: ActivityCountJSON;
    video_searches?: ActivityCountJSON;
    video_analyses?: ActivityCountJSON;
    video_uploads?: ActivityCountJSON;
  };
  channels_indexed: CapacityMetricJSON;
  storage: StorageUsageJSON;
  generated_at: string;
}

export class UsageData {
  public usagePeriod: {
    start: Date;
    end: Date;
  };
  public billingPeriod: {
    start: Date;
    end: Date;
    interval: PlanInterval;
  };
  public subscription: {
    planId: string;
    planName: string;
    interval: PlanInterval;
    status: string;
    cancelAtPeriodEnd: boolean;
  };
  public credits: CreditsInfo;
  public usage: {
    standardRequest?: ActivityCount;
    residentialRequest?: ActivityCount;
    searchRequest?: ActivityCount;
    analysisRequest?: ActivityCount;
    transcriptionHour?: ActivityCount;
    videoSceneAnalyses?: ActivityCount;
    videoTranscripts?: ActivityCount;
    youtubeTranscripts?: ActivityCount;
    videoSearches?: ActivityCount;
    videoAnalyses?: ActivityCount;
    videoUploads?: ActivityCount;
  };
  public channelsIndexed: CapacityMetric;
  public storage: StorageUsage;
  public generatedAt: Date;

  constructor(data: UsageDataJSON) {
    this.usagePeriod = {
      start: new Date(data.usage_period.start),
      end: new Date(data.usage_period.end),
    };
    this.billingPeriod = {
      start: new Date(data.billing_period.start),
      end: new Date(data.billing_period.end),
      interval: data.billing_period.interval,
    };
    this.subscription = {
      planId: data.subscription.plan_id,
      planName: data.subscription.plan_name,
      interval: data.subscription.interval,
      status: data.subscription.status,
      cancelAtPeriodEnd: data.subscription.cancel_at_period_end,
    };
    this.credits = CreditsInfo.fromJSON(data.credits);
    this.usage = {
      standardRequest: data.usage.standard_request ? ActivityCount.fromJSON(data.usage.standard_request) : undefined,
      residentialRequest: data.usage.residential_request ? ActivityCount.fromJSON(data.usage.residential_request) : undefined,
      searchRequest: data.usage.search_request ? ActivityCount.fromJSON(data.usage.search_request) : undefined,
      analysisRequest: data.usage.analysis_request ? ActivityCount.fromJSON(data.usage.analysis_request) : undefined,
      transcriptionHour: data.usage.transcription_hour ? ActivityCount.fromJSON(data.usage.transcription_hour) : undefined,
      videoSceneAnalyses: data.usage.video_scene_analyses ? ActivityCount.fromJSON(data.usage.video_scene_analyses) : undefined,
      videoTranscripts: data.usage.video_transcripts ? ActivityCount.fromJSON(data.usage.video_transcripts) : undefined,
      youtubeTranscripts: data.usage.youtube_transcripts ? ActivityCount.fromJSON(data.usage.youtube_transcripts) : undefined,
      videoSearches: data.usage.video_searches ? ActivityCount.fromJSON(data.usage.video_searches) : undefined,
      videoAnalyses: data.usage.video_analyses ? ActivityCount.fromJSON(data.usage.video_analyses) : undefined,
      videoUploads: data.usage.video_uploads ? ActivityCount.fromJSON(data.usage.video_uploads) : undefined,
    };
    this.channelsIndexed = CapacityMetric.fromJSON(data.channels_indexed);
    this.storage = StorageUsage.fromJSON(data.storage);
    this.generatedAt = new Date(data.generated_at);
  }

  static fromJSON(data: UsageDataJSON): UsageData {
    return new UsageData(data);
  }
}

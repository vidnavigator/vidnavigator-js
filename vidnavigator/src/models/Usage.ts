export type UnlimitedOrNumber = number | 'unlimited';

/** Meters that can appear in a per-call {@link UsageBlock}. */
export type UsageServiceType =
  | 'standard_request'
  | 'residential_request'
  | 'transcription_hour'
  | 'analysis_request'
  | 'search_request'
  | 'scene_analysis_hour';

export interface UsageTokens {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface UsageChargeJSON {
  service_type: UsageServiceType;
  quantity: number;
  credits: number;
  waived?: boolean;
  credits_saved?: number;
  tokens?: UsageTokens;
}

/** A single consolidated meter charge within a per-call usage block. */
export class UsageCharge {
  service_type: UsageServiceType;
  quantity: number;
  credits: number;
  waived?: boolean;
  credits_saved?: number;
  tokens?: UsageTokens;

  constructor(data: UsageChargeJSON) {
    this.service_type = data.service_type;
    this.quantity = data.quantity;
    this.credits = data.credits;
    this.waived = data.waived;
    this.credits_saved = data.credits_saved;
    this.tokens = data.tokens;
  }

  static fromJSON(json: UsageChargeJSON): UsageCharge {
    return new UsageCharge(json);
  }
}

export interface UsageBlockJSON {
  charges?: UsageChargeJSON[];
  total_credits?: number;
  credits_remaining_after?: number;
  waived?: { credits_saved: number };
  /** Legacy flat token fields. Some /extract/* responses may still echo these. */
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

/**
 * Per-call usage disclosure returned when a request is made with `include_usage=true`.
 * Lists every meter charged during the request plus the credits actually deducted.
 *
 * LLM token counts live nested inside the `analysis_request` charge; use the
 * {@link UsageBlock.analysis_tokens} accessor to read them (it falls back to the
 * legacy flat token fields when present).
 */
export class UsageBlock {
  charges: UsageCharge[];
  total_credits?: number;
  credits_remaining_after?: number;
  waived?: { credits_saved: number };
  /** Legacy flat token fields, only present on some /extract/* responses. */
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;

  constructor(data: UsageBlockJSON) {
    this.charges = (data.charges ?? []).map(UsageCharge.fromJSON);
    this.total_credits = data.total_credits;
    this.credits_remaining_after = data.credits_remaining_after;
    this.waived = data.waived;
    this.prompt_tokens = data.prompt_tokens;
    this.completion_tokens = data.completion_tokens;
    this.total_tokens = data.total_tokens;
  }

  /** Return the consolidated charge entry for a given meter, if present. */
  charge_for(service_type: UsageServiceType): UsageCharge | undefined {
    return this.charges.find((c) => c.service_type === service_type);
  }

  /** camelCase alias for {@link UsageBlock.charge_for}. */
  chargeFor(service_type: UsageServiceType): UsageCharge | undefined {
    return this.charge_for(service_type);
  }

  /**
   * LLM token tally for this request. Reads the `tokens` object from the
   * `analysis_request` charge, falling back to legacy flat token fields.
   */
  get analysis_tokens(): UsageTokens | undefined {
    const analysis = this.charge_for('analysis_request');
    if (analysis?.tokens) return analysis.tokens;
    if (
      this.prompt_tokens !== undefined ||
      this.completion_tokens !== undefined ||
      this.total_tokens !== undefined
    ) {
      return {
        prompt_tokens: this.prompt_tokens,
        completion_tokens: this.completion_tokens,
        total_tokens: this.total_tokens,
      };
    }
    return undefined;
  }

  /** camelCase alias for {@link UsageBlock.analysis_tokens}. */
  get analysisTokens(): UsageTokens | undefined {
    return this.analysis_tokens;
  }

  static fromJSON(json: UsageBlockJSON): UsageBlock {
    return new UsageBlock(json);
  }
}

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

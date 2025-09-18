export interface ServiceUsageJSON {
    used: number;
    limit: number | 'unlimited';
    remaining: number | 'unlimited';
    percentage: number;
    unit?: string;
}

export class ServiceUsage {
    public used: number;
    public limit: number | 'unlimited';
    public remaining: number | 'unlimited';
    public percentage: number;
    public unit?: string;

    constructor(data: ServiceUsageJSON) {
        this.used = data.used;
        this.limit = data.limit;
        this.remaining = data.remaining;
        this.percentage = data.percentage;
        this.unit = data.unit;
    }

    static fromJSON(data: ServiceUsageJSON): ServiceUsage {
        return new ServiceUsage(data);
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
    usage: {
        video_transcripts: ServiceUsageJSON;
        video_searches: ServiceUsageJSON;
        video_analyses: ServiceUsageJSON;
        video_scene_analyses: ServiceUsageJSON;
        youtube_channels_scans: ServiceUsageJSON;
        video_uploads: ServiceUsageJSON;
    };
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
    public usage: {
        videoTranscripts: ServiceUsage;
        videoSearches: ServiceUsage;
        videoAnalyses: ServiceUsage;
        videoSceneAnalyses: ServiceUsage;
        youtubeChannelsScans: ServiceUsage;
        videoUploads: ServiceUsage;
    };
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
        this.usage = {
            videoTranscripts: ServiceUsage.fromJSON(data.usage.video_transcripts),
            videoSearches: ServiceUsage.fromJSON(data.usage.video_searches),
            videoAnalyses: ServiceUsage.fromJSON(data.usage.video_analyses),
            videoSceneAnalyses: ServiceUsage.fromJSON(data.usage.video_scene_analyses),
            youtubeChannelsScans: ServiceUsage.fromJSON(data.usage.youtube_channels_scans),
            videoUploads: ServiceUsage.fromJSON(data.usage.video_uploads),
        };
        this.storage = StorageUsage.fromJSON(data.storage);
        this.generatedAt = new Date(data.generated_at);
    }

    static fromJSON(data: UsageDataJSON): UsageData {
        return new UsageData(data);
    }
} 
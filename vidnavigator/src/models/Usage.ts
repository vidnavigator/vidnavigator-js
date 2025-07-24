export interface ServiceUsageJSON {
    used: number;
    limit: number | 'unlimited';
    remaining: number | 'unlimited';
    percentage: number;
    unit: string;
}

export class ServiceUsage {
    public used: number;
    public limit: number | 'unlimited';
    public remaining: number | 'unlimited';
    public percentage: number;
    public unit: string;

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

export interface UsageDataJSON {
    current_period: {
        start_date: string;
        end_date: string;
    };
    subscription: {
        plan_id: string;
        plan_name: string;
    };
    usage: {
        video_transcripts: ServiceUsageJSON;
        video_searches: ServiceUsageJSON;
        video_analyses: ServiceUsageJSON;
        video_scene_analyses: ServiceUsageJSON;
        video_uploads: ServiceUsageJSON;
    };
    storage: StorageUsageJSON;
}

export class UsageData {
    public currentPeriod: {
        startDate: Date;
        endDate: Date;
    };
    public subscription: {
        planId: string;
        planName: string;
    };
    public usage: {
        videoTranscripts: ServiceUsage;
        videoSearches: ServiceUsage;
        videoAnalyses: ServiceUsage;
        videoSceneAnalyses: ServiceUsage;
        videoUploads: ServiceUsage;
    };
    public storage: StorageUsage;

    constructor(data: UsageDataJSON) {
        this.currentPeriod = {
            startDate: new Date(data.current_period.start_date),
            endDate: new Date(data.current_period.end_date),
        };
        this.subscription = {
            planId: data.subscription.plan_id,
            planName: data.subscription.plan_name,
        };
        this.usage = {
            videoTranscripts: ServiceUsage.fromJSON(data.usage.video_transcripts),
            videoSearches: ServiceUsage.fromJSON(data.usage.video_searches),
            videoAnalyses: ServiceUsage.fromJSON(data.usage.video_analyses),
            videoSceneAnalyses: ServiceUsage.fromJSON(data.usage.video_scene_analyses),
            videoUploads: ServiceUsage.fromJSON(data.usage.video_uploads),
        };
        this.storage = StorageUsage.fromJSON(data.storage);
    }

    static fromJSON(data: UsageDataJSON): UsageData {
        return new UsageData(data);
    }
} 
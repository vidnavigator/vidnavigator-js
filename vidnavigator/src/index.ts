import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import {
  VideoInfo,
  VideoInfoJSON,
  TranscriptSegmentJSON,
  TranscriptOutput,
  transcriptFromJSON,
  FileInfo,
  FileInfoJSON,
  AnalysisResult,
  AnalysisResultJSON,
  VideoSearchResult,
  VideoSearchResultJSON,
  FileSearchResult,
  FileSearchResultJSON,
  UsageData,
  UsageDataJSON,
  Namespace,
  NamespaceJSON,
  NamespaceRef,
  NamespaceRefJSON,
  ExtractionSchema,
  ExtractionTokenUsage,
  ExtractionTokenUsageJSON,
  CarouselInfo,
  CarouselInfoJSON,
  CarouselVideoResult,
  CarouselVideoResultJSON,
} from './models';
import {
  VidNavigatorError,
  AuthenticationError,
  BadRequestError,
  AccessDeniedError,
  NotFoundError,
  RateLimitExceededError,
  PaymentRequiredError,
  ServerError,
  StorageQuotaExceededError,
  GeoRestrictedError,
  SystemOverloadError,
} from './errors';

export * from './models';
export * from './errors';

/** SDK version (keep in sync with package.json) */
export const SDK_VERSION = '1.0.0';

//region --- Interfaces ---
export interface SDKConfig {
  apiKey: string;
  baseURL?: string;
  axiosConfig?: AxiosRequestConfig;
}

interface ApiSuccessResponse<T> {
  status: 'success';
  data: T;
}

export type TranscriptRequestPayload = {
  video_url: string;
  language?: string;
  metadata_only?: boolean;
  fallback_to_metadata?: boolean;
  transcript_text?: boolean;
};

export type TranscribeVideoPayload = {
  video_url: string;
  transcript_text?: boolean;
  all_videos?: boolean;
};

export type TranscribeVideoSingleResult = {
  video_info: VideoInfo;
  transcript: TranscriptOutput;
};

export type TranscribeVideoCarouselResult = {
  carousel_info: CarouselInfo;
  videos: CarouselVideoResult[];
};

export type TranscribeVideoResult = TranscribeVideoSingleResult | TranscribeVideoCarouselResult;

export type UploadFileSuccessResult = {
  status: 'success';
  file_id: string;
  file_name: string;
  file_status: 'processing' | 'completed';
  message: string;
  file_info: FileInfo;
};

export type UploadFileAcceptedResult = {
  status: 'accepted';
  file_id: string;
  file_name: string;
  file_status: 'processing';
  message: string;
  note?: string;
  file_info?: FileInfo;
};

export type UploadFileResult = UploadFileSuccessResult | UploadFileAcceptedResult;

export interface ExtractDataResult {
  data: Record<string, unknown>;
  usage?: ExtractionTokenUsage;
}
//endregion

function parseApiErrorPayload(data: any): {
  errorCode?: string;
  errorMessage?: string;
  details?: any;
} {
  const errorField = data?.error;
  const errorCode =
    typeof errorField === 'string' ? errorField : errorField?.code;
  const errorMessage =
    data?.message ??
    (typeof errorField === 'object' ? errorField?.message : undefined);
  return { errorCode, errorMessage, details: data };
}

export class VidNavigatorClient {
  private client: AxiosInstance;

  constructor(config: SDKConfig) {
    if (!config?.apiKey) {
      throw new Error('An API key is required to use the VidNavigator SDK.');
    }

    this.client = axios.create({
      baseURL: config.baseURL ?? 'https://api.vidnavigator.com/v1',
      headers: {
        'X-API-Key': config.apiKey,
        'User-Agent': `vidnavigator-js/${SDK_VERSION}`,
      },
      ...config.axiosConfig,
    });
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE' | 'PUT',
    url: string,
    data?: any,
    params?: any,
    extraHeaders?: any
  ): Promise<T> {
    try {
      const response = await this.client.request<T>({
        method,
        url,
        data,
        params,
        headers: extraHeaders,
      });
      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        const { status, data } = error.response;
        const { errorCode, errorMessage, details } = parseApiErrorPayload(data);
        const message = `API request failed with status ${status}: ${errorMessage || error.message}`;

        switch (status) {
          case 400:
            throw new BadRequestError(message, status, errorCode, errorMessage, details);
          case 401:
            throw new AuthenticationError(message, status, errorCode, errorMessage, details);
          case 402:
            throw new PaymentRequiredError(message, status, errorCode, errorMessage, details);
          case 403:
            throw new AccessDeniedError(message, status, errorCode, errorMessage, details);
          case 404:
            throw new NotFoundError(message, status, errorCode, errorMessage, details);
          case 413:
            throw new StorageQuotaExceededError(message, status, errorCode, errorMessage, details);
          case 429:
            throw new RateLimitExceededError(message, status, errorCode, errorMessage, details);
          case 451:
            throw new GeoRestrictedError(message, status, errorCode, errorMessage, details);
          case 503:
            throw new SystemOverloadError(
              message,
              status,
              errorCode,
              errorMessage,
              details,
              data?.retry_after_seconds
            );
          default:
            if (status >= 500) {
              throw new ServerError(message, status, errorCode, errorMessage, details);
            }
            throw new VidNavigatorError(message, status, errorCode, errorMessage, details);
        }
      }
      throw new VidNavigatorError(error.message);
    }
  }

  //region --- Transcripts ---
  async getTranscript(payload: TranscriptRequestPayload): Promise<{
    video_info: VideoInfo;
    transcript: TranscriptOutput;
  }> {
    const response = await this.request<
      ApiSuccessResponse<{
        video_info: VideoInfoJSON;
        transcript: TranscriptSegmentJSON[] | string;
      }>
    >('POST', '/transcript', payload);

    return {
      video_info: VideoInfo.fromJSON(response.data.video_info),
      transcript: transcriptFromJSON(response.data.transcript)!,
    };
  }

  async getYouTubeTranscript(payload: TranscriptRequestPayload): Promise<{
    video_info: VideoInfo;
    transcript: TranscriptOutput;
  }> {
    const response = await this.request<
      ApiSuccessResponse<{
        video_info: VideoInfoJSON;
        transcript: TranscriptSegmentJSON[] | string;
      }>
    >('POST', '/transcript/youtube', payload);

    return {
      video_info: VideoInfo.fromJSON(response.data.video_info),
      transcript: transcriptFromJSON(response.data.transcript)!,
    };
  }

  async transcribeVideo(payload: TranscribeVideoPayload): Promise<TranscribeVideoResult> {
    const response = await this.request<
      | ApiSuccessResponse<{
          video_info: VideoInfoJSON;
          transcript: TranscriptSegmentJSON[] | string;
        }>
      | ApiSuccessResponse<{
          carousel_info: CarouselInfoJSON;
          videos: CarouselVideoResultJSON[];
        }>
    >('POST', '/transcribe', payload);

    const inner = response.data;
    if ('videos' in inner && 'carousel_info' in inner) {
      return {
        carousel_info: CarouselInfo.fromJSON(inner.carousel_info),
        videos: inner.videos.map((v) => CarouselVideoResult.fromJSON(v)),
      };
    }
    const single = inner as {
      video_info: VideoInfoJSON;
      transcript: TranscriptSegmentJSON[] | string;
    };
    return {
      video_info: VideoInfo.fromJSON(single.video_info),
      transcript: transcriptFromJSON(single.transcript)!,
    };
  }
  //endregion

  //region --- Files ---
  async getFiles(query?: {
    limit?: number;
    offset?: number;
    status?: 'processing' | 'completed' | 'failed' | 'cancelled';
    namespace_id?: string;
  }): Promise<{
    files: FileInfo[];
    total_count: number;
    limit: number;
    offset: number;
    has_more: boolean;
  }> {
    const response = await this.request<
      ApiSuccessResponse<{
        files: FileInfoJSON[];
        total_count: number;
        limit: number;
        offset: number;
        has_more: boolean;
      }>
    >('GET', '/files', undefined, query);

    return {
      files: response.data.files.map(FileInfo.fromJSON),
      total_count: response.data.total_count,
      limit: response.data.limit,
      offset: response.data.offset,
      has_more: response.data.has_more,
    };
  }

  async getFile(
    file_id: string,
    query?: { transcript_text?: boolean }
  ): Promise<{ file_info: FileInfo; transcript?: TranscriptOutput }> {
    const response = await this.request<
      ApiSuccessResponse<{
        file_info: FileInfoJSON;
        transcript?: TranscriptSegmentJSON[] | string;
      }>
    >('GET', `/file/${file_id}`, undefined, query);

    return {
      file_info: FileInfo.fromJSON(response.data.file_info),
      transcript: transcriptFromJSON(response.data.transcript),
    };
  }

  async uploadFile(options: {
    filePath: string;
    wait_for_completion?: boolean;
    namespace_ids?: string[];
  }): Promise<UploadFileResult> {
    const form = new FormData();
    form.append('file', fs.createReadStream(options.filePath));
    if (options.wait_for_completion) {
      form.append('wait_for_completion', 'true');
    }
    if (options.namespace_ids?.length) {
      form.append('namespace_ids', JSON.stringify(options.namespace_ids));
    }

    try {
      const response = await this.client.post<{
        status: 'success' | 'accepted';
        file_id: string;
        file_name: string;
        file_status: 'processing' | 'completed';
        message: string;
        note?: string;
        data?: { file_info: FileInfoJSON };
      }>('/upload/file', form, { headers: form.getHeaders() });

      const body = response.data;
      const fileInfo = body.data?.file_info ? FileInfo.fromJSON(body.data.file_info) : undefined;
      if (body.status === 'accepted') {
        return {
          status: 'accepted',
          file_id: body.file_id,
          file_name: body.file_name,
          file_status: body.file_status as 'processing',
          message: body.message,
          note: body.note,
          file_info: fileInfo,
        };
      }
      return {
        status: 'success',
        file_id: body.file_id,
        file_name: body.file_name,
        file_status: body.file_status,
        message: body.message,
        file_info: fileInfo!,
      };
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        const { status, data } = error.response;
        const { errorCode, errorMessage, details } = parseApiErrorPayload(data);
        const message = `API request failed with status ${status}: ${errorMessage || error.message}`;
        switch (status) {
          case 400:
            throw new BadRequestError(message, status, errorCode, errorMessage, details);
          case 401:
            throw new AuthenticationError(message, status, errorCode, errorMessage, details);
          case 402:
            throw new PaymentRequiredError(message, status, errorCode, errorMessage, details);
          case 413:
            throw new StorageQuotaExceededError(message, status, errorCode, errorMessage, details);
          case 503:
            throw new SystemOverloadError(
              message,
              status,
              errorCode,
              errorMessage,
              details,
              data?.retry_after_seconds
            );
          default:
            if (status >= 500) {
              throw new ServerError(message, status, errorCode, errorMessage, details);
            }
            throw new VidNavigatorError(message, status, errorCode, errorMessage, details);
        }
      }
      throw new VidNavigatorError(error.message);
    }
  }

  async deleteFile(file_id: string): Promise<{ file_id: string; file_name: string; message: string }> {
    const response = await this.request<
      ApiSuccessResponse<{ file_id: string; file_name: string; message: string }>
    >('DELETE', `/file/${file_id}/delete`);
    return response.data;
  }

  async getFileUrl(file_id: string): Promise<{ file_id: string; file_url: string }> {
    const response = await this.request<
      ApiSuccessResponse<{ file_id: string; file_url: string }>
    >('GET', `/file/${file_id}/url`);
    return response.data;
  }

  async retryFileProcessing(
    file_id: string
  ): Promise<{ file_id: string; file_name: string; file_status: string; message: string }> {
    const response = await this.request<
      ApiSuccessResponse<{
        file_id: string;
        file_name: string;
        file_status: string;
        message: string;
      }>
    >('POST', `/file/${file_id}/retry`);
    return response.data;
  }

  async cancelFileUpload(
    file_id: string
  ): Promise<{ file_id: string; file_name: string; message: string }> {
    const response = await this.request<
      ApiSuccessResponse<{ file_id: string; file_name: string; message: string }>
    >('POST', `/file/${file_id}/cancel`);
    return response.data;
  }
  //endregion

  //region --- Namespaces ---
  async getNamespaces(): Promise<Namespace[]> {
    const response = await this.request<ApiSuccessResponse<NamespaceJSON[]>>('GET', '/namespaces');
    return response.data.map((n) => Namespace.fromJSON(n));
  }

  async createNamespace(payload: { name: string }): Promise<Namespace> {
    const response = await this.request<ApiSuccessResponse<NamespaceJSON>>('POST', '/namespaces', payload);
    return Namespace.fromJSON(response.data);
  }

  async updateNamespace(namespace_id: string, payload: { name: string }): Promise<{ message: string }> {
    const body = await this.request<{ status: string; message: string }>(
      'PUT',
      `/namespaces/${namespace_id}`,
      payload
    );
    return { message: body.message };
  }

  async deleteNamespace(namespace_id: string): Promise<{ message: string }> {
    const body = await this.request<{ status: string; message: string }>(
      'DELETE',
      `/namespaces/${namespace_id}`
    );
    return { message: body.message };
  }

  async updateFileNamespaces(
    file_id: string,
    payload: { namespace_ids: string[] }
  ): Promise<{ message: string; namespace_ids: string[]; namespaces: NamespaceRef[] }> {
    const body = await this.request<{
      status: string;
      message: string;
      data: { namespace_ids: string[]; namespaces: NamespaceRefJSON[] };
    }>('PUT', `/file/${file_id}/namespaces`, payload);
    return {
      message: body.message,
      namespace_ids: body.data.namespace_ids,
      namespaces: body.data.namespaces.map(NamespaceRef.fromJSON),
    };
  }
  //endregion

  //region --- Analysis ---
  async analyzeVideo(payload: {
    video_url: string;
    query?: string;
    transcript_text?: boolean;
  }): Promise<{
    video_info: VideoInfo;
    transcript: TranscriptOutput;
    transcript_analysis: AnalysisResult;
  }> {
    const response = await this.request<
      ApiSuccessResponse<{
        video_info: VideoInfoJSON;
        transcript: TranscriptSegmentJSON[] | string;
        transcript_analysis: AnalysisResultJSON;
      }>
    >('POST', '/analyze/video', payload);

    return {
      video_info: VideoInfo.fromJSON(response.data.video_info),
      transcript: transcriptFromJSON(response.data.transcript)!,
      transcript_analysis: AnalysisResult.fromJSON(response.data.transcript_analysis),
    };
  }

  async analyzeFile(payload: {
    file_id: string;
    query?: string;
    transcript_text?: boolean;
  }): Promise<{
    file_info: FileInfo;
    transcript: TranscriptOutput;
    transcript_analysis: AnalysisResult;
  }> {
    const response = await this.request<
      ApiSuccessResponse<{
        file_info: FileInfoJSON;
        transcript: TranscriptSegmentJSON[] | string;
        transcript_analysis: AnalysisResultJSON;
      }>
    >('POST', '/analyze/file', payload);

    return {
      file_info: FileInfo.fromJSON(response.data.file_info),
      transcript: transcriptFromJSON(response.data.transcript)!,
      transcript_analysis: AnalysisResult.fromJSON(response.data.transcript_analysis),
    };
  }
  //endregion

  //region --- Extraction ---
  async extractVideoData(payload: {
    video_url: string;
    schema: ExtractionSchema;
    what_to_extract?: string;
    include_usage?: boolean;
  }): Promise<ExtractDataResult> {
    const body = await this.request<{
      status: 'success';
      data: Record<string, unknown>;
      usage?: ExtractionTokenUsageJSON;
    }>('POST', '/extract/video', payload);
    return {
      data: body.data,
      usage: body.usage ? ExtractionTokenUsage.fromJSON(body.usage) : undefined,
    };
  }

  async extractFileData(payload: {
    file_id: string;
    schema: ExtractionSchema;
    what_to_extract?: string;
    include_usage?: boolean;
  }): Promise<ExtractDataResult> {
    const body = await this.request<{
      status: 'success';
      data: Record<string, unknown>;
      usage?: ExtractionTokenUsageJSON;
    }>('POST', '/extract/file', payload);
    return {
      data: body.data,
      usage: body.usage ? ExtractionTokenUsage.fromJSON(body.usage) : undefined,
    };
  }
  //endregion

  //region --- Search ---
  async searchVideos(payload: {
    query: string;
    use_enhanced_search?: boolean;
    start_year?: number;
    end_year?: number;
    focus?: 'relevance' | 'popularity' | 'brevity';
    duration?: number;
  }): Promise<{
    results: VideoSearchResult[];
    query: string;
    total_found: number;
    explanation?: string;
  }> {
    const response = await this.request<
      ApiSuccessResponse<{
        results: VideoSearchResultJSON[];
        query: string;
        total_found: number;
        explanation?: string;
      }>
    >('POST', '/search/video', payload);

    return {
      results: response.data.results.map(VideoSearchResult.fromJSON),
      query: response.data.query,
      total_found: response.data.total_found,
      explanation: response.data.explanation,
    };
  }

  async searchFiles(payload: {
    query: string;
    namespace_ids?: string[];
  }): Promise<{
    results: FileSearchResult[];
    query: string;
    total_found: number;
    explanation?: string;
  }> {
    const response = await this.request<
      ApiSuccessResponse<{
        results: FileSearchResultJSON[];
        query: string;
        total_found: number;
        explanation?: string;
      }>
    >('POST', '/search/file', payload);

    return {
      results: response.data.results.map(FileSearchResult.fromJSON),
      query: response.data.query,
      total_found: response.data.total_found,
      explanation: response.data.explanation,
    };
  }
  //endregion

  //region --- System ---
  async getUsage(): Promise<UsageData> {
    const response = await this.request<ApiSuccessResponse<UsageDataJSON>>('GET', '/usage');
    return UsageData.fromJSON(response.data);
  }

  async healthCheck(): Promise<{
    status?: string;
    message?: string;
    version?: string;
    endpoints?: Array<{
      path?: string;
      method?: string;
      description?: string;
      auth_required?: boolean;
    }>;
  }> {
    const response = await this.client.get('/health');
    return response.data;
  }
  //endregion
}

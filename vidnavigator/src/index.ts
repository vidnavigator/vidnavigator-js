import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import {
  VideoInfo,
  VideoInfoJSON,
  TranscriptSegment,
  TranscriptSegmentJSON,
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
} from './errors';

export * from './models';
export * from './errors';

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
//endregion

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
        'User-Agent': `vidnavigator-js/0.1.0`,
      },
      ...config.axiosConfig,
    });
  }

  private async request<T>(method: 'GET' | 'POST' | 'DELETE' | 'PUT', url: string, data?: any, params?: any, extraHeaders?: any): Promise<T> {
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
        const errorCode = data?.error?.code;
        const errorMessage = data?.error?.message;
        const errorDetails = data?.error?.details;
        const message = `API request failed with status ${status}: ${errorMessage || error.message}`;

        switch (status) {
          case 400:
            throw new BadRequestError(message, status, errorCode, errorMessage, errorDetails);
          case 401:
            throw new AuthenticationError(message, status, errorCode, errorMessage, errorDetails);
          case 403:
            throw new AccessDeniedError(message, status, errorCode, errorMessage, errorDetails);
          case 404:
            throw new NotFoundError(message, status, errorCode, errorMessage, errorDetails);
          case 429:
            throw new RateLimitExceededError(message, status, errorCode, errorMessage, errorDetails);
          case 402:
            throw new PaymentRequiredError(message, status, errorCode, errorMessage, errorDetails);
          default:
            if (status >= 500) {
              throw new ServerError(message, status, errorCode, errorMessage, errorDetails);
            }
            throw new VidNavigatorError(message, status, errorCode, errorMessage, errorDetails);
        }
      }
      // Re-throw other errors (e.g., network errors)
      throw new VidNavigatorError(error.message);
    }
  }

  //region --- Transcripts ---
  async getTranscript(payload: { video_url: string; language?: string }): Promise<{
    video_info: VideoInfo;
    transcript: TranscriptSegment[];
  }> {
    const response = await this.request<ApiSuccessResponse<{
      video_info: VideoInfoJSON;
      transcript: TranscriptSegmentJSON[];
    }>>('POST', '/transcript', payload);

    return {
      video_info: VideoInfo.fromJSON(response.data.video_info),
      transcript: response.data.transcript.map(TranscriptSegment.fromJSON),
    };
  }
  //endregion

  //region --- Files ---
  async getFiles(query?: { limit?: number; offset?: number; status?: 'processing'|'completed'|'failed'|'cancelled' }): Promise<{
    files: FileInfo[];
    total_count: number;
    has_more: boolean;
  }> {
    const response = await this.request<ApiSuccessResponse<{
      files: FileInfoJSON[];
      total_count: number;
      has_more: boolean;
    }>>('GET', '/files', undefined, query);

    return {
      files: response.data.files.map(FileInfo.fromJSON),
      total_count: response.data.total_count,
      has_more: response.data.has_more,
    };
  }

  async getFile(file_id: string): Promise<{ file_info: FileInfo; transcript?: TranscriptSegment[] }> {
    const response = await this.request<ApiSuccessResponse<{
        file_info: FileInfoJSON;
        transcript?: TranscriptSegmentJSON[];
    }>>('GET', `/file/${file_id}`);

    return {
        file_info: FileInfo.fromJSON(response.data.file_info),
        transcript: response.data.transcript?.map(TranscriptSegment.fromJSON),
    };
  }

  async uploadFile(options: { filePath: string; wait_for_completion?: boolean }): Promise<{
    file_id: string;
    file_info: FileInfo;
    transcript?: TranscriptSegment[];
  }> {
    const form = new FormData();
    form.append('file', fs.createReadStream(options.filePath));
    if (options.wait_for_completion) {
      form.append('wait_for_completion', 'true');
    }

    const response = await this.request<ApiSuccessResponse<{
      file_id: string;
      file_info: FileInfoJSON;
      transcript?: TranscriptSegmentJSON[];
    }>>('POST', '/upload/file', form, undefined, form.getHeaders());

    return {
      file_id: response.data.file_id,
      file_info: FileInfo.fromJSON(response.data.file_info),
      transcript: response.data.transcript?.map(TranscriptSegment.fromJSON),
    };
  }
  
  async deleteFile(file_id: string): Promise<{ file_id: string; message: string }> {
      const response = await this.request<ApiSuccessResponse<{ file_id: string; message: string }>>(
          'DELETE',
          `/file/${file_id}/delete`
      );
      return response.data;
  }

  async getFileUrl(file_id: string): Promise<{ file_id: string; file_url: string }> {
    const response = await this.request<ApiSuccessResponse<{ file_id: string; file_url: string }>>(
        'GET',
        `/file/${file_id}/url`
    );
    return response.data;
  }

  async retryFileProcessing(file_id: string): Promise<{ file_id: string; file_name: string; file_status: string; message: string }> {
      const response = await this.request<ApiSuccessResponse<{ file_id: string; file_name: string; file_status: string; message: string }>>(
          'POST',
          `/file/${file_id}/retry`
      );
      return response.data;
  }

  async cancelFileUpload(file_id: string): Promise<{ file_id: string; file_name: string; message: string }> {
      const response = await this.request<ApiSuccessResponse<{ file_id: string; file_name: string; message: string }>>(
          'POST',
          `/file/${file_id}/cancel`
      );
      return response.data;
  }
  //endregion

  //region --- Analysis ---
  async analyzeVideo(payload: { video_url: string; query?: string }): Promise<{
    video_info: VideoInfo;
    transcript: TranscriptSegment[];
    transcript_analysis: AnalysisResult;
  }> {
    const response = await this.request<ApiSuccessResponse<{
      video_info: VideoInfoJSON;
      transcript: TranscriptSegmentJSON[];
      transcript_analysis: AnalysisResultJSON;
    }>>('POST', '/analyze/video', payload);

    return {
      video_info: VideoInfo.fromJSON(response.data.video_info),
      transcript: response.data.transcript.map(TranscriptSegment.fromJSON),
      transcript_analysis: AnalysisResult.fromJSON(response.data.transcript_analysis),
    };
  }

  async analyzeFile(payload: { file_id: string; query?: string }): Promise<{
    file_info: FileInfo;
    transcript: TranscriptSegment[];
    transcript_analysis: AnalysisResult;
  }> {
    const response = await this.request<ApiSuccessResponse<{
      file_info: FileInfoJSON;
      transcript: TranscriptSegmentJSON[];
      transcript_analysis: AnalysisResultJSON;
    }>>('POST', '/analyze/file', payload);

    return {
      file_info: FileInfo.fromJSON(response.data.file_info),
      transcript: response.data.transcript.map(TranscriptSegment.fromJSON),
      transcript_analysis: AnalysisResult.fromJSON(response.data.transcript_analysis),
    };
  }
  //endregion

  //region --- Search ---
  async searchVideos(payload: {
    query: string;
    use_enhanced_search?: boolean;
    start_year?: number;
    end_year?: number;
    focus?: 'relevance'|'popularity'|'brevity';
    duration?: number;
  }): Promise<{ results: VideoSearchResult[]; total_found: number; explanation?: string }> {
    const response = await this.request<ApiSuccessResponse<{
      results: VideoSearchResultJSON[];
      total_found: number;
      explanation?: string;
    }>>('POST', '/search/video', payload);
    
    return {
      results: response.data.results.map(VideoSearchResult.fromJSON),
      total_found: response.data.total_found,
      explanation: response.data.explanation
    };
  }

  async searchFiles(payload: { query: string }): Promise<{ results: FileSearchResult[]; total_found: number; explanation?: string }> {
    const response = await this.request<ApiSuccessResponse<{
      results: FileSearchResultJSON[];
      total_found: number;
      explanation?: string;
    }>>('POST', '/search/file', payload);

    return {
      results: response.data.results.map(FileSearchResult.fromJSON),
      total_found: response.data.total_found,
      explanation: response.data.explanation
    };
  }
  //endregion

  //region --- System ---
  async getUsage(): Promise<UsageData> {
    const response = await this.request<ApiSuccessResponse<UsageDataJSON>>('GET', '/usage');
    return UsageData.fromJSON(response.data);
  }

  async healthCheck(): Promise<any> {
    const response = await this.client.get('/health');
    return response.data;
  }
  //endregion
} 
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
} from './models';

export * from './models';

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
    const response = await this.client.request<T>({
      method,
      url,
      data,
      params,
      headers: extraHeaders,
    });
    return response.data;
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
  async getUsage(): Promise<any> {
    const response = await this.request<ApiSuccessResponse<any>>('GET', '/usage');
    return response.data;
  }

  async healthCheck(): Promise<any> {
    const response = await this.client.get('/health');
    return response.data;
  }
  //endregion
} 
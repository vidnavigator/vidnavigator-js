export type FileStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface FileInfoJSON {
  id: string;
  name: string;
  size?: number;
  type?: string;
  duration?: number;
  status: FileStatus;
  created_at: string;
  updated_at: string;
  original_file_date?: string;
  has_transcript?: boolean;
  error_message?: string;
}

/**
 * Represents the complete metadata for a file uploaded to VidNavigator.
 */
export class FileInfo {
  id: string;
  name: string;
  size?: number;
  type?: string;
  duration?: number;
  status: FileStatus;
  created_at: string;
  updated_at: string;
  original_file_date?: string;
  has_transcript?: boolean;
  error_message?: string;

  constructor(data: FileInfoJSON) {
    this.id = data.id;
    this.name = data.name;
    this.size = data.size;
    this.type = data.type;
    this.duration = data.duration;
    this.status = data.status;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.original_file_date = data.original_file_date;
    this.has_transcript = data.has_transcript;
    this.error_message = data.error_message;
  }

  static fromJSON(json: FileInfoJSON): FileInfo {
    return new FileInfo(json);
  }

  toJSON(): FileInfoJSON {
    return { ...this };
  }
}

export interface UploadedFileInfoJSON {
    title?: string;
    file_id: string;
    filename: string;
    file_size?: number;
    file_type?: string;
    duration?: number;
    created_at: string;
    original_file_date?: string;
  }
  
  /**
   * Represents the specific metadata for a newly uploaded file before it is fully processed.
   */
  export class UploadedFileInfo {
    title?: string;
    file_id: string;
    filename: string;
    file_size?: number;
    file_type?: string;
    duration?: number;
    created_at: string;
    original_file_date?: string;
  
    constructor(data: UploadedFileInfoJSON) {
      this.title = data.title;
      this.file_id = data.file_id;
      this.filename = data.filename;
      this.file_size = data.file_size;
      this.file_type = data.file_type;
      this.duration = data.duration;
      this.created_at = data.created_at;
      this.original_file_date = data.original_file_date;
    }
  
    static fromJSON(json: UploadedFileInfoJSON): UploadedFileInfo {
      return new UploadedFileInfo(json);
    }
  
    toJSON(): UploadedFileInfoJSON {
      return { ...this };
    }
  } 
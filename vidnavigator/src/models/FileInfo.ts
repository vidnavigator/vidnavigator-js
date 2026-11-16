import { NamespaceRef, NamespaceRefJSON } from './Namespace';
import { ScenesError } from './Watch';

export type FileStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * Where the scene analysis of a file stands. `none`: never asked for. `completed`: the scenes are
 * returned by `getFile()`. `failed`: see `scenes_error`.
 */
export type FileScenesStatus = 'none' | 'processing' | 'completed' | 'failed';

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
  scenes_status?: FileScenesStatus;
  frames_analyzed?: number;
  scenes_error?: ScenesError;
  namespace_ids?: string[];
  namespaces?: NamespaceRefJSON[];
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
  /** Where the scene analysis of the file stands. */
  scenes_status?: FileScenesStatus;
  /** Number of frames that were analyzed to produce the scenes. Present when `scenes_status` is `completed`. */
  frames_analyzed?: number;
  /** Present when `scenes_status` is `failed`. `frames_not_available` means the file has no picture (an audio file). */
  scenes_error?: ScenesError;
  namespace_ids?: string[];
  namespaces?: NamespaceRef[];

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
    this.scenes_status = data.scenes_status;
    this.frames_analyzed = data.frames_analyzed;
    this.scenes_error = data.scenes_error;
    this.namespace_ids = data.namespace_ids;
    this.namespaces = data.namespaces?.map(NamespaceRef.fromJSON);
  }

  static fromJSON(json: FileInfoJSON): FileInfo {
    return new FileInfo(json);
  }

  toJSON(): FileInfoJSON {
    return { ...this };
  }
} 
/**
 * MeshCentral File Manager Error Handler
 */

export type FileErrorType =
  | 'autherror'
  | 'sessionerror'
  | 'sessiontimeout'
  | 'connectionerror'
  | 'permissiondenied'
  | 'filenotfound'
  | 'diskfull'
  | 'quotaexceeded'
  | 'unziperror'
  | 'uploadfailed'
  | 'downloadfailed'
  | 'invalidpath'
  | 'invalidname'
  | 'operationfailed'
  | 'unknown';

export interface FileError {
  type: FileErrorType;
  message: string;
  details?: string;
  timestamp: number;
  retryable: boolean;
}

export class FileErrorHandler {
  private errorHandlers = new Map<FileErrorType, (error: FileError) => void>();
  private errorHistory: FileError[] = [];
  private maxHistorySize = 100;
  private onError?: (error: FileError) => void;

  constructor(onError?: (error: FileError) => void) {
    this.onError = onError;
    this.setupDefaultHandlers();
  }

  private setupDefaultHandlers(): void {
    this.registerHandler('autherror', error => {
      console.error('Authentication failed:', error.message);
    });

    this.registerHandler('sessionerror', error => {
      console.error('Session error:', error.message);
    });

    this.registerHandler('sessiontimeout', error => {
      console.error('Session timeout:', error.message);
    });

    this.registerHandler('connectionerror', error => {
      console.error('Connection error:', error.message);
    });

    this.registerHandler('permissiondenied', error => {
      console.error('Permission denied:', error.message);
    });

    this.registerHandler('filenotfound', error => {
      console.error('File not found:', error.message);
    });

    this.registerHandler('diskfull', error => {
      console.error('Disk full:', error.message);
    });

    this.registerHandler('quotaexceeded', error => {
      console.error('Quota exceeded:', error.message);
    });
  }

  registerHandler(errorType: FileErrorType, handler: (error: FileError) => void): void {
    this.errorHandlers.set(errorType, handler);
  }

  handleError(error: FileError): void {
    this.errorHistory.push(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    const handler = this.errorHandlers.get(error.type);
    if (handler) {
      handler(error);
    }

    this.onError?.(error);
  }

  parseError(message: any): FileError | null {
    if (!message || !message.error) return null;

    const errorType = this.mapErrorType(message.error);
    const errorMessage = this.getErrorMessage(errorType, message.error);

    return {
      type: errorType,
      message: errorMessage,
      details: message.details || message.error,
      timestamp: Date.now(),
      retryable: this.isRetryable(errorType),
    };
  }

  private mapErrorType(error: string): FileErrorType {
    const errorMap: Record<string, FileErrorType> = {
      autherror: 'autherror',
      'authentication failed': 'autherror',
      unauthorized: 'autherror',
      sessionerror: 'sessionerror',
      'session expired': 'sessionerror',
      sessiontimeout: 'sessiontimeout',
      timeout: 'sessiontimeout',
      connectionerror: 'connectionerror',
      'connection lost': 'connectionerror',
      disconnected: 'connectionerror',
      'permission denied': 'permissiondenied',
      'access denied': 'permissiondenied',
      'file not found': 'filenotfound',
      'not found': 'filenotfound',
      'disk full': 'diskfull',
      'no space': 'diskfull',
      'quota exceeded': 'quotaexceeded',
      'over quota': 'quotaexceeded',
      'unzip error': 'unziperror',
      'extract failed': 'unziperror',
      'upload failed': 'uploadfailed',
      'download failed': 'downloadfailed',
      'invalid path': 'invalidpath',
      'invalid name': 'invalidname',
      'operation failed': 'operationfailed',
    };

    const lowerError = error.toLowerCase();
    for (const [key, value] of Object.entries(errorMap)) {
      if (lowerError.includes(key)) {
        return value;
      }
    }

    return 'unknown';
  }

  getErrorMessage(errorType: FileErrorType, originalError?: string): string {
    const messages: Record<FileErrorType, string> = {
      autherror: 'Authentication failed. Please reconnect.',
      sessionerror: 'Session expired. Please login again.',
      sessiontimeout: 'Session timed out.',
      connectionerror: 'Connection lost. Attempting to reconnect...',
      permissiondenied: 'Permission denied for this operation.',
      filenotfound: 'File or folder not found.',
      diskfull: 'Insufficient disk space.',
      quotaexceeded: 'Storage quota exceeded.',
      unziperror: 'Failed to extract archive.',
      uploadfailed: 'Upload failed. Please try again.',
      downloadfailed: 'Download failed. Please try again.',
      invalidpath: 'Invalid file path.',
      invalidname: 'Invalid file or folder name.',
      operationfailed: 'Operation failed. Please try again.',
      unknown: originalError || 'An unexpected error occurred.',
    };

    return messages[errorType];
  }

  isRetryable(errorType: FileErrorType): boolean {
    const retryableErrors: FileErrorType[] = [
      'connectionerror',
      'sessiontimeout',
      'uploadfailed',
      'downloadfailed',
      'operationfailed',
    ];

    return retryableErrors.includes(errorType);
  }

  createError(errorString: string, details?: string): FileError {
    const errorType = this.mapErrorType(errorString);
    return {
      type: errorType,
      message: this.getErrorMessage(errorType, errorString),
      details: details || errorString,
      timestamp: Date.now(),
      retryable: this.isRetryable(errorType),
    };
  }

  getErrorHistory(): FileError[] {
    return [...this.errorHistory];
  }

  clearHistory(): void {
    this.errorHistory = [];
  }

  getLastError(): FileError | undefined {
    return this.errorHistory[this.errorHistory.length - 1];
  }

  getErrorCounts(): Map<FileErrorType, number> {
    const counts = new Map<FileErrorType, number>();

    for (const error of this.errorHistory) {
      const count = counts.get(error.type) || 0;
      counts.set(error.type, count + 1);
    }

    return counts;
  }
}

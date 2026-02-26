import type {
  AudioFormat,
  LoudnessSettings,
  OutputMode,
  OverwriteMode,
} from '../settings/settings.types';

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type BatchStatus = 'completed' | 'failed' | 'partial';

export interface ProcessTask {
  id: string;
  file: string;
  status: TaskStatus;
  error?: string;
  progress?: string;
}

export interface ProcessTaskResult {
  file: string;
  status: TaskStatus;
  error?: string;
}

export interface ProcessorSettingsSnapshot {
  outputMode: OutputMode;
  customOutputPath: string | null;
  filenamePrefix: string;
  filenameSuffix: string;
  overwriteMode: OverwriteMode;
  format: AudioFormat;
  loudness: LoudnessSettings;
  maxConcurrentJobs: number;
}

export interface JobUpdatePayload {
  status: BatchStatus;
  results: ProcessTaskResult[];
}

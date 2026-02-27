import type { LanguageCode } from '../../i18n/languages';

export type OutputMode = 'same-folder' | 'custom-folder';
export type OverwriteMode = 'overwrite' | 'skip' | 'rename';
export type AudioFormat = 'wav' | 'mp3' | 'aac' | 'ogg';
export type Theme = 'light' | 'dark' | 'system';

export interface LoudnessSettings {
  enabled: boolean;
  integrated: number; // Target Integrated Loudness (LUFS) e.g. -16
  truePeak: number;   // True Peak (dBTP) e.g. -1.5
  lra: number;        // Loudness Range (LU) e.g. 11
}

export interface SettingsState {
  // Output Settings
  outputMode: OutputMode;
  customOutputPath: string | null;
  filenamePrefix: string;
  filenameSuffix: string;
  overwriteMode: OverwriteMode;
  renameOnly: boolean;

  // Audio Processing Settings
  format: AudioFormat;
  loudness: LoudnessSettings;

  // Application Settings
  theme: Theme;
  language: LanguageCode;
  notifyOnComplete: boolean;
  maxConcurrentJobs: number;

  // Actions
  setOutputMode: (mode: OutputMode) => void;
  setCustomOutputPath: (path: string | null) => void;
  setFilenamePrefix: (prefix: string) => void;
  setFilenameSuffix: (suffix: string) => void;
  setOverwriteMode: (mode: OverwriteMode) => void;
  setRenameOnly: (enabled: boolean) => void;
  
  setFormat: (format: AudioFormat) => void;
  setLoudnessSettings: (settings: Partial<LoudnessSettings>) => void;
  
  setTheme: (theme: Theme) => void;
  setLanguage: (language: LanguageCode) => void;
  setNotifyOnComplete: (notify: boolean) => void;
  setMaxConcurrentJobs: (count: number) => void;
  
  resetToDefaults: () => void;
}

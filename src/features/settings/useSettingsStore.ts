import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SettingsState, LoudnessSettings } from './settings.types';
import { DEFAULT_LANGUAGE } from '../../i18n/languages';

const DEFAULT_LOUDNESS: LoudnessSettings = {
  enabled: true,
  integrated: -16,
  truePeak: -1.5,
  lra: 11,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Defaults
      outputMode: 'same-folder',
      customOutputPath: null,
      filenamePrefix: '',
      filenameSuffix: '_processed',
      overwriteMode: 'rename',
      renameOnly: false,

      format: 'wav',
      loudness: DEFAULT_LOUDNESS,

      theme: 'system',
      language: DEFAULT_LANGUAGE,
      notifyOnComplete: true,
      maxConcurrentJobs: 2,

      // Actions
      setOutputMode: (mode) => set({ outputMode: mode }),
      setCustomOutputPath: (path) => set({ customOutputPath: path }),
      setFilenamePrefix: (prefix) => set({ filenamePrefix: prefix }),
      setFilenameSuffix: (suffix) => set({ filenameSuffix: suffix }),
      setOverwriteMode: (mode) => set({ overwriteMode: mode }),
      setRenameOnly: (enabled) => set({ renameOnly: enabled }),

      setFormat: (format) => set({ format }),
      setLoudnessSettings: (settings) =>
        set((state) => ({
          loudness: { ...state.loudness, ...settings },
        })),

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setNotifyOnComplete: (notify) => set({ notifyOnComplete: notify }),
      setMaxConcurrentJobs: (count) => set({ maxConcurrentJobs: count }),

      resetToDefaults: () =>
        set({
          outputMode: 'same-folder',
          customOutputPath: null,
          filenamePrefix: '',
          filenameSuffix: '_processed',
          overwriteMode: 'rename',
          renameOnly: false,
          format: 'wav',
          loudness: DEFAULT_LOUDNESS,
          theme: 'system',
          language: DEFAULT_LANGUAGE,
          notifyOnComplete: true,
          maxConcurrentJobs: 2,
        }),
    }),
    {
      name: 'audio-desk-settings',
    }
  )
);

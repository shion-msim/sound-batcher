import { create } from 'zustand';
import { FFmpegCommandBuilder, runFFmpeg } from '../../lib/ffmpeg';
import { basename, dirname, extname, join } from '@tauri-apps/api/path';
import { copyFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { useFileBrowserStore } from '../file-browser/useFileBrowserStore';
import { useHistoryStore } from '../history/useHistoryStore';
import { useSettingsStore } from '../settings/useSettingsStore';
import { executeTask, runWithConcurrency } from './processor.core';
import type { ProcessTask, ProcessorSettingsSnapshot } from './processor.types';
import {
  calculateBatchStatus,
  createId,
  createPendingTasks,
  updateTaskInQueue,
} from './processor.utils';

interface ProcessorState {
  queue: ProcessTask[];
  isProcessing: boolean;
  addToQueue: (files: string[]) => void;
  removeFromQueue: (id: string) => void;
  startProcessing: () => Promise<void>;
  clearQueue: () => void;
}

export const useProcessorStore = create<ProcessorState>((set, get) => ({
  queue: [],
  isProcessing: false,
  addToQueue: (files) =>
    set((state) => ({
      queue: [...state.queue, ...createPendingTasks(files)],
    })),
  removeFromQueue: (id) =>
    set((state) => ({ queue: state.queue.filter((task) => task.id !== id) })),
  clearQueue: () => set({ queue: [] }),
  startProcessing: async () => {
    if (get().isProcessing) return;
    set({ isProcessing: true });

    const settings = snapshotProcessorSettings(useSettingsStore.getState());
    const history = useHistoryStore.getState();

    const jobId = createId();
    const initialQueue = get().queue;
    const inputFiles = initialQueue.map((task) => task.file);

    await history.addJob({
      id: jobId,
      timestamp: Date.now(),
      inputFiles,
      status: 'processing',
      results: [],
    });

    const pendingTasks = get().queue.filter((task) => task.status === 'pending');

    await runWithConcurrency(pendingTasks, settings.maxConcurrentJobs, async (task) => {
      set((state) => ({
        queue: updateTaskInQueue(state.queue, task.id, { status: 'processing' }),
      }));

      const result = await executeTask(task, settings, processorDependencies, (line) => {
        set((state) => ({
          queue: updateTaskInQueue(state.queue, task.id, { progress: line }),
        }));
      });

      set((state) => ({
        queue: updateTaskInQueue(state.queue, task.id, {
          status: result.status,
          error: result.error,
          progress: result.progress,
          outputPath: result.outputPath,
        }),
      }));
    });

    const finalQueue = get().queue;
    const finalStatus = calculateBatchStatus(finalQueue.map((task) => task.status));
    const results = finalQueue.map((task) => ({
      file: task.file,
      status: task.status,
      error: task.error,
      outputPath: task.outputPath,
    }));

    await history.updateJob(jobId, { status: finalStatus, results });

    const fileBrowser = useFileBrowserStore.getState();
    if (fileBrowser.currentPath) {
      await fileBrowser.loadFiles(fileBrowser.currentPath, {
        preserveSelection: true,
        silent: true,
      });
    }

    set({ isProcessing: false });
  },
}));

const processorDependencies = {
  dirname,
  join,
  basename,
  extname,
  exists,
  copyFile,
  mkdir: async (path: string) => {
    try {
      await mkdir(path, { recursive: true });
    } catch {
      // ignore mkdir race/errors for existing directory
    }
  },
  createCommandBuilder: () => new FFmpegCommandBuilder(),
  runFFmpeg,
};

function snapshotProcessorSettings(
  settings: ReturnType<typeof useSettingsStore.getState>
): ProcessorSettingsSnapshot {
  return {
    outputMode: settings.outputMode,
    customOutputPath: settings.customOutputPath,
    filenamePrefix: settings.filenamePrefix,
    filenameSuffix: settings.filenameSuffix,
    overwriteMode: settings.overwriteMode,
    renameOnly: settings.renameOnly,
    format: settings.format,
    loudness: settings.loudness,
    maxConcurrentJobs: settings.maxConcurrentJobs,
  };
}

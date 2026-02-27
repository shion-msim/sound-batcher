import { create } from 'zustand';
import { readDir } from '@tauri-apps/plugin-fs';
import { homeDir, join } from '@tauri-apps/api/path';
import { FileEntry } from './file-browser.types';
import { isVisibleInFileBrowser } from './file-browser.utils';
import { settingsStore } from '../../lib/store';

const areFileEntriesEqual = (a: FileEntry[], b: FileEntry[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (
      a[i].path !== b[i].path ||
      a[i].name !== b[i].name ||
      a[i].isDirectory !== b[i].isDirectory
    ) {
      return false;
    }
  }
  return true;
};

interface FileBrowserState {
  currentPath: string;
  files: FileEntry[];
  isLoading: boolean;
  error: string | null;
  history: string[];
  futureHistory: string[];
  expandedPaths: string[];
  pinnedPaths: string[];
  selectedFiles: string[];
  setCurrentPath: (path: string) => void;
  loadFiles: (
    path: string,
    options?: {
      preserveSelection?: boolean;
      silent?: boolean;
    }
  ) => Promise<void>;
  navigateTo: (path: string) => Promise<void>;
  goBack: () => Promise<void>;
  goForward: () => Promise<void>;
  goUp: () => Promise<void>;
  init: () => Promise<void>;
  togglePin: (path: string) => Promise<void>;
  toggleDirectoryExpanded: (path: string) => Promise<void>;
  toggleSelection: (path: string) => void;
  setSelection: (paths: string[]) => void;
  clearSelection: () => void;
}

export const useFileBrowserStore = create<FileBrowserState>((set, get) => ({
  currentPath: '',
  files: [],
  isLoading: false,
  error: null,
  history: [],
  futureHistory: [],
  expandedPaths: [],
  pinnedPaths: [],
  selectedFiles: [],
  setCurrentPath: (path) => set({ currentPath: path }),
  loadFiles: async (path, options) => {
    const preserveSelection = options?.preserveSelection ?? false;
    const silent = options?.silent ?? false;

    if (silent) {
      set({ error: null });
    } else {
      set((state) => ({
        isLoading: true,
        error: null,
        selectedFiles: preserveSelection ? state.selectedFiles : [],
      }));
    }

    try {
      const entries = await readDir(path);
      const files: FileEntry[] = await Promise.all(entries.map(async (entry) => ({
        name: entry.name,
        path: await join(path, entry.name),
        isDirectory: entry.isDirectory,
      })));
      const visibleFiles = files.filter((entry) =>
        isVisibleInFileBrowser(entry.name, entry.isDirectory),
      );
      
      visibleFiles.sort((a, b) => {
        if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
        return a.isDirectory ? -1 : 1;
      });
      
      set((state) => {
        const nextSelectedFiles = preserveSelection ? state.selectedFiles : [];
        const isFileListChanged = !areFileEntriesEqual(state.files, visibleFiles);
        const isPathChanged = state.currentPath !== path;
        const isSelectionChanged = state.selectedFiles !== nextSelectedFiles;

        if (!isFileListChanged && !isPathChanged && !isSelectionChanged) {
          return state;
        }

        return {
          files: isFileListChanged ? visibleFiles : state.files,
          currentPath: isPathChanged ? path : state.currentPath,
          selectedFiles: nextSelectedFiles,
        };
      });
    } catch (error) {
      console.error('Failed to read dir', error);
      set({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      if (!silent) {
        set({ isLoading: false });
      }
    }
  },
  navigateTo: async (path) => {
    const { currentPath } = get();
    if (currentPath && currentPath !== path) {
      set((state) => ({
        history: [...state.history, currentPath],
        futureHistory: [],
      }));
    }
    await get().loadFiles(path);
  },
  goBack: async () => {
    const { history, currentPath } = get();
    if (history.length === 0) return;

    const previousPath = history[history.length - 1];
    set((state) => ({
      history: state.history.slice(0, -1),
      futureHistory: currentPath ? [...state.futureHistory, currentPath] : state.futureHistory,
    }));
    await get().loadFiles(previousPath);
  },
  goForward: async () => {
    const { futureHistory, currentPath } = get();
    if (futureHistory.length === 0) return;

    const nextPath = futureHistory[futureHistory.length - 1];
    set((state) => ({
      futureHistory: state.futureHistory.slice(0, -1),
      history: currentPath ? [...state.history, currentPath] : state.history,
    }));
    await get().loadFiles(nextPath);
  },
  goUp: async () => {
    const { currentPath } = get();
    if (!currentPath) return;
    try {
        const lastSep = Math.max(currentPath.lastIndexOf('/'), currentPath.lastIndexOf('\\'));
        if (lastSep > 0) {
            const parent = currentPath.substring(0, lastSep);
            await get().navigateTo(parent);
        } else if (lastSep === -1 && currentPath.length > 0) {
            // Maybe root
        }
    } catch (e) {
        console.error(e);
    }
  },
  init: async () => {
    try {
      const pinned = await settingsStore.get<string[]>('pinnedPaths');
      const expanded = await settingsStore.get<string[]>('expandedDirectoryPaths');
      if (pinned) {
        set({ pinnedPaths: pinned });
      }
      if (expanded) {
        set({ expandedPaths: expanded });
      }
      const tryLoad = async (path: string) => {
        await get().loadFiles(path);
        return get().currentPath === path;
      };

      // Prefer home directory, then fallback to common roots.
      try {
        const home = await homeDir();
        if (await tryLoad(home)) return;
      } catch (error) {
        console.warn('Failed to resolve homeDir', error);
      }

      const fallbackPaths = navigator.userAgent.includes('Windows')
        ? ['C:\\Users', 'C:\\']
        : ['/'];

      for (const path of fallbackPaths) {
        if (await tryLoad(path)) return;
      }

      set({
        error:
          get().error ??
          '初期フォルダの読み込みに失敗しました。再読み込みをお試しください。',
      });
    } catch (error) {
      console.error('Failed to init file browser', error);
      set({ error: error instanceof Error ? error.message : String(error) });
    }
  },
  togglePin: async (path) => {
    const { pinnedPaths } = get();
    const isPinned = pinnedPaths.includes(path);
    const newPinned = isPinned
      ? pinnedPaths.filter(p => p !== path)
      : [...pinnedPaths, path];
    
    set({ pinnedPaths: newPinned });
    await settingsStore.set('pinnedPaths', newPinned);
    await settingsStore.save();
  },
  toggleDirectoryExpanded: async (path) => {
    const { expandedPaths } = get();
    const isExpanded = expandedPaths.includes(path);
    const nextExpandedPaths = isExpanded
      ? expandedPaths.filter((p) => p !== path)
      : [...expandedPaths, path];

    set({ expandedPaths: nextExpandedPaths });
    await settingsStore.set('expandedDirectoryPaths', nextExpandedPaths);
    await settingsStore.save();
  },
  toggleSelection: (path) => {
    const { selectedFiles } = get();
    const isSelected = selectedFiles.includes(path);
    const newSelected = isSelected
      ? selectedFiles.filter(p => p !== path)
      : [...selectedFiles, path];
    set({ selectedFiles: newSelected });
  },
  setSelection: (paths) => set({ selectedFiles: paths }),
  clearSelection: () => set({ selectedFiles: [] }),
}));

import { create } from 'zustand';
import { readDir } from '@tauri-apps/plugin-fs';
import { homeDir, join } from '@tauri-apps/api/path';
import { FileEntry } from './file-browser.types';
import { settingsStore } from '../../lib/store';

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
  loadFiles: (path: string) => Promise<void>;
  navigateTo: (path: string) => Promise<void>;
  goBack: () => Promise<void>;
  goForward: () => Promise<void>;
  goUp: () => Promise<void>;
  init: () => Promise<void>;
  togglePin: (path: string) => Promise<void>;
  toggleDirectoryExpanded: (path: string) => Promise<void>;
  toggleSelection: (path: string) => void;
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
  loadFiles: async (path) => {
    set({ isLoading: true, error: null, selectedFiles: [] }); // Clear selection on navigate
    try {
      const entries = await readDir(path);
      const files: FileEntry[] = await Promise.all(entries.map(async (entry) => ({
        name: entry.name,
        path: await join(path, entry.name),
        isDirectory: entry.isDirectory,
      })));
      
      files.sort((a, b) => {
        if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
        return a.isDirectory ? -1 : 1;
      });
      
      set({ files, currentPath: path });
    } catch (error) {
      console.error('Failed to read dir', error);
      set({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      set({ isLoading: false });
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
  clearSelection: () => set({ selectedFiles: [] }),
}));

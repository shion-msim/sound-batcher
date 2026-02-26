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
  pinnedPaths: string[];
  selectedFiles: string[];
  setCurrentPath: (path: string) => void;
  loadFiles: (path: string) => Promise<void>;
  goUp: () => Promise<void>;
  init: () => Promise<void>;
  togglePin: (path: string) => Promise<void>;
  toggleSelection: (path: string) => void;
  clearSelection: () => void;
}

export const useFileBrowserStore = create<FileBrowserState>((set, get) => ({
  currentPath: '',
  files: [],
  isLoading: false,
  error: null,
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
  goUp: async () => {
    const { currentPath } = get();
    if (!currentPath) return;
    try {
        const lastSep = Math.max(currentPath.lastIndexOf('/'), currentPath.lastIndexOf('\\'));
        if (lastSep > 0) {
            const parent = currentPath.substring(0, lastSep);
            await get().loadFiles(parent);
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
      if (pinned) {
        set({ pinnedPaths: pinned });
      }

      const home = await homeDir();
      await get().loadFiles(home);
    } catch (error) {
       console.error('Failed to init file browser', error);
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

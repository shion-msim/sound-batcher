import { create } from 'zustand';
import { readDir } from '@tauri-apps/plugin-fs';
import { homeDir, join } from '@tauri-apps/api/path';
import { FileEntry } from './file-browser.types';
import { isVisibleInFileBrowser } from './file-browser.utils';
import { settingsStore } from '../../lib/store';

const areFileEntriesEqual = (a: FileEntry[] | undefined, b: FileEntry[] | undefined): boolean => {
  if (!a || !b) return a === b;
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
  tabs: FileBrowserTab[];
  activeTabId: string | null;
  currentPath: string;
  files: FileEntry[];
  columnPathChain: string[];
  directoryChildrenByPath: Record<string, FileEntry[]>;
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
  setColumnPathChain: (paths: string[]) => void;
  loadDirectoryEntries: (
    path: string,
    options?: {
      force?: boolean;
    }
  ) => Promise<FileEntry[]>;
  openTab: (path?: string) => Promise<void>;
  switchTab: (tabId: string) => Promise<void>;
  closeTab: (tabId: string) => Promise<void>;
  closeOtherTabs: (tabId: string) => Promise<void>;
  toggleTabPin: (tabId: string) => void;
  moveTab: (sourceTabId: string, targetTabId: string) => void;
}

interface FileBrowserTab {
  id: string;
  path: string;
  history: string[];
  futureHistory: string[];
  isPinned: boolean;
}

const createTabId = () => `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const sortVisibleEntries = (entries: FileEntry[]): FileEntry[] => {
  const visible = entries.filter((entry) => isVisibleInFileBrowser(entry.name, entry.isDirectory));
  visible.sort((a, b) => {
    if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
    return a.isDirectory ? -1 : 1;
  });
  return visible;
};

export const useFileBrowserStore = create<FileBrowserState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  currentPath: '',
  files: [],
  columnPathChain: [],
  directoryChildrenByPath: {},
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
      const visibleFiles = sortVisibleEntries(files);

      set((state) => {
        const nextSelectedFiles = preserveSelection ? state.selectedFiles : [];
        const isFileListChanged = !areFileEntriesEqual(state.files, visibleFiles);
        const isPathChanged = state.currentPath !== path;
        const isSelectionChanged = state.selectedFiles !== nextSelectedFiles;
        const isRootChildChanged = !areFileEntriesEqual(state.directoryChildrenByPath[path], visibleFiles);

        if (!isFileListChanged && !isPathChanged && !isSelectionChanged && !isRootChildChanged) {
          return state;
        }

        const nextDirectoryChildrenByPath = isRootChildChanged
          ? { ...state.directoryChildrenByPath, [path]: visibleFiles }
          : state.directoryChildrenByPath;

        return {
          files: isFileListChanged ? visibleFiles : state.files,
          currentPath: isPathChanged ? path : state.currentPath,
          selectedFiles: nextSelectedFiles,
          directoryChildrenByPath: nextDirectoryChildrenByPath,
          columnPathChain: isPathChanged ? [path] : state.columnPathChain,
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
    const { currentPath, activeTabId } = get();
    if (currentPath && currentPath !== path) {
      set((state) => ({
        history: [...state.history, currentPath],
        futureHistory: [],
        tabs: state.tabs.map((tab) => {
          if (tab.id !== activeTabId) return tab;
          return {
            ...tab,
            history: [...tab.history, currentPath],
            futureHistory: [],
          };
        }),
      }));
    }
    await get().loadFiles(path);
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === activeTabId ? { ...tab, path } : tab)),
    }));
  },
  goBack: async () => {
    const { history, currentPath, activeTabId } = get();
    if (history.length === 0) return;

    const previousPath = history[history.length - 1];
    set((state) => ({
      history: state.history.slice(0, -1),
      futureHistory: currentPath ? [...state.futureHistory, currentPath] : state.futureHistory,
      tabs: state.tabs.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        return {
          ...tab,
          history: tab.history.slice(0, -1),
          futureHistory: currentPath ? [...tab.futureHistory, currentPath] : tab.futureHistory,
        };
      }),
    }));
    await get().loadFiles(previousPath);
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === activeTabId ? { ...tab, path: previousPath } : tab)),
    }));
  },
  goForward: async () => {
    const { futureHistory, currentPath, activeTabId } = get();
    if (futureHistory.length === 0) return;

    const nextPath = futureHistory[futureHistory.length - 1];
    set((state) => ({
      futureHistory: state.futureHistory.slice(0, -1),
      history: currentPath ? [...state.history, currentPath] : state.history,
      tabs: state.tabs.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        return {
          ...tab,
          futureHistory: tab.futureHistory.slice(0, -1),
          history: currentPath ? [...tab.history, currentPath] : tab.history,
        };
      }),
    }));
    await get().loadFiles(nextPath);
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === activeTabId ? { ...tab, path: nextPath } : tab)),
    }));
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
        const firstTabId = createTabId();
        set({
          tabs: [{ id: firstTabId, path, history: [], futureHistory: [], isPinned: false }],
          activeTabId: firstTabId,
        });
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
  setColumnPathChain: (paths) => {
    const normalized = paths.filter(Boolean);
    set((state) => {
      if (state.columnPathChain.length === normalized.length) {
        let identical = true;
        for (let i = 0; i < normalized.length; i += 1) {
          if (state.columnPathChain[i] !== normalized[i]) {
            identical = false;
            break;
          }
        }
        if (identical) {
          return state;
        }
      }
      return { columnPathChain: normalized };
    });
  },
  loadDirectoryEntries: async (path, options) => {
    const force = options?.force ?? false;
    const cached = get().directoryChildrenByPath[path];
    if (!force && cached) {
      return cached;
    }

    const entries = await readDir(path);
    const childFiles: FileEntry[] = await Promise.all(entries.map(async (entry) => ({
      name: entry.name,
      path: await join(path, entry.name),
      isDirectory: entry.isDirectory,
    })));
    const visibleChildFiles = sortVisibleEntries(childFiles);

    set((state) => {
      if (areFileEntriesEqual(state.directoryChildrenByPath[path], visibleChildFiles)) {
        return state;
      }
      return {
        directoryChildrenByPath: {
          ...state.directoryChildrenByPath,
          [path]: visibleChildFiles,
        },
      };
    });

    return visibleChildFiles;
  },
  openTab: async (path) => {
    const { currentPath } = get();
    const nextPath = path ?? currentPath;
    if (!nextPath) return;
    const tabId = createTabId();
    set((state) => ({
      tabs: [...state.tabs, { id: tabId, path: nextPath, history: [], futureHistory: [], isPinned: false }],
      activeTabId: tabId,
      history: [],
      futureHistory: [],
      selectedFiles: [],
    }));
    await get().loadFiles(nextPath);
  },
  switchTab: async (tabId) => {
    const { tabs, activeTabId } = get();
    if (tabId === activeTabId) return;
    const nextTab = tabs.find((tab) => tab.id === tabId);
    if (!nextTab) return;
    set({
      activeTabId: tabId,
      history: nextTab.history,
      futureHistory: nextTab.futureHistory,
      selectedFiles: [],
    });
    await get().loadFiles(nextTab.path);
  },
  closeTab: async (tabId) => {
    const { tabs, activeTabId } = get();
    if (tabs.length <= 1) return;
    const closingIndex = tabs.findIndex((tab) => tab.id === tabId);
    if (closingIndex === -1) return;
    const remainingTabs = tabs.filter((tab) => tab.id !== tabId);
    if (activeTabId !== tabId) {
      set({ tabs: remainingTabs });
      return;
    }
    const nextActiveTab = remainingTabs[Math.max(0, closingIndex - 1)];
    set({
      tabs: remainingTabs,
      activeTabId: nextActiveTab.id,
      history: nextActiveTab.history,
      futureHistory: nextActiveTab.futureHistory,
      selectedFiles: [],
    });
    await get().loadFiles(nextActiveTab.path);
  },
  closeOtherTabs: async (tabId) => {
    const { tabs } = get();
    const keepTab = tabs.find((tab) => tab.id === tabId);
    if (!keepTab) return;
    set({
      tabs: [keepTab],
      activeTabId: keepTab.id,
      history: keepTab.history,
      futureHistory: keepTab.futureHistory,
      selectedFiles: [],
    });
    await get().loadFiles(keepTab.path);
  },
  toggleTabPin: (tabId) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, isPinned: !tab.isPinned } : tab)),
    }));
  },
  moveTab: (sourceTabId, targetTabId) => {
    if (sourceTabId === targetTabId) return;
    set((state) => {
      const sourceIndex = state.tabs.findIndex((tab) => tab.id === sourceTabId);
      const targetIndex = state.tabs.findIndex((tab) => tab.id === targetTabId);
      if (sourceIndex === -1 || targetIndex === -1) {
        return state;
      }

      const nextTabs = [...state.tabs];
      const [movedTab] = nextTabs.splice(sourceIndex, 1);
      nextTabs.splice(targetIndex, 0, movedTab);

      return { tabs: nextTabs };
    });
  },
}));

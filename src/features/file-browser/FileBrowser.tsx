import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { useFileBrowserStore } from './useFileBrowserStore';
import { usePlayerStore } from '../player/usePlayerStore';
import { useProcessorStore } from '../processor/useProcessorStore';
import { Folder, Music, Pin, PinOff, ArrowUpLeft, X, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FileEntry } from './file-browser.types';
import { isVisibleInFileBrowser } from './file-browser.utils';
import { readDir, rename } from '@tauri-apps/plugin-fs';
import { basename, dirname, join } from '@tauri-apps/api/path';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ContextMenu } from '../context-menu/ContextMenu';
import { useContextMenu } from '../context-menu/useContextMenu';
import type { ContextMenuCommandId, ContextMenuItem } from '../context-menu/context-menu.types';

const MAX_VISIBLE_COLUMNS = 2;

type FileBrowserContextTarget =
  | { kind: 'fileRow'; path: string; selectedCount: number; inSelection: boolean }
  | { kind: 'folderRow'; path: string; isPinned: boolean }
  | { kind: 'pinnedRow'; path: string }
  | { kind: 'treeBlank'; currentPath: string | null }
  | { kind: 'tabRow'; tabId: string; isPinned: boolean; isOnlyTab: boolean };

export function FileBrowser() {
  const { t } = useTranslation();
  const {
    tabs, activeTabId,
    files, currentPath, isLoading, error,
    init, loadFiles, goUp, navigateTo, goForward, futureHistory,
    pinnedPaths, togglePin,
    selectedFiles, toggleSelection, setSelection,
    columnPathChain, directoryChildrenByPath, setColumnPathChain, loadDirectoryEntries,
    openTab, switchTab, closeTab, closeOtherTabs, toggleTabPin, moveTab,
  } = useFileBrowserStore();
  const { play } = usePlayerStore();
  const { addToQueue } = useProcessorStore();
  const [isDropTargetActive, setIsDropTargetActive] = useState(false);
  const [dropTargetDirectoryPath, setDropTargetDirectoryPath] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; count: number } | null>(null);
  const [internalDraggedPaths, setInternalDraggedPaths] = useState<string[] | null>(null);
  const clickTimeoutRef = useRef<number | null>(null);
  const pendingInternalDragRef = useRef<{ paths: string[]; startX: number; startY: number } | null>(null);
  const suppressClickRef = useRef(false);
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [tabDropTargetId, setTabDropTargetId] = useState<string | null>(null);

  useEffect(() => {
    void init();
  }, [init]);

  const selectionAnchorRef = useRef<{ path: string; columnIndex: number | null } | null>(null);

  const entryByPath = useMemo(() => {
    const map = new Map<string, FileEntry>();
    const walk = (entries: FileEntry[]) => {
      for (const entry of entries) {
        map.set(entry.path, entry);
        const children = directoryChildrenByPath[entry.path];
        if (entry.isDirectory && children) {
          walk(children);
        }
      }
    };
    walk(files);
    return map;
  }, [directoryChildrenByPath, files]);

  const collectVisibleSelectedAudioFiles = useCallback(() => {
    return selectedFiles.filter((path) => {
      const entry = entryByPath.get(path);
      return Boolean(entry && !entry.isDirectory);
    });
  }, [entryByPath, selectedFiles]);

  const collectAudioFilesFromDirectory = useCallback(async (directoryPath: string): Promise<string[]> => {
    const result: string[] = [];
    const walk = async (path: string) => {
      const entries = await readDir(path);
      for (const entry of entries) {
        if (!entry.name) continue;
        const fullPath = await join(path, entry.name);
        if (entry.isDirectory) {
          await walk(fullPath);
          continue;
        }
        if (isVisibleInFileBrowser(entry.name, false)) {
          result.push(fullPath);
        }
      }
    };
    await walk(directoryPath);
    return result;
  }, []);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [activeTabId, tabs],
  );

  const canGoLocalBack = currentPath !== '' &&
    !(columnPathChain.length === 0 || columnPathChain[0] !== currentPath) &&
    columnPathChain.length > 1;
  const canGoUpFromCurrentView = canGoLocalBack || currentPath !== '';

  const buildMenuItems = useCallback((target: FileBrowserContextTarget | null): ContextMenuItem[] => {
    if (!target) return [];

    if (target.kind === 'fileRow') {
      return [
        { id: 'file.play', label: t('player.play', { defaultValue: '再生' }), shortcutHint: 'Enter' },
        { id: 'file.addToQueue', label: 'キューに追加' },
        {
          id: 'file.addSelectedToQueue',
          label: `選択項目をキューに追加 (${target.selectedCount})`,
          enabled: target.selectedCount > 1 && target.inSelection,
        },
        { id: 'file.copyPath', label: 'パスをコピー', separatorBefore: true, shortcutHint: 'Ctrl+C' },
        { id: 'file.revealInExplorer', label: 'エクスプローラーで表示' },
      ];
    }

    if (target.kind === 'folderRow') {
      return [
        { id: 'folder.open', label: '開く' },
        target.isPinned
          ? { id: 'folder.unpin', label: 'ピン留めを解除' }
          : { id: 'folder.pin', label: 'ピン留めする' },
        { id: 'folder.copyPath', label: 'パスをコピー', separatorBefore: true },
        { id: 'folder.addAudioFilesToQueue', label: '配下の音声をキューに追加' },
        { id: 'folder.openInExplorer', label: 'エクスプローラーで表示' },
        { id: 'folder.openInNewTab', label: '新しいタブで開く' },
      ];
    }

    if (target.kind === 'pinnedRow') {
      return [
        { id: 'folder.open', label: '開く' },
        { id: 'folder.openInNewTab', label: '新しいタブで開く' },
        { id: 'folder.unpin', label: 'ピン留めを解除' },
        { id: 'folder.copyPath', label: 'パスをコピー', separatorBefore: true },
      ];
    }

    if (target.kind === 'tabRow') {
      return [
        target.isPinned
          ? { id: 'tab.unpin', label: 'タブの固定を解除' }
          : { id: 'tab.pin', label: 'タブを固定' },
        { id: 'tab.close', label: 'タブを閉じる', enabled: !target.isOnlyTab },
        { id: 'tab.closeOthers', label: '他のタブを閉じる', enabled: !target.isOnlyTab, separatorBefore: true },
      ];
    }

    return [
      { id: 'browser.refresh', label: '更新', shortcutHint: 'F5' },
      { id: 'browser.back', label: '戻る', enabled: canGoLocalBack, shortcutHint: 'Alt+←' },
      { id: 'browser.forward', label: '進む', enabled: futureHistory.length > 0, shortcutHint: 'Alt+→' },
      { id: 'browser.up', label: '一つ上へ', enabled: canGoUpFromCurrentView, separatorBefore: true },
      {
        id: 'browser.pinCurrentFolder',
        label: pinnedPaths.includes(currentPath) ? '現在フォルダのピンを解除' : '現在フォルダをピン留め',
        enabled: Boolean(target.currentPath),
      },
      {
        id: activeTab?.isPinned ? 'tab.unpin' : 'tab.pin',
        label: activeTab?.isPinned ? 'タブの固定を解除' : 'タブを固定',
        enabled: Boolean(activeTab),
        separatorBefore: true,
      },
      { id: 'tab.closeOthers', label: '他のタブを閉じる', enabled: tabs.length > 1 },
    ];
  }, [activeTab, canGoLocalBack, canGoUpFromCurrentView, currentPath, futureHistory.length, pinnedPaths, t, tabs.length]);

  const { menuState, menuItems, openMenu, closeMenu } = useContextMenu<FileBrowserContextTarget>({
    itemsBuilder: buildMenuItems,
  });

  const handleFileDoubleClick = (file: FileEntry) => {
    setSelection([file.path]);
    selectionAnchorRef.current = { path: file.path, columnIndex: null };

    if (file.isDirectory) {
      void navigateTo(file.path);
    } else {
      play(file.path);
    }
  };

  const handleDroppedPaths = useCallback(async (paths: string[]) => {
    if (paths.length === 0) return;

    const droppedDirectories: string[] = [];
    const droppedFiles: string[] = [];

    await Promise.all(
      paths.map(async (path) => {
        try {
          await readDir(path);
          droppedDirectories.push(path);
        } catch {
          droppedFiles.push(path);
        }
      }),
    );

    if (droppedDirectories.length > 0) {
      await navigateTo(droppedDirectories[0]);
      return;
    }

    if (droppedFiles.length === 0) {
      return;
    }

    const audioFiles = droppedFiles.filter((path) => {
      const fileName = path.split(/[\\/]/).pop() ?? '';
      return isVisibleInFileBrowser(fileName, false);
    });

    if (audioFiles.length === 0) {
      return;
    }

    const parentPath = await dirname(audioFiles[0]);
    const normalizeForCompare = (path: string) => path.replace(/[\\/]+/g, '/').toLowerCase();
    const normalizedParent = normalizeForCompare(parentPath);
    await navigateTo(parentPath);
    const selectionInParent = audioFiles.filter((path) => {
      const normalizedPath = normalizeForCompare(path);
      return normalizedPath.startsWith(`${normalizedParent}/`);
    });
    setSelection(selectionInParent.length > 0 ? selectionInParent : [audioFiles[0]]);
    selectionAnchorRef.current = { path: audioFiles[0], columnIndex: null };
  }, [navigateTo, setSelection]);

  const moveFilesToDirectory = useCallback(async (paths: string[], targetDirectoryPath: string) => {
    if (paths.length === 0) return;

    const normalizeForCompare = (path: string) => path.replace(/[\\/]+/g, '/').toLowerCase();
    const normalizedTargetPath = normalizeForCompare(targetDirectoryPath);

    const movedDestinationPaths: string[] = [];
    for (const sourcePath of paths) {
      const sourceName = sourcePath.split(/[\\/]/).pop() ?? '';
      if (!isVisibleInFileBrowser(sourceName, false)) {
        continue;
      }

      const parentPath = await dirname(sourcePath);
      if (normalizeForCompare(parentPath) === normalizedTargetPath) {
        continue;
      }

      try {
        const fileName = await basename(sourcePath);
        const destinationPath = await join(targetDirectoryPath, fileName);
        await rename(sourcePath, destinationPath);
        movedDestinationPaths.push(destinationPath);
      } catch (moveError) {
        console.error(`Failed to move file: ${sourcePath}`, moveError);
      }
    }

    if (movedDestinationPaths.length === 0) {
      return;
    }

    await navigateTo(targetDirectoryPath);
    setSelection(movedDestinationPaths);
    selectionAnchorRef.current = { path: movedDestinationPaths[0], columnIndex: null };
  }, [navigateTo, setSelection]);

  const getDirectoryPathFromPoint = useCallback((x: number, y: number): string | null => {
    const element = document.elementFromPoint(x, y) as HTMLElement | null;
    const dropTargetElement = element?.closest<HTMLElement>('[data-directory-path]');
    return dropTargetElement?.dataset.directoryPath ?? null;
  }, []);

  const startPendingInternalDrag = useCallback((file: FileEntry, event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || file.isDirectory) return;
    const pathsToDrag = selectedFiles.includes(file.path) ? selectedFiles : [file.path];
    pendingInternalDragRef.current = {
      paths: pathsToDrag,
      startX: event.clientX,
      startY: event.clientY,
    };
  }, [selectedFiles]);

  const normalizedColumnChain = useMemo(() => {
    if (!currentPath) return [];
    if (columnPathChain.length === 0 || columnPathChain[0] !== currentPath) {
      return [currentPath];
    }
    return columnPathChain;
  }, [columnPathChain, currentPath]);

  useEffect(() => {
    if (!currentPath) return;
    if (normalizedColumnChain.length === 1 && normalizedColumnChain[0] === currentPath) {
      if (columnPathChain.length === 1 && columnPathChain[0] === currentPath) {
        return;
      }
      setColumnPathChain([currentPath]);
    }
  }, [columnPathChain, currentPath, normalizedColumnChain, setColumnPathChain]);

  useEffect(() => {
    normalizedColumnChain.slice(1).forEach((path) => {
      void loadDirectoryEntries(path).catch((childError) => {
        console.error('Failed to read child dir', childError);
      });
    });
  }, [loadDirectoryEntries, normalizedColumnChain]);

  const handleLocalBack = useCallback(() => {
    if (normalizedColumnChain.length <= 1) return;
    const nextChain = normalizedColumnChain.slice(0, -1);
    const currentDirectoryPath = normalizedColumnChain[normalizedColumnChain.length - 1];
    setColumnPathChain(nextChain);
    setSelection([currentDirectoryPath]);
    selectionAnchorRef.current = { path: currentDirectoryPath, columnIndex: nextChain.length - 1 };
  }, [normalizedColumnChain, setColumnPathChain, setSelection]);

  const handleGoUpFromCurrentView = useCallback(async () => {
    if (canGoLocalBack) {
      handleLocalBack();
      return;
    }
    await goUp();
  }, [canGoLocalBack, goUp, handleLocalBack]);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current !== null) {
        window.clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void getCurrentWindow()
      .onDragDropEvent((event) => {
        const payload = event.payload;
        if (payload.type === 'enter' || payload.type === 'over') {
          setIsDropTargetActive(true);
          return;
        }
        if (payload.type === 'leave') {
          setIsDropTargetActive(false);
          return;
        }
        if (payload.type === 'drop') {
          setIsDropTargetActive(false);
          void handleDroppedPaths(payload.paths);
        }
      })
      .then((fn) => {
        unlisten = fn;
      });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [handleDroppedPaths]);

  useEffect(() => {
    const handleMouseMove = (event: globalThis.MouseEvent) => {
      const pending = pendingInternalDragRef.current;
      if (!pending && !internalDraggedPaths) return;

      if (!internalDraggedPaths && pending) {
        const movedX = Math.abs(event.clientX - pending.startX);
        const movedY = Math.abs(event.clientY - pending.startY);
        if (movedX < 4 && movedY < 4) {
          return;
        }
        suppressClickRef.current = true;
        setInternalDraggedPaths(pending.paths);
      }

      const activePaths = internalDraggedPaths ?? pending?.paths ?? [];
      if (activePaths.length === 0) return;

      const directoryPath = getDirectoryPathFromPoint(event.clientX, event.clientY);
      setDropTargetDirectoryPath(directoryPath);
      setDragPreview({ x: event.clientX, y: event.clientY, count: activePaths.length });
    };

    const handleMouseUp = () => {
      const droppedPaths = internalDraggedPaths;
      const targetDirectoryPath = dropTargetDirectoryPath;

      pendingInternalDragRef.current = null;
      setDragPreview(null);
      setInternalDraggedPaths(null);
      setDropTargetDirectoryPath(null);

      if (droppedPaths && targetDirectoryPath) {
        void moveFilesToDirectory(droppedPaths, targetDirectoryPath);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dropTargetDirectoryPath, getDirectoryPathFromPoint, internalDraggedPaths, moveFilesToDirectory]);

  const refreshFileTree = useCallback(async () => {
    if (!currentPath) return;

    await loadFiles(currentPath, { preserveSelection: true, silent: true });
    await Promise.all(
      normalizedColumnChain.slice(1).map(async (path) => {
        try {
          await loadDirectoryEntries(path, { force: true });
        } catch (childError) {
          console.error('Failed to refresh child dir', childError);
        }
      }),
    );
  }, [currentPath, loadDirectoryEntries, loadFiles, normalizedColumnChain]);

  const handleContextCommand = useCallback(async (commandId: ContextMenuCommandId) => {
    const target = menuState.target;
    if (!target) return;

    const path =
      target.kind === 'fileRow' || target.kind === 'folderRow' || target.kind === 'pinnedRow'
        ? target.path
        : null;

    switch (commandId) {
      case 'file.play':
        if (path) {
          setSelection([path]);
          selectionAnchorRef.current = { path, columnIndex: null };
          play(path);
        }
        break;
      case 'file.addToQueue':
        if (path) addToQueue([path]);
        break;
      case 'file.addSelectedToQueue':
        addToQueue(collectVisibleSelectedAudioFiles());
        break;
      case 'file.copyPath':
      case 'folder.copyPath':
        if (path) await navigator.clipboard.writeText(path);
        break;
      case 'file.revealInExplorer':
        if (path) {
          const parent = await dirname(path);
          await navigateTo(parent);
          setSelection([path]);
          selectionAnchorRef.current = { path, columnIndex: null };
        }
        break;
      case 'folder.open':
        if (path) await navigateTo(path);
        break;
      case 'folder.openInNewTab':
        if (path) await openTab(path);
        break;
      case 'folder.pin':
      case 'folder.unpin':
        if (path) await togglePin(path);
        break;
      case 'folder.addAudioFilesToQueue':
        if (path) {
          const filesToQueue = await collectAudioFilesFromDirectory(path);
          addToQueue(filesToQueue);
        }
        break;
      case 'folder.openInExplorer':
        if (path) await navigateTo(path);
        break;
      case 'browser.refresh':
        await refreshFileTree();
        break;
      case 'browser.back':
        handleLocalBack();
        break;
      case 'browser.forward':
        await goForward();
        break;
      case 'browser.up':
        await handleGoUpFromCurrentView();
        break;
      case 'browser.pinCurrentFolder':
        if (currentPath) await togglePin(currentPath);
        break;
      case 'tab.pin':
      case 'tab.unpin':
        if (target.kind === 'tabRow') {
          toggleTabPin(target.tabId);
        } else if (activeTabId) {
          toggleTabPin(activeTabId);
        }
        break;
      case 'tab.close':
        if (target.kind === 'tabRow') {
          await closeTab(target.tabId);
        } else if (activeTabId) {
          await closeTab(activeTabId);
        }
        break;
      case 'tab.closeOthers':
        if (target.kind === 'tabRow') {
          await closeOtherTabs(target.tabId);
        } else if (activeTabId) {
          await closeOtherTabs(activeTabId);
        }
        break;
      default:
        break;
    }
  }, [
    addToQueue,
    collectAudioFilesFromDirectory,
    collectVisibleSelectedAudioFiles,
    closeOtherTabs,
    closeTab,
    currentPath,
    goForward,
    goUp,
    handleGoUpFromCurrentView,
    handleLocalBack,
    menuState.target,
    navigateTo,
    openTab,
    play,
    refreshFileTree,
    setSelection,
    toggleTabPin,
    togglePin,
    activeTabId,
  ]);

  useEffect(() => {
    if (!currentPath) return;

    let isRefreshing = false;

    const runRefresh = async () => {
      if (isRefreshing) return;
      isRefreshing = true;
      try {
        await refreshFileTree();
      } finally {
        isRefreshing = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void runRefresh();
    }, 5000);

    const handleFocus = () => {
      void runRefresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void runRefresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentPath, refreshFileTree]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const tagName = activeElement?.tagName;
      const isTypingTarget =
        activeElement?.isContentEditable === true ||
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT';

      if (isTypingTarget) {
        return;
      }

      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        handleLocalBack();
        return;
      }

      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault();
        void goForward();
        return;
      }

      if (
        event.key === 'Backspace' &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        handleLocalBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [goForward, handleLocalBack]);

  const columns = useMemo(() => {
    if (!currentPath) return [] as Array<{
      directoryPath: string;
      entries: FileEntry[];
      selectedPath: string | null;
      chainIndex: number;
    }>;

    const fullColumns: Array<{ directoryPath: string; entries: FileEntry[]; selectedPath: string | null; chainIndex: number }> = [
      {
        directoryPath: currentPath,
        entries: files,
        selectedPath: normalizedColumnChain[1] ?? null,
        chainIndex: 0,
      },
    ];

    for (let i = 1; i < normalizedColumnChain.length; i += 1) {
      const directoryPath = normalizedColumnChain[i];
      fullColumns.push({
        directoryPath,
        entries: directoryChildrenByPath[directoryPath] ?? [],
        selectedPath: normalizedColumnChain[i + 1] ?? null,
        chainIndex: i,
      });
    }

    return fullColumns.slice(-MAX_VISIBLE_COLUMNS);
  }, [currentPath, directoryChildrenByPath, files, normalizedColumnChain]);

  const handleFileClick = (
    file: FileEntry,
    event: MouseEvent<HTMLDivElement>,
    columnIndex: number,
    columnEntries: FileEntry[],
  ) => {
    const isCtrlLike = event.ctrlKey || event.metaKey;

    if (event.shiftKey) {
      const anchor = selectionAnchorRef.current;
      if (!anchor || anchor.columnIndex !== columnIndex) {
        setSelection([file.path]);
        selectionAnchorRef.current = { path: file.path, columnIndex };
        return;
      }

      const columnPaths = columnEntries.map((entry) => entry.path);
      const anchorIndex = columnPaths.indexOf(anchor.path);
      const targetIndex = columnPaths.indexOf(file.path);
      if (anchorIndex === -1 || targetIndex === -1) {
        setSelection([file.path]);
        selectionAnchorRef.current = { path: file.path, columnIndex };
        return;
      }

      const [start, end] = anchorIndex < targetIndex
        ? [anchorIndex, targetIndex]
        : [targetIndex, anchorIndex];
      const range = columnPaths.slice(start, end + 1);
      setSelection(range);
      return;
    }

    if (isCtrlLike) {
      toggleSelection(file.path);
      selectionAnchorRef.current = { path: file.path, columnIndex };
      if (file.isDirectory) {
        const baseChain = normalizedColumnChain.slice(0, columnIndex + 1);
        const nextChain = [...baseChain, file.path];
        void loadDirectoryEntries(file.path).catch(() => { });
        setColumnPathChain(nextChain);
      }
      return;
    }

    setSelection([file.path]);
    selectionAnchorRef.current = { path: file.path, columnIndex };

    const baseChain = normalizedColumnChain.slice(0, columnIndex + 1);
    if (file.isDirectory) {
      const nextChain = [...baseChain, file.path];
      void loadDirectoryEntries(file.path).catch(() => { });
      setColumnPathChain(nextChain);
      return;
    }
    setColumnPathChain(baseChain);
  };

  const isCurrentPinned = pinnedPaths.includes(currentPath);

  if (isLoading && files.length === 0) return <div className="p-4">{t('fileBrowser.loading')}</div>;
  if (error) return <div className="p-4 text-red-500">{t('fileBrowser.error', { message: error })}</div>;
  if (!currentPath && files.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-400 space-y-3">
        <div>フォルダを読み込めませんでした。</div>
        <button
          onClick={() => void init()}
          className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700"
        >
          再読み込み
        </button>
      </div>
    );
  }

  const renderColumnEntry = (file: FileEntry, chainIndex: number, columnEntries: FileEntry[]) => {
    const isSelected = selectedFiles.includes(file.path);
    const isDropTargetDirectory = file.isDirectory && dropTargetDirectoryPath === file.path;

    return (
      <li key={`${chainIndex}-${file.path}`}>
        <div
          data-directory-path={file.isDirectory ? file.path : undefined}
          className={`
            flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer text-sm select-none
            ${isSelected ? 'file-row-selected bg-blue-900/25 text-blue-100' : 'hover:bg-gray-800 text-gray-300'}
            ${isDropTargetDirectory ? 'ring-1 ring-blue-500 bg-blue-900/20' : ''}
          `}
          onMouseDown={(event) => startPendingInternalDrag(file, event)}
          onClick={(event) => {
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              return;
            }
            if (clickTimeoutRef.current !== null) {
              window.clearTimeout(clickTimeoutRef.current);
            }

            // Keep single-click as selection-only, and avoid toggling on double-click.
            clickTimeoutRef.current = window.setTimeout(() => {
              handleFileClick(file, event, chainIndex, columnEntries);
              clickTimeoutRef.current = null;
            }, 200);
          }}
          onDoubleClick={() => {
            if (clickTimeoutRef.current !== null) {
              window.clearTimeout(clickTimeoutRef.current);
              clickTimeoutRef.current = null;
            }
            handleFileDoubleClick(file);
          }}
          onContextMenu={(event) => {
            if (file.isDirectory) {
              openMenu(event, {
                kind: 'folderRow',
                path: file.path,
                isPinned: pinnedPaths.includes(file.path),
              });
              return;
            }

            const inSelection = selectedFiles.includes(file.path);
            if (!inSelection) {
              setSelection([file.path]);
              selectionAnchorRef.current = { path: file.path, columnIndex: chainIndex };
            }
            openMenu(event, {
              kind: 'fileRow',
              path: file.path,
              selectedCount: inSelection ? selectedFiles.length : 1,
              inSelection: inSelection || selectedFiles.length === 0,
            });
          }}
        >
          {file.isDirectory ? (
            <Folder className="w-4 h-4 text-blue-400" />
          ) : (
            <Music className="w-4 h-4 text-emerald-400" />
          )}
          <span className="truncate flex-1">{file.name}</span>
          {file.isDirectory ? <span className="text-[11px] text-gray-500">{'>'}</span> : null}
        </div>
      </li>
    );
  };

  return (
    <div
      className="h-full overflow-hidden p-2 flex flex-col relative"
      onMouseUp={(event) => {
        // Mouse side buttons: 3=Back, 4=Forward (browser-like navigation).
        if (event.button === 3) {
          event.preventDefault();
          handleLocalBack();
          return;
        }

        if (event.button === 4) {
          event.preventDefault();
          void goForward();
        }
      }}
    >
      {isDropTargetActive && (
        <div className="absolute inset-2 z-10 pointer-events-none rounded border-2 border-dashed border-blue-500 bg-blue-500/10 flex items-center justify-center">
          <span className="text-sm font-medium text-blue-200">
            ここにドロップして開く
          </span>
        </div>
      )}
      {dragPreview && (
        <div
          className="absolute z-20 pointer-events-none rounded border border-blue-500 bg-gray-950/90 px-2 py-1 text-xs text-blue-200"
          style={{ left: `${dragPreview.x + 12}px`, top: `${dragPreview.y + 12}px` }}
        >
          {dragPreview.count} 件を移動
        </div>
      )}
      {/* Top fixed controls */}
      <div className="shrink-0 mb-2 space-y-1.5 border-b border-gray-800 pb-2">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 hover-scroll">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const tabName = tab.path.split(/[\\/]/).pop() || tab.path;
            return (
              <button
                key={tab.id}
                type="button"
                draggable
                className={`group inline-flex max-w-[200px] items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${isActive
                    ? 'bg-gray-900 text-gray-100'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  } ${draggingTabId === tab.id ? 'opacity-60' : ''} ${tabDropTargetId === tab.id ? 'ring-1 ring-blue-500' : ''
                  }`}
                onDragStart={(event) => {
                  setDraggingTabId(tab.id);
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', tab.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (draggingTabId && draggingTabId !== tab.id) {
                    setTabDropTargetId(tab.id);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const sourceTabId = draggingTabId ?? event.dataTransfer.getData('text/plain');
                  if (sourceTabId && sourceTabId !== tab.id) {
                    moveTab(sourceTabId, tab.id);
                  }
                  setDraggingTabId(null);
                  setTabDropTargetId(null);
                }}
                onDragEnd={() => {
                  setDraggingTabId(null);
                  setTabDropTargetId(null);
                }}
                onClick={() => {
                  void switchTab(tab.id);
                }}
                onContextMenu={(event) => {
                  openMenu(event, {
                    kind: 'tabRow',
                    tabId: tab.id,
                    isPinned: tab.isPinned,
                    isOnlyTab: tabs.length === 1,
                  });
                }}
                title={tab.path}
              >
                {tab.isPinned ? <Pin className="h-3 w-3 text-yellow-500" /> : null}
                <span className="truncate">{tabName}</span>
                {tabs.length > 1 && !tab.isPinned ? (
                  <span
                    className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded text-gray-500 hover:bg-gray-700 hover:text-gray-300"
                    onClick={(event) => {
                      event.stopPropagation();
                      void closeTab(tab.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                ) : null}
              </button>
            );
          })}
          <button
            type="button"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            onClick={() => {
              void openTab();
            }}
            title="新しいタブ"
            aria-label="新しいタブ"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <button
              onClick={handleLocalBack}
              className="inline-flex !h-7 !w-7 items-center justify-center !p-0 !border-0 !bg-transparent rounded text-gray-300 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!canGoLocalBack}
              title="戻る"
              aria-label="戻る"
            >
              <span className="text-sm leading-none">&lt;</span>
            </button>
            <button
              onClick={() => void goForward()}
              className="inline-flex !h-7 !w-7 items-center justify-center !p-0 !border-0 !bg-transparent rounded text-gray-300 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={futureHistory.length === 0}
              title="進む"
              aria-label="進む"
            >
              <span className="text-sm leading-none">&gt;</span>
            </button>
            {currentPath !== '' && (
              <button
                className="inline-flex items-center gap-1.5 py-1 px-2 hover:bg-gray-800 rounded cursor-pointer text-xs text-gray-400"
                onClick={() => {
                  void handleGoUpFromCurrentView();
                }}
                disabled={!canGoUpFromCurrentView}
                title="一つ上へ"
              >
                <Folder className="w-3.5 h-3.5" />
                <ArrowUpLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500 truncate px-1" title={currentPath}>{currentPath}</div>
      </div>

      {/* Scrollable Miller columns */}
      <div
        className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden hover-scroll"
        onContextMenu={(event) => {
          openMenu(event, {
            kind: 'treeBlank',
            currentPath: currentPath || null,
          });
        }}
      >
        <div className="flex h-full min-w-max gap-2 pr-2">
          {columns.map((column, columnIndex) => (
            <section
              key={`${column.directoryPath}-${columnIndex}`}
              className="w-64 shrink-0 h-full border border-gray-800 rounded bg-gray-900/40 flex flex-col"
            >
              <div className="px-2 py-1.5 text-[11px] text-gray-500 border-b border-gray-800 truncate" title={column.directoryPath}>
                {column.directoryPath.split(/[\\/]/).pop() || column.directoryPath}
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto hover-scroll p-1 space-y-0.5">
                {column.entries.map((file) => renderColumnEntry(file, column.chainIndex, column.entries))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {/* Bottom fixed pin controls */}
      <div className="shrink-0 mt-2 border-t border-gray-800 pt-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-gray-500 uppercase">{t('fileBrowser.pinned')}</div>
          <button
            onClick={() => currentPath && togglePin(currentPath)}
            className="inline-flex !h-7 !w-7 items-center justify-center !p-0 !border-0 !bg-transparent rounded hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            title={isCurrentPinned ? t('fileBrowser.unpinCurrentFolder') : t('fileBrowser.pinCurrentFolder')}
            disabled={!currentPath}
          >
            {isCurrentPinned ? (
              <Pin className="w-4 h-4 text-yellow-500 fill-current" />
            ) : (
              <Pin className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>

        {pinnedPaths.length > 0 ? (
          <ul className="space-y-1 max-h-32 overflow-y-auto hover-scroll pr-1">
            {pinnedPaths.map((path) => (
              <li
                key={path}
                className="flex items-center gap-2 p-1 hover:bg-gray-800 rounded cursor-pointer text-sm text-gray-300"
                onClick={() => navigateTo(path)}
                onContextMenu={(event) => {
                  openMenu(event, {
                    kind: 'pinnedRow',
                    path,
                  });
                }}
              >
                <Pin className="w-3 h-3 text-yellow-500" />
                <span className="truncate flex-1" title={path}>
                  {path.split(/[\\/]/).pop()}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(path);
                  }}
                  className="inline-flex !h-7 !w-7 items-center justify-center !p-0 !border-0 !bg-transparent rounded hover:bg-gray-700"
                >
                  <PinOff className="w-3 h-3 text-gray-500 hover:text-red-400" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <ContextMenu
        open={menuState.open}
        x={menuState.x}
        y={menuState.y}
        items={menuItems}
        onClose={closeMenu}
        onSelect={(id) => {
          void handleContextCommand(id);
        }}
      />
    </div>
  );
}

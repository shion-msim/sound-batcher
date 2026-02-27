import { useCallback, useEffect, useRef, useState } from 'react';
import { useFileBrowserStore } from './useFileBrowserStore';
import { usePlayerStore } from '../player/usePlayerStore';
import { Folder, File, Pin, PinOff, CheckSquare, Square, ChevronRight, ChevronDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FileEntry } from './file-browser.types';
import { readDir } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';

export function FileBrowser() {
  const { t } = useTranslation();
  const { 
    files, currentPath, isLoading, error, 
    init, goUp, navigateTo, goBack, goForward, history, futureHistory,
    pinnedPaths, togglePin, expandedPaths, toggleDirectoryExpanded,
    selectedFiles, toggleSelection 
  } = useFileBrowserStore();
  const { play } = usePlayerStore();
  const [childrenByPath, setChildrenByPath] = useState<Record<string, FileEntry[]>>({});
  const [loadingDirs, setLoadingDirs] = useState<Set<string>>(new Set());
  const clickTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    void init();
  }, [init]);

  const handleFileClick = (file: FileEntry) => {
    toggleSelection(file.path);
  };

  const handleFileDoubleClick = (file: FileEntry) => {
    if (file.isDirectory) {
      void navigateTo(file.path);
    } else {
      play(file.path);
    }
  };

  const loadChildren = useCallback(async (path: string) => {
    if (childrenByPath[path]) return;

    setLoadingDirs((prev) => {
      const next = new Set(prev);
      next.add(path);
      return next;
    });

    try {
      const entries = await readDir(path);
      const childFiles: FileEntry[] = await Promise.all(
        entries.map(async (entry) => ({
          name: entry.name,
          path: await join(path, entry.name),
          isDirectory: entry.isDirectory,
        })),
      );

      childFiles.sort((a, b) => {
        if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
        return a.isDirectory ? -1 : 1;
      });

      setChildrenByPath((prev) => ({ ...prev, [path]: childFiles }));
    } catch (childError) {
      console.error('Failed to read child dir', childError);
    } finally {
      setLoadingDirs((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    }
  }, [childrenByPath]);

  const toggleDirectory = useCallback((path: string) => {
    const isExpanded = expandedPaths.includes(path);
    const shouldLoad = !isExpanded && !childrenByPath[path];

    if (shouldLoad) {
      void loadChildren(path);
    }
    void toggleDirectoryExpanded(path);
  }, [childrenByPath, expandedPaths, loadChildren, toggleDirectoryExpanded]);

  useEffect(() => {
    const pendingLoads: string[] = [];

    const walkVisible = (entries: FileEntry[]) => {
      for (const entry of entries) {
        if (!entry.isDirectory) continue;

        const isExpanded = expandedPaths.includes(entry.path);
        if (!isExpanded) continue;

        const children = childrenByPath[entry.path];
        const isLoadingChild = loadingDirs.has(entry.path);
        if (!children && !isLoadingChild) {
          pendingLoads.push(entry.path);
          continue;
        }

        if (children) {
          walkVisible(children);
        }
      }
    };

    walkVisible(files);

    pendingLoads.forEach((path) => {
      void loadChildren(path);
    });
  }, [childrenByPath, expandedPaths, files, loadChildren, loadingDirs]);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current !== null) {
        window.clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

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
        void goBack();
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
        void goBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [goBack, goForward]);

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

  const renderEntry = (file: FileEntry, depth = 0) => {
    const isSelected = selectedFiles.includes(file.path);
    const isExpanded = expandedPaths.includes(file.path);
    const children = childrenByPath[file.path] ?? [];
    const isChildLoading = loadingDirs.has(file.path);

    return (
      <li key={file.path}>
        <div
          className={`
            flex items-center gap-2 p-1 rounded cursor-pointer text-sm select-none
            ${isSelected ? 'bg-blue-900/30 text-blue-100' : 'hover:bg-gray-800 text-gray-300'}
          `}
          style={{ paddingLeft: `${4 + depth * 14}px` }}
          onClick={() => {
            if (clickTimeoutRef.current !== null) {
              window.clearTimeout(clickTimeoutRef.current);
            }

            // Keep single-click as selection-only, and avoid toggling on double-click.
            clickTimeoutRef.current = window.setTimeout(() => {
              handleFileClick(file);
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
        >
          <div className="flex-shrink-0">
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-blue-400" />
            ) : (
              <Square className="w-4 h-4 text-gray-600" />
            )}
          </div>

          {file.isDirectory ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleDirectory(file.path);
              }}
              className="p-0.5 rounded hover:bg-gray-700"
              title={isExpanded ? '折りたたむ' : '展開する'}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {file.isDirectory ? (
            <Folder className="w-4 h-4 text-blue-400" />
          ) : (
            <File className="w-4 h-4 text-gray-400" />
          )}
          <span className="truncate flex-1">{file.name}</span>
        </div>

        {file.isDirectory && isExpanded && (
          <ul className="space-y-1">
            {isChildLoading && <li className="text-xs text-gray-500 pl-8">{t('fileBrowser.loading')}</li>}
            {!isChildLoading && children.map((child) => renderEntry(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div
      className="h-full overflow-y-auto p-2 flex flex-col"
      onMouseUp={(event) => {
        // Mouse side buttons: 3=Back, 4=Forward (browser-like navigation).
        if (event.button === 3) {
          event.preventDefault();
          void goBack();
          return;
        }

        if (event.button === 4) {
          event.preventDefault();
          void goForward();
        }
      }}
    >
      {/* Pinned Section */}
      {pinnedPaths.length > 0 && (
        <div className="mb-4 border-b border-gray-800 pb-2">
          <div className="text-xs font-bold text-gray-500 mb-1 uppercase">{t('fileBrowser.pinned')}</div>
          <ul className="space-y-1">
            {pinnedPaths.map(path => (
              <li 
                key={path}
                className="flex items-center gap-2 p-1 hover:bg-gray-800 rounded cursor-pointer text-sm text-gray-300"
                onClick={() => navigateTo(path)}
              >
                <Pin className="w-3 h-3 text-yellow-500" />
                <span className="truncate flex-1" title={path}>
                  {path.split(/[\\/]/).pop()}
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); togglePin(path); }}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  <PinOff className="w-3 h-3 text-gray-500 hover:text-red-400" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Current Path Header */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => void goBack()}
            className="p-1 hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={history.length === 0}
            title="戻る"
            aria-label="戻る"
          >
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => void goForward()}
            className="p-1 hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={futureHistory.length === 0}
            title="進む"
            aria-label="進む"
          >
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="text-xs text-gray-500 truncate flex-1" title={currentPath}>{currentPath}</div>
        <button 
          onClick={() => currentPath && togglePin(currentPath)}
          className="p-1 hover:bg-gray-800 rounded"
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

      {/* File List */}
      <ul className="space-y-1 flex-1">
        {currentPath !== '' && (
            <li
                className="flex items-center gap-2 p-1 hover:bg-gray-800 rounded cursor-pointer text-sm text-gray-400"
                onClick={goUp}
            >
                <Folder className="w-4 h-4" />
                <span>..</span>
            </li>
        )}
        {files.map((file) => renderEntry(file))}
      </ul>
    </div>
  );
}

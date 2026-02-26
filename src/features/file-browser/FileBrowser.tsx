import { useEffect } from 'react';
import { useFileBrowserStore } from './useFileBrowserStore';
import { usePlayerStore } from '../player/usePlayerStore';
import { Folder, File, Pin, PinOff, CheckSquare, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FileEntry } from './file-browser.types';

export function FileBrowser() {
  const { t } = useTranslation();
  const { 
    files, currentPath, isLoading, error, 
    loadFiles, init, goUp, 
    pinnedPaths, togglePin, 
    selectedFiles, toggleSelection 
  } = useFileBrowserStore();
  const { play } = usePlayerStore();

  useEffect(() => {
    void init();
  }, [init]);

  const handleFileClick = (file: FileEntry) => {
    toggleSelection(file.path);
  };

  const handleFileDoubleClick = (file: FileEntry) => {
    if (file.isDirectory) {
      void loadFiles(file.path);
    } else {
      play(file.path);
    }
  };

  const isCurrentPinned = pinnedPaths.includes(currentPath);

  if (isLoading && files.length === 0) return <div className="p-4">{t('fileBrowser.loading')}</div>;
  if (error) return <div className="p-4 text-red-500">{t('fileBrowser.error', { message: error })}</div>;

  return (
    <div className="h-full overflow-y-auto p-2 flex flex-col">
      {/* Pinned Section */}
      {pinnedPaths.length > 0 && (
        <div className="mb-4 border-b border-gray-800 pb-2">
          <div className="text-xs font-bold text-gray-500 mb-1 uppercase">{t('fileBrowser.pinned')}</div>
          <ul className="space-y-1">
            {pinnedPaths.map(path => (
              <li 
                key={path}
                className="flex items-center gap-2 p-1 hover:bg-gray-800 rounded cursor-pointer text-sm text-gray-300"
                onClick={() => loadFiles(path)}
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
        <div className="text-xs text-gray-500 truncate flex-1" title={currentPath}>{currentPath}</div>
        <button 
          onClick={() => togglePin(currentPath)}
          className="p-1 hover:bg-gray-800 rounded"
          title={isCurrentPinned ? t('fileBrowser.unpinCurrentFolder') : t('fileBrowser.pinCurrentFolder')}
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
        {files.map((file) => {
          const isSelected = selectedFiles.includes(file.path);
          return (
            <li
              key={file.path}
              className={`
                flex items-center gap-2 p-1 rounded cursor-pointer text-sm select-none
                ${isSelected ? 'bg-blue-900/30 text-blue-100' : 'hover:bg-gray-800 text-gray-300'}
              `}
              onClick={() => handleFileClick(file)}
              onDoubleClick={() => handleFileDoubleClick(file)}
            >
              <div className="flex-shrink-0">
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-400" />
                ) : (
                  <Square className="w-4 h-4 text-gray-600" />
                )}
              </div>
              
              {file.isDirectory ? (
                <Folder className="w-4 h-4 text-blue-400" />
              ) : (
                <File className="w-4 h-4 text-gray-400" />
              )}
              <span className="truncate flex-1">{file.name}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

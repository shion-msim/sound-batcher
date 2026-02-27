import { useProcessorStore } from './useProcessorStore';
import { useFileBrowserStore } from '../file-browser/useFileBrowserStore';
import { useSettingsStore } from '../settings/useSettingsStore';
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { dirname } from '@tauri-apps/api/path';
import { ContextMenu } from '../context-menu/ContextMenu';
import { useContextMenu } from '../context-menu/useContextMenu';
import type { ContextMenuCommandId, ContextMenuItem } from '../context-menu/context-menu.types';

type ProcessorContextTarget =
  | { kind: 'queueItem'; taskId: string }
  | { kind: 'queueBlank' };

export function ProcessorPanel() {
  const {
    queue,
    isProcessing,
    addToQueue,
    startProcessing,
    clearQueue,
    moveTaskToFront,
    removeFromQueue,
    retryTask,
    removeTasksByStatus,
    dedupeQueue,
  } = useProcessorStore();
  const { files, selectedFiles, navigateTo } = useFileBrowserStore();
  const { renameOnly, setRenameOnly } = useSettingsStore();
  const { t } = useTranslation();

  const handleAddSelected = () => {
    const filesToAdd = files
        .filter(f => selectedFiles.includes(f.path) && !f.isDirectory)
        .map(f => f.path);
    
    addToQueue(filesToAdd);
  };

  const hasSelection = selectedFiles.length > 0;

  const buildMenuItems = useCallback((target: ProcessorContextTarget | null): ContextMenuItem[] => {
    if (!target) return [];
    if (target.kind === 'queueBlank') {
      return [
        { id: 'file.addSelectedToQueue', label: `選択項目を追加 (${selectedFiles.length})`, enabled: hasSelection },
        { id: 'queue.dedupe', label: '重複を除去', enabled: queue.length > 1 },
        { id: 'queue.removeCompleted', label: '完了タスクを削除', enabled: queue.some((task) => task.status === 'completed') },
        { id: 'queue.removeFailed', label: '失敗タスクを削除', enabled: queue.some((task) => task.status === 'failed') },
        { id: 'queue.clear', label: 'キューを全消去', danger: true, separatorBefore: true, enabled: queue.length > 0 },
      ];
    }

    const task = queue.find((item) => item.id === target.taskId);
    return [
      { id: 'queue.prioritize', label: '先頭に移動', enabled: !isProcessing },
      { id: 'queue.retry', label: '再実行待ちに戻す', enabled: !isProcessing },
      {
        id: 'history.openOutputFolder',
        label: '出力フォルダを開く',
        enabled: Boolean(task?.outputPath),
        separatorBefore: true,
      },
      { id: 'history.copyError', label: 'エラーコードをコピー', enabled: Boolean(task?.error) },
      { id: 'file.copyPath', label: '入力パスをコピー' },
      { id: 'queue.remove', label: 'キューから削除', danger: true, separatorBefore: true },
    ];
  }, [hasSelection, isProcessing, queue, selectedFiles.length]);

  const { menuState, menuItems, openMenu, closeMenu } = useContextMenu<ProcessorContextTarget>({
    itemsBuilder: buildMenuItems,
  });

  const handleContextCommand = useCallback(async (commandId: ContextMenuCommandId) => {
    const target = menuState.target;
    if (!target) return;

    if (commandId === 'file.addSelectedToQueue') {
      handleAddSelected();
      return;
    }
    if (commandId === 'queue.dedupe') {
      dedupeQueue();
      return;
    }
    if (commandId === 'queue.removeCompleted') {
      removeTasksByStatus(['completed']);
      return;
    }
    if (commandId === 'queue.removeFailed') {
      removeTasksByStatus(['failed']);
      return;
    }
    if (commandId === 'queue.clear') {
      clearQueue();
      return;
    }

    if (target.kind !== 'queueItem') return;
    const task = queue.find((item) => item.id === target.taskId);
    if (!task) return;

    switch (commandId) {
      case 'queue.prioritize':
        moveTaskToFront(task.id);
        break;
      case 'queue.retry':
        retryTask(task.id);
        break;
      case 'queue.remove':
        removeFromQueue(task.id);
        break;
      case 'history.copyError':
        if (task.error) {
          const extractedCode = task.error.match(/code\s+(-?\d+)/i)?.[1] ?? task.error;
          await navigator.clipboard.writeText(extractedCode);
        }
        break;
      case 'file.copyPath':
        await navigator.clipboard.writeText(task.file);
        break;
      case 'history.openOutputFolder':
        if (task.outputPath) {
          const parent = await dirname(task.outputPath);
          await navigateTo(parent);
        }
        break;
      default:
        break;
    }
  }, [
    clearQueue,
    dedupeQueue,
    menuState.target,
    moveTaskToFront,
    queue,
    removeFromQueue,
    removeTasksByStatus,
    retryTask,
    navigateTo,
  ]);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100 p-4">
      <h2 className="text-lg font-bold mb-4">{t('processor.title')}</h2>

      <div className="mb-4 space-y-2">
        <label className="block text-xs font-medium text-gray-500">{t('processor.modeLabel')}</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRenameOnly(false)}
            disabled={isProcessing}
            className={`
              px-2 py-1.5 rounded text-xs border transition-colors
              ${!renameOnly ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}
              ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}
            `}
          >
            {t('processor.modeProcess')}
          </button>
          <button
            type="button"
            onClick={() => setRenameOnly(true)}
            disabled={isProcessing}
            className={`
              px-2 py-1.5 rounded text-xs border transition-colors
              ${renameOnly ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}
              ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}
            `}
          >
            {t('processor.modeRenameOnly')}
          </button>
        </div>
      </div>
      
      <div className="flex gap-2 mb-4">
        <button 
            onClick={handleAddSelected} 
            disabled={!hasSelection}
            className={`
                px-3 py-1 rounded text-sm
                ${hasSelection ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
            `}
        >
          {t('processor.addSelected', { count: selectedFiles.length })}
        </button>
        <button onClick={clearQueue} className="px-3 py-1 bg-red-900/50 text-red-200 rounded hover:bg-red-900 text-sm">
          {t('processor.clear')}
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto hover-scroll mb-4 border border-gray-800 rounded bg-gray-950 p-2"
        onContextMenu={(event) => {
          openMenu(event, { kind: 'queueBlank' });
        }}
      >
        {queue.length === 0 ? (
          <div className="text-gray-500 text-sm text-center mt-4">{t('processor.queueEmpty')}</div>
        ) : (
          <ul className="space-y-2">
            {queue.map(task => (
              <li
                key={task.id}
                className="text-xs p-2 bg-gray-900 rounded flex justify-between items-center"
                onContextMenu={(event) => {
                  openMenu(event, { kind: 'queueItem', taskId: task.id });
                }}
              >
                <span className="truncate flex-1 mr-2" title={task.file}>
                  {task.file.split(/[\\/]/).pop()}
                </span>
                <span className={`
                  px-2 py-0.5 rounded text-[10px] uppercase font-bold
                  ${task.status === 'completed' ? 'bg-green-900 text-green-300' : ''}
                  ${task.status === 'processing' ? 'bg-blue-900 text-blue-300' : ''}
                  ${task.status === 'failed' ? 'bg-red-900 text-red-300' : ''}
                  ${task.status === 'pending' ? 'bg-gray-700 text-gray-300' : ''}
                `}>
                  {t(`common.status.${task.status}`)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={startProcessing}
        disabled={isProcessing || queue.length === 0}
        className={`
          w-full py-2 rounded font-bold text-sm
          ${isProcessing ? 'bg-gray-700 text-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}
        `}
      >
        {isProcessing ? t('processor.processing') : t('processor.startProcessing')}
      </button>
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

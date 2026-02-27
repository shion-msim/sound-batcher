import { useEffect, useState } from 'react';
import { useHistoryStore } from './useHistoryStore';
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFileBrowserStore } from '../file-browser/useFileBrowserStore';
import { useProcessorStore } from '../processor/useProcessorStore';
import { ContextMenu } from '../context-menu/ContextMenu';
import { useContextMenu } from '../context-menu/useContextMenu';
import type { ContextMenuCommandId, ContextMenuItem } from '../context-menu/context-menu.types';

type HistoryContextTarget =
  | { kind: 'historyJob'; jobId: string }
  | { kind: 'historyResult'; jobId: string; resultIndex: number }
  | { kind: 'historyBlank' };

export function HistoryPanel() {
  const { jobs, loadHistory, isLoading, clearHistory, removeJobsByStatus } = useHistoryStore();
  const { navigateTo, setSelection } = useFileBrowserStore();
  const { addToQueue } = useProcessorStore();
  const [expandedJobs, setExpandedJobs] = useState<string[]>([]);
  const [copiedErrorKey, setCopiedErrorKey] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    loadHistory();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedJobs(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCopyErrorCode = async (error: string, key: string) => {
    const extractedCode = extractErrorCode(error);
    const toCopy = extractedCode ?? error;
    try {
      await navigator.clipboard.writeText(toCopy);
      setCopiedErrorKey(key);
      window.setTimeout(() => {
        setCopiedErrorKey((current) => (current === key ? null : current));
      }, 1200);
    } catch (copyError) {
      console.error('Failed to copy error code', copyError);
    }
  };

  const handleOpenFolderInFileBrowser = async (path: string) => {
    try {
      await navigateTo(path);
      setSelection([]);
    } catch (error) {
      console.error('Failed to open folder in file browser', error);
    }
  };

  const handleOpenFileInFileBrowser = async (filePath: string) => {
    const parentDirectory = getParentDirectory(filePath);
    if (!parentDirectory) {
      return;
    }

    try {
      await navigateTo(parentDirectory);
      setSelection([filePath]);
    } catch (error) {
      console.error('Failed to open file in file browser', error);
    }
  };

  const buildMenuItems = (target: HistoryContextTarget | null): ContextMenuItem[] => {
    if (!target) return [];
    if (target.kind === 'historyBlank') {
      return [
        { id: 'history.reload', label: '再読み込み' },
        {
          id: 'history.clearSuccessful',
          label: '成功ジョブを削除',
          enabled: jobs.some((job) => job.status === 'completed'),
        },
        {
          id: 'history.clearAll',
          label: '履歴を全削除',
          danger: true,
          separatorBefore: true,
          enabled: jobs.length > 0,
        },
      ];
    }

    if (target.kind === 'historyJob') {
      const job = jobs.find((item) => item.id === target.jobId);
      if (!job) return [];
      const isExpanded = expandedJobs.includes(job.id);
      return [
        { id: 'history.expandToggle', label: isExpanded ? '折りたたむ' : '展開する' },
        { id: 'history.requeueJob', label: 'このジョブを再キュー', enabled: job.inputFiles.length > 0 },
        { id: 'history.copyJobSummary', label: 'ジョブ情報をコピー', separatorBefore: true },
      ];
    }

    const job = jobs.find((item) => item.id === target.jobId);
    const result = job?.results[target.resultIndex];
    if (!job || !result) return [];
    return [
      { id: 'history.openOutputFolder', label: '出力フォルダを開く', enabled: Boolean(result.outputPath) },
      { id: 'history.openOutputFileInBrowser', label: '出力ファイルを選択', enabled: Boolean(result.outputPath) },
      { id: 'history.copyError', label: 'エラーコードをコピー', enabled: Boolean(result.error), separatorBefore: true },
      { id: 'history.copyPath', label: 'パスをコピー' },
    ];
  };

  const { menuState, menuItems, openMenu, closeMenu } = useContextMenu<HistoryContextTarget>({
    itemsBuilder: buildMenuItems,
  });

  const handleContextCommand = async (commandId: ContextMenuCommandId) => {
    const target = menuState.target;
    if (!target) return;

    if (target.kind === 'historyBlank') {
      if (commandId === 'history.reload') await loadHistory();
      if (commandId === 'history.clearSuccessful') await removeJobsByStatus(['completed']);
      if (commandId === 'history.clearAll') await clearHistory();
      return;
    }

    if (target.kind === 'historyJob') {
      const job = jobs.find((item) => item.id === target.jobId);
      if (!job) return;
      if (commandId === 'history.expandToggle') toggleExpand(job.id);
      if (commandId === 'history.requeueJob') addToQueue(job.inputFiles);
      if (commandId === 'history.copyJobSummary') {
        const summary = `${new Date(job.timestamp).toLocaleString()} / ${job.status} / ${job.inputFiles.length} files`;
        await navigator.clipboard.writeText(summary);
      }
      return;
    }

    const job = jobs.find((item) => item.id === target.jobId);
    const result = job?.results[target.resultIndex];
    if (!result) return;
    if (commandId === 'history.openOutputFolder') {
      const outputFolder = result.outputPath ? getParentDirectory(result.outputPath) : null;
      if (outputFolder) await handleOpenFolderInFileBrowser(outputFolder);
    }
    if (commandId === 'history.openOutputFileInBrowser' && result.outputPath) {
      await handleOpenFileInFileBrowser(result.outputPath);
    }
    if (commandId === 'history.copyError' && result.error) {
      await handleCopyErrorCode(result.error, `${target.jobId}-${target.resultIndex}`);
    }
    if (commandId === 'history.copyPath') {
      const toCopy = result.outputPath ?? result.file;
      await navigator.clipboard.writeText(toCopy);
    }
  };

  if (isLoading) return <div className="p-4 text-gray-100">{t('history.loading')}</div>;

  return (
    <div
      className="h-full overflow-y-auto hover-scroll bg-gray-900 text-gray-100 p-4"
      onContextMenu={(event) => {
        openMenu(event, { kind: 'historyBlank' });
      }}
    >
      <h2 className="text-lg font-bold mb-4">{t('history.title')}</h2>
      
      {jobs.length === 0 ? (
        <div className="text-gray-500 text-center mt-8">{t('history.noHistory')}</div>
      ) : (
        <div className="space-y-2">
          {jobs.map(job => (
            <div key={job.id} className="bg-gray-800 rounded overflow-hidden">
              <div 
                className="p-3 flex items-center cursor-pointer hover:bg-gray-700"
                onClick={() => toggleExpand(job.id)}
                onContextMenu={(event) => {
                  openMenu(event, { kind: 'historyJob', jobId: job.id });
                }}
              >
                <div className="mr-2">
                  {expandedJobs.includes(job.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                        {new Date(job.timestamp).toLocaleString()}
                    </span>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {t('history.filesProcessed', { count: job.inputFiles.length })}
                  </div>
                </div>
              </div>
              
              {expandedJobs.includes(job.id) && (
                <div className="bg-gray-900 p-2 border-t border-gray-700">
                  <ul className="space-y-1">
                    {job.results.map((result, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2 text-xs p-1 hover:bg-gray-800 rounded"
                        onContextMenu={(event) => {
                          openMenu(event, { kind: 'historyResult', jobId: job.id, resultIndex: idx });
                        }}
                      >
                        <StatusIcon status={result.status} />
                        <div className="flex-1 min-w-0">
                          <div className="truncate" title={result.file}>
                            {result.file.split(/[\\/]/).pop()}
                          </div>
                          {result.outputPath && (
                            <div className="truncate text-[10px] text-gray-400" title={result.outputPath}>
                              {result.outputPath.split(/[\\/]/).pop()}
                            </div>
                          )}
                        </div>
                        {(() => {
                          const outputPath = result.outputPath;
                          if (!outputPath) {
                            return null;
                          }
                          return (
                          <>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                const outputFolder = getParentDirectory(outputPath);
                                if (outputFolder) {
                                  void handleOpenFolderInFileBrowser(outputFolder);
                                }
                              }}
                              className="text-[10px] px-1.5 py-0.5 rounded border border-gray-600 text-gray-300 hover:bg-gray-700"
                              title={t('history.openOutputFolder', { defaultValue: 'Open output folder' })}
                            >
                              {t('history.openFolder', { defaultValue: 'Folder' })}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleOpenFileInFileBrowser(outputPath);
                              }}
                              className="text-[10px] px-1.5 py-0.5 rounded border border-gray-600 text-gray-300 hover:bg-gray-700"
                              title={t('history.openOutputFile', { defaultValue: 'Open output file' })}
                            >
                              {t('history.openFile', { defaultValue: 'File' })}
                            </button>
                          </>
                          );
                        })()}
                        {result.error && (
                          <>
                            <span className="text-red-400 text-[10px] truncate max-w-[160px]" title={result.error}>
                                {result.error}
                            </span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleCopyErrorCode(result.error as string, `${job.id}-${idx}`);
                              }}
                              className="text-[10px] px-1.5 py-0.5 rounded border border-gray-600 text-gray-300 hover:bg-gray-700"
                              title={t('history.copyErrorCode', { defaultValue: 'Copy error code' })}
                            >
                              {copiedErrorKey === `${job.id}-${idx}`
                                ? t('history.copied', { defaultValue: 'Copied' })
                                : t('history.copyErrorCode', { defaultValue: 'Copy code' })}
                            </button>
                          </>
                        )}
                      </li>
                    ))}
                    {job.results.length === 0 && job.status === 'processing' && (
                        <li className="text-xs text-gray-500 p-1">{t('history.processing')}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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

function extractErrorCode(error: string): string | null {
  const match = error.match(/code\s+(-?\d+)/i);
  return match?.[1] ?? null;
}

function getParentDirectory(path: string): string | null {
  const lastSlashIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  if (lastSlashIndex <= 0) {
    return null;
  }
  return path.slice(0, lastSlashIndex);
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const colors = {
    completed: 'bg-green-900 text-green-300',
    failed: 'bg-red-900 text-red-300',
    partial: 'bg-yellow-900 text-yellow-300',
    processing: 'bg-blue-900 text-blue-300',
  };

  const labels: Record<string, string> = {
    pending: t('common.status.pending'),
    processing: t('common.status.processing'),
    completed: t('common.status.completed'),
    failed: t('common.status.failed'),
    partial: t('common.status.partial'),
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${colors[status as keyof typeof colors] || 'bg-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
    if (status === 'completed') return <CheckCircle size={12} className="text-green-400" />;
    if (status === 'failed') return <XCircle size={12} className="text-red-400" />;
    return <Clock size={12} className="text-gray-400" />;
}

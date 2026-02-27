import { useProcessorStore } from './useProcessorStore';
import { useFileBrowserStore } from '../file-browser/useFileBrowserStore';
import { useSettingsStore } from '../settings/useSettingsStore';
import { useTranslation } from 'react-i18next';

export function ProcessorPanel() {
  const { queue, isProcessing, addToQueue, startProcessing, clearQueue } = useProcessorStore();
  const { files, selectedFiles } = useFileBrowserStore();
  const { renameOnly, setRenameOnly } = useSettingsStore();
  const { t } = useTranslation();

  const handleAddSelected = () => {
    const filesToAdd = files
        .filter(f => selectedFiles.includes(f.path) && !f.isDirectory)
        .map(f => f.path);
    
    addToQueue(filesToAdd);
  };

  const hasSelection = selectedFiles.length > 0;

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

      <div className="flex-1 overflow-y-auto hover-scroll mb-4 border border-gray-800 rounded bg-gray-950 p-2">
        {queue.length === 0 ? (
          <div className="text-gray-500 text-sm text-center mt-4">{t('processor.queueEmpty')}</div>
        ) : (
          <ul className="space-y-2">
            {queue.map(task => (
              <li key={task.id} className="text-xs p-2 bg-gray-900 rounded flex justify-between items-center">
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
    </div>
  );
}

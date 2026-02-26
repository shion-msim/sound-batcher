import { useEffect, useState } from 'react';
import { useHistoryStore } from './useHistoryStore';
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function HistoryPanel() {
  const { jobs, loadHistory, isLoading } = useHistoryStore();
  const [expandedJobs, setExpandedJobs] = useState<string[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    loadHistory();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedJobs(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  if (isLoading) return <div className="p-4 text-white">{t('history.loading')}</div>;

  return (
    <div className="h-full overflow-y-auto bg-gray-900 text-white p-4">
      <h2 className="text-lg font-bold mb-4">{t('history.title')}</h2>
      
      {jobs.length === 0 ? (
        <div className="text-gray-500 text-center mt-8">{t('history.noHistory')}</div>
      ) : (
        <div className="space-y-2">
          {jobs.map(job => (
            <div key={job.id} className="bg-gray-800 rounded overflow-hidden">
              <div 
                className="p-3 flex items-center cursor-pointer hover:bg-gray-750"
                onClick={() => toggleExpand(job.id)}
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
                      <li key={idx} className="flex items-center text-xs p-1 hover:bg-gray-800 rounded">
                        <StatusIcon status={result.status} />
                        <span className="ml-2 truncate flex-1" title={result.file}>
                          {result.file.split(/[\\/]/).pop()}
                        </span>
                        {result.error && (
                            <span className="text-red-400 ml-2 text-[10px] truncate max-w-[100px]" title={result.error}>
                                {result.error}
                            </span>
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
    </div>
  );
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

import { useState, type ReactNode } from 'react';
import { Layers, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProcessorPanel } from '../processor/ProcessorPanel';
import { HistoryPanel } from '../history/HistoryPanel';

type InspectorTab = 'processor' | 'history';

export function InspectorPanel() {
  const [activeTab, setActiveTab] = useState<InspectorTab>('processor');
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex border-b border-gray-800 bg-gray-950">
        <TabButton
          label={t('tabs.processor')}
          icon={<Layers size={14} />}
          isActive={activeTab === 'processor'}
          onClick={() => setActiveTab('processor')}
        />
        <TabButton
          label={t('tabs.history')}
          icon={<History size={14} />}
          isActive={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
        />
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className={`absolute inset-0 ${activeTab === 'processor' ? 'block' : 'hidden'}`}>
          <ProcessorPanel />
        </div>
        <div className={`absolute inset-0 ${activeTab === 'history' ? 'block' : 'hidden'}`}>
          <HistoryPanel />
        </div>
      </div>
    </div>
  );
}

interface TabButtonProps {
  label: string;
  icon: ReactNode;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ label, icon, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-xs font-bold uppercase flex items-center justify-center gap-2 ${
        isActive
          ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-900'
          : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

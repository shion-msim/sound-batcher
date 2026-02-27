import { useEffect, useState, type ReactNode } from 'react';
import { Folder, FileAudio, Settings as SettingsIcon, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SettingsPanel, type SettingsSection } from './SettingsPanel';

type SettingsTab = SettingsSection;

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('output');

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6" onClick={onClose}>
      <div
        className="flex h-[min(82vh,720px)] w-[min(920px,100%)] flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-100">{t('tabs.settings')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-700 bg-gray-900 p-1.5 text-gray-300 transition-colors hover:bg-gray-800"
            aria-label={t('tabs.settings')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex border-b border-gray-800 bg-gray-950">
          <TabButton
            label={t('settings.section.output')}
            icon={<Folder size={14} />}
            active={activeTab === 'output'}
            onClick={() => setActiveTab('output')}
          />
          <TabButton
            label={t('settings.section.audio')}
            icon={<FileAudio size={14} />}
            active={activeTab === 'audio'}
            onClick={() => setActiveTab('audio')}
          />
          <TabButton
            label={t('settings.section.app')}
            icon={<SettingsIcon size={14} />}
            active={activeTab === 'app'}
            onClick={() => setActiveTab('app')}
          />
        </div>

        <div className="min-h-0 flex-1">
          <SettingsPanel visibleSections={[activeTab]} showSectionHeaders={false} />
        </div>
      </div>
    </div>
  );
}

interface TabButtonProps {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}

function TabButton({ label, icon, active, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold ${
        active ? 'border-blue-400 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-200'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

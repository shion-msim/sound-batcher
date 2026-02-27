import { BookOpenText, Settings as SettingsIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TopToolbarProps {
  onOpenManual: () => void;
  onOpenSettings: () => void;
}

export function TopToolbar({ onOpenManual, onOpenSettings }: TopToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full items-center justify-between px-3">
      <div className="text-sm font-semibold tracking-wide text-gray-200">Sound Batcher</div>

      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenManual}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-700 bg-gray-900 text-sm text-gray-200 transition-colors hover:bg-gray-800"
          title={t('tabs.manual')}
          aria-label={t('tabs.manual')}
        >
          <BookOpenText size={15} />
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-700 bg-gray-900 text-sm text-gray-200 transition-colors hover:bg-gray-800"
          title={t('tabs.settings')}
          aria-label={t('tabs.settings')}
        >
          <SettingsIcon size={15} />
        </button>
      </div>
    </div>
  );
}

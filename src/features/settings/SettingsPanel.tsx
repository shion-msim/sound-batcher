import { useSettingsStore } from './useSettingsStore';
import { Folder, FileAudio, Settings as SettingsIcon, Bell, Moon, Sun, Monitor, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../../i18n/languages';

export function SettingsPanel() {
  const settings = useSettingsStore();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-300">
      <div className="p-4 space-y-8 overflow-y-auto flex-1">
        
        {/* Output Settings */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-blue-400 border-b border-gray-800 pb-2">
            <Folder size={16} />
            <h3 className="font-bold text-xs uppercase tracking-wider">{t('settings.section.output')}</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-500">{t('settings.outputLocation')}</label>
              <select
                value={settings.outputMode}
                onChange={(e) => settings.setOutputMode(e.target.value as any)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none"
              >
                <option value="same-folder">{t('settings.sameAsInput')}</option>
                <option value="custom-folder">{t('settings.customFolder')}</option>
              </select>
            </div>

            {settings.outputMode === 'custom-folder' && (
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500">{t('settings.customPath')}</label>
                <input
                  type="text"
                  value={settings.customOutputPath || ''}
                  onChange={(e) => settings.setCustomOutputPath(e.target.value)}
                  placeholder={t('settings.placeholders.outputPath')}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500">{t('settings.prefix')}</label>
                <input
                  type="text"
                  value={settings.filenamePrefix}
                  onChange={(e) => settings.setFilenamePrefix(e.target.value)}
                  placeholder={t('settings.placeholders.prefixNone')}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500">{t('settings.suffix')}</label>
                <input
                  type="text"
                  value={settings.filenameSuffix}
                  onChange={(e) => settings.setFilenameSuffix(e.target.value)}
                  placeholder={t('settings.placeholders.suffixDefault')}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-gray-500">{t('settings.whenFileExists')}</label>
              <select
                value={settings.overwriteMode}
                onChange={(e) => settings.setOverwriteMode(e.target.value as any)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none"
              >
                <option value="rename">{t('settings.renameOverwrite')}</option>
                <option value="overwrite">{t('settings.overwrite')}</option>
                <option value="skip">{t('settings.skip')}</option>
              </select>
            </div>
          </div>
        </section>

        {/* Audio Processing */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-green-400 border-b border-gray-800 pb-2">
            <FileAudio size={16} />
            <h3 className="font-bold text-xs uppercase tracking-wider">{t('settings.section.audio')}</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-500">{t('settings.outputFormat')}</label>
              <select
                value={settings.format}
                onChange={(e) => settings.setFormat(e.target.value as any)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none"
              >
                <option value="wav">{t('settings.wavQuality')}</option>
                <option value="mp3">MP3</option>
                <option value="aac">AAC</option>
                <option value="ogg">Ogg Vorbis</option>
              </select>
            </div>

            <div className="bg-gray-800/50 rounded p-3 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">{t('settings.loudnessNormalization')}</label>
                <input
                  type="checkbox"
                  checked={settings.loudness.enabled}
                  onChange={(e) => settings.setLoudnessSettings({ enabled: e.target.checked })}
                  className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-offset-gray-900"
                />
              </div>

              {settings.loudness.enabled && (
                <div className="space-y-3 pl-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">{t('settings.integrated')}</span>
                      <span className="text-gray-300">{settings.loudness.integrated}</span>
                    </div>
                    <input
                      type="range"
                      min="-70"
                      max="-5"
                      step="0.5"
                      value={settings.loudness.integrated}
                      onChange={(e) => settings.setLoudnessSettings({ integrated: parseFloat(e.target.value) })}
                      className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">{t('settings.truePeak')}</span>
                      <span className="text-gray-300">{settings.loudness.truePeak}</span>
                    </div>
                    <input
                      type="range"
                      min="-9"
                      max="0"
                      step="0.1"
                      value={settings.loudness.truePeak}
                      onChange={(e) => settings.setLoudnessSettings({ truePeak: parseFloat(e.target.value) })}
                      className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">{t('settings.lra')}</span>
                      <span className="text-gray-300">{settings.loudness.lra}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="0.5"
                      value={settings.loudness.lra}
                      onChange={(e) => settings.setLoudnessSettings({ lra: parseFloat(e.target.value) })}
                      className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Application Settings */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-purple-400 border-b border-gray-800 pb-2">
            <SettingsIcon size={16} />
            <h3 className="font-bold text-xs uppercase tracking-wider">{t('settings.section.app')}</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-500">{t('settings.language')}</label>
              <select
                value={settings.language}
                onChange={(e) => settings.setLanguage(e.target.value as LanguageCode)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none"
              >
                {SUPPORTED_LANGUAGES.map((code) => (
                  <option key={code} value={code}>
                    {t(`settings.languageNames.${code}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-gray-500">{t('settings.theme')}</label>
              <div className="flex bg-gray-800 p-1 rounded border border-gray-700">
                {(['light', 'system', 'dark'] as const).map((themeOption) => (
                  <button
                    key={themeOption}
                    onClick={() => settings.setTheme(themeOption)}
                    className={`flex-1 flex items-center justify-center py-1 rounded text-xs gap-1 ${
                      settings.theme === themeOption ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {themeOption === 'light' && <Sun size={12} />}
                    {themeOption === 'dark' && <Moon size={12} />}
                    {themeOption === 'system' && <Monitor size={12} />}
                    {themeOption === 'light' && t('settings.themeValues.light')}
                    {themeOption === 'system' && t('settings.themeValues.system')}
                    {themeOption === 'dark' && t('settings.themeValues.dark')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-gray-500" />
                <span className="text-sm text-gray-300">{t('settings.notifyOnComplete')}</span>
              </div>
              <input
                type="checkbox"
                checked={settings.notifyOnComplete}
                onChange={(e) => settings.setNotifyOnComplete(e.target.checked)}
                className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-offset-gray-900"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">{t('settings.maxConcurrentJobs')}</span>
                <span className="text-gray-300">{settings.maxConcurrentJobs}</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={settings.maxConcurrentJobs}
                onChange={(e) => settings.setMaxConcurrentJobs(parseInt(e.target.value))}
                className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                <AlertCircle size={10} /> {t('settings.higherValuesWarning')}
              </p>
            </div>
          </div>
        </section>

        <div className="pt-4 border-t border-gray-800">
            <button 
                onClick={settings.resetToDefaults}
                className="w-full py-2 text-xs text-red-400 hover:bg-red-900/20 rounded transition-colors"
            >
                {t('settings.resetToDefaults')}
            </button>
        </div>
      </div>
    </div>
  );
}

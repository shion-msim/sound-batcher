import { useEffect } from 'react';
import { useSettingsStore } from '../settings/useSettingsStore';
import { useTranslation } from 'react-i18next';

export function useApplyAppPreferences(): void {
  const theme = useSettingsStore((state) => state.theme);
  const language = useSettingsStore((state) => state.language);
  const { i18n } = useTranslation();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [i18n, language]);
}

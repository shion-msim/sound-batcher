import { useEffect, useLayoutEffect } from 'react';
import { useSettingsStore } from '../settings/useSettingsStore';
import type { Theme } from '../settings/settings.types';
import { useTranslation } from 'react-i18next';

function getResolvedTheme(theme: Theme, prefersDark: boolean): 'light' | 'dark' {
  if (theme === 'system') {
    return prefersDark ? 'dark' : 'light';
  }

  return theme;
}

export function useApplyAppPreferences(): void {
  const theme = useSettingsStore((state) => state.theme);
  const language = useSettingsStore((state) => state.language);
  const { i18n } = useTranslation();

  useLayoutEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const resolvedTheme = getResolvedTheme(theme, mediaQuery.matches);
      root.classList.remove('light', 'dark');
      root.classList.add(resolvedTheme);
      root.style.colorScheme = resolvedTheme;
    };

    applyTheme();

    if (theme !== 'system') {
      return;
    }

    const onSystemThemeChange = () => {
      applyTheme();
    };

    mediaQuery.addEventListener('change', onSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', onSystemThemeChange);
    };
  }, [theme]);

  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [i18n, language]);
}

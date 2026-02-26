export const SUPPORTED_LANGUAGES = ['ja', 'en', 'ko', 'zh-CN', 'zh-TW', 'fr', 'it', 'de', 'es'] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: LanguageCode = 'ja';

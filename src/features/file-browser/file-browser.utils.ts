const AUDIO_EXTENSIONS = new Set([
  'wav',
  'mp3',
  'flac',
  'aac',
  'm4a',
  'ogg',
  'opus',
  'wma',
  'aif',
  'aiff',
]);

const getExtension = (name: string): string => {
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === name.length - 1) {
    return '';
  }
  return name.slice(dotIndex + 1).toLowerCase();
};

export const isVisibleInFileBrowser = (name: string, isDirectory: boolean): boolean => {
  if (isDirectory) return true;
  return AUDIO_EXTENSIONS.has(getExtension(name));
};

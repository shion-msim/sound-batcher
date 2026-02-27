import { useEffect, useMemo, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { usePlayerStore } from './usePlayerStore';
import { convertFileSrc } from '@tauri-apps/api/core';
import { readFile } from '@tauri-apps/plugin-fs';
import { useTranslation } from 'react-i18next';
import { useFileBrowserStore } from '../file-browser/useFileBrowserStore';

export function WaveformPlayer() {
  const { selectedFiles } = useFileBrowserStore();
  const { currentFile, isPlaying, volume, setCurrentFile, play, togglePlay } = usePlayerStore();
  const { t } = useTranslation();

  const selectedAudioFiles = useMemo(
    () => selectedFiles.filter((path) => isAudioPath(path)),
    [selectedFiles],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') {
        return;
      }
      e.preventDefault();
      if (!currentFile && selectedAudioFiles.length > 0) {
        setCurrentFile(selectedAudioFiles[0]);
        togglePlay();
        return;
      }
      if (!currentFile) {
        return;
      }
      togglePlay();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentFile, selectedAudioFiles, setCurrentFile, togglePlay]);

  useEffect(() => {
    if (selectedAudioFiles.length === 0) {
      setCurrentFile(null);
      return;
    }
    if (!currentFile || !selectedAudioFiles.includes(currentFile)) {
      setCurrentFile(selectedAudioFiles[0]);
    }
  }, [currentFile, selectedAudioFiles, setCurrentFile]);

  return (
    <div className="w-full h-full overflow-y-auto bg-gray-950 p-4">
      {selectedAudioFiles.length > 0 ? (
        <div className={`w-full mx-auto grid gap-4 ${selectedAudioFiles.length === 1 ? 'max-w-5xl grid-cols-1' : 'grid-cols-1'}`}>
          {selectedAudioFiles.map((filePath) => (
            <WaveformCard
              key={filePath}
              filePath={filePath}
              volume={volume}
              isActive={currentFile === filePath}
              isPlaying={isPlaying && currentFile === filePath}
              onActivate={() => play(filePath)}
              onTogglePlay={togglePlay}
              playLabel={t('player.play')}
              pauseLabel={t('player.pause')}
            />
          ))}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-gray-500">
          {t('player.selectFile')}
        </div>
      )}
    </div>
  );
}

interface WaveformCardProps {
  filePath: string;
  volume: number;
  isActive: boolean;
  isPlaying: boolean;
  onActivate: () => void;
  onTogglePlay: () => void;
  playLabel: string;
  pauseLabel: string;
}

function WaveformCard({
  filePath,
  volume,
  isActive,
  isPlaying,
  onActivate,
  onTogglePlay,
  playLabel,
  pauseLabel,
}: WaveformCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || wavesurferRef.current) {
      return;
    }

    const instance = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4a90e2',
      progressColor: '#1e3a8a',
      cursorColor: '#ffffff',
      height: 120,
      normalize: true,
      // Fit long audio into available width instead of enabling horizontal scrolling.
      minPxPerSec: 0,
      hideScrollbar: true,
      interact: true,
    });
    wavesurferRef.current = instance;

    return () => {
      instance.destroy();
      wavesurferRef.current = null;
    };
  }, []);

  useEffect(() => {
    const loadAudio = async () => {
      const wavesurfer = wavesurferRef.current;
      if (!wavesurfer) {
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        try {
          const url = convertFileSrc(filePath);
          await wavesurfer.load(url);
        } catch {
          // Some environments fail to decode via convertFileSrc; fallback to direct file bytes.
          const bytes = await readFile(filePath);
          const blob = new Blob([bytes], { type: mimeTypeFromPath(filePath) });
          await wavesurfer.loadBlob(blob);
        }
        setIsLoading(false);

        if (isActive && isPlaying) {
          await wavesurfer.play();
        }
      } catch (loadError) {
        console.error('Failed to load audio', loadError);
        setIsLoading(false);
        setError('Failed to load waveform');
      }
    };
    void loadAudio();
  }, [filePath, isActive, isPlaying]);

  useEffect(() => {
    const wavesurfer = wavesurferRef.current;
    if (!wavesurfer) {
      return;
    }
    wavesurfer.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    const wavesurfer = wavesurferRef.current;
    if (!wavesurfer) {
      return;
    }
    if (!isActive) {
      wavesurfer.pause();
      return;
    }
    if (isPlaying) {
      void wavesurfer.play();
    } else {
      wavesurfer.pause();
    }
  }, [isActive, isPlaying]);

  const buttonLabel = isActive && isPlaying ? pauseLabel : playLabel;

  return (
    <section
      className={`rounded border p-3 ${isActive ? 'border-blue-500 bg-blue-950/20' : 'border-gray-800 bg-gray-900/40'}`}
    >
      <div className="mb-2 text-xs text-gray-400 truncate" title={filePath}>
        {filePath}
      </div>
      <div ref={containerRef} className={`w-full ${isLoading ? 'opacity-40' : 'opacity-100'}`} />
      {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
      <div className="mt-3">
        <button
          onClick={() => {
            if (!isActive) {
              onActivate();
              return;
            }
            onTogglePlay();
          }}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm font-medium transition-colors"
        >
          {buttonLabel}
        </button>
      </div>
    </section>
  );
}

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

const isAudioPath = (path: string): boolean => {
  const filename = path.split(/[\\/]/).pop() ?? path;
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === filename.length - 1) {
    return false;
  }
  const ext = filename.slice(dotIndex + 1).toLowerCase();
  return AUDIO_EXTENSIONS.has(ext);
};

const mimeTypeFromPath = (path: string): string => {
  const filename = path.split(/[\\/]/).pop() ?? path;
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === filename.length - 1) {
    return 'audio/*';
  }
  const ext = filename.slice(dotIndex + 1).toLowerCase();
  switch (ext) {
    case 'wav':
      return 'audio/wav';
    case 'mp3':
      return 'audio/mpeg';
    case 'flac':
      return 'audio/flac';
    case 'aac':
      return 'audio/aac';
    case 'm4a':
      return 'audio/mp4';
    case 'ogg':
      return 'audio/ogg';
    case 'opus':
      return 'audio/opus';
    case 'wma':
      return 'audio/x-ms-wma';
    case 'aif':
    case 'aiff':
      return 'audio/aiff';
    default:
      return 'audio/*';
  }
};

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
        <div className="w-full mx-auto grid gap-4 grid-cols-1">
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
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [themeVersion, setThemeVersion] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setThemeVersion((current) => current + 1);
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current || wavesurferRef.current) {
      return;
    }

    const { waveColor, progressColor, cursorColor } = getWaveformThemeColors();
    const instance = WaveSurfer.create({
      container: containerRef.current,
      waveColor,
      progressColor,
      cursorColor,
      height: 120,
      normalize: true,
      // Fit long audio into available width instead of enabling horizontal scrolling.
      minPxPerSec: 0,
      fillParent: true,
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
    const wavesurfer = wavesurferRef.current;
    if (!wavesurfer) {
      return;
    }

    const { waveColor, progressColor, cursorColor } = getWaveformThemeColors();
    wavesurfer.setOptions({ waveColor, progressColor, cursorColor });
  }, [themeVersion]);

  useEffect(() => {
    const loadAudio = async () => {
      const wavesurfer = wavesurferRef.current;
      if (!wavesurfer) {
        return;
      }

      setIsLoading(true);
      setError(null);
      setDurationSeconds(null);
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
        setDurationSeconds(wavesurfer.getDuration());
        fitWaveformToContainer(wavesurfer, containerRef.current);

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
    const container = containerRef.current;
    if (!wavesurfer || !container) {
      return;
    }

    const observer = new ResizeObserver(() => {
      fitWaveformToContainer(wavesurfer, container);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-gray-400">
        <span className="truncate" title={filePath}>
          {filePath}
        </span>
        <span className="shrink-0 font-mono tabular-nums">
          {formatDuration(durationSeconds)}
        </span>
      </div>
      <div className="relative">
        <div
          ref={containerRef}
          className={`w-full h-[120px] transition-opacity ${isLoading ? 'opacity-40' : 'opacity-100'}`}
        />
        {isLoading && !error && (
          <div className="pointer-events-none absolute inset-0 rounded bg-gray-900/70 p-2">
            <WaveformLoadingSkeleton />
          </div>
        )}
      </div>
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

const LOADING_WAVE_BARS = [
  24, 42, 34, 58, 46, 68, 40, 52, 30, 62, 44, 56, 36, 66, 38, 50, 28, 60, 42, 54, 32, 64, 40, 48,
  30, 58, 44, 52, 34, 62, 38, 54, 28, 60, 40, 56,
];

function WaveformLoadingSkeleton() {
  return (
    <div className="flex h-full items-center justify-center gap-1 overflow-hidden">
      {LOADING_WAVE_BARS.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className="w-1.5 rounded-full bg-blue-300/70 animate-pulse"
          style={{
            height: `${height}%`,
            animationDelay: `${index * 45}ms`,
            animationDuration: '1300ms',
          }}
        />
      ))}
    </div>
  );
}

function formatDuration(seconds: number | null): string {
  if (!Number.isFinite(seconds) || seconds === null || seconds < 0) {
    return '--:--.---';
  }

  const totalMilliseconds = Math.floor(seconds * 1000);
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const milliseconds = totalMilliseconds % 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
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

function getWaveformThemeColors(): { waveColor: string; progressColor: string; cursorColor: string } {
  const styles = window.getComputedStyle(document.documentElement);
  return {
    waveColor: styles.getPropertyValue('--color-wave').trim() || '#60a5fa',
    progressColor: styles.getPropertyValue('--color-wave-progress').trim() || '#2563eb',
    cursorColor: styles.getPropertyValue('--color-wave-cursor').trim() || '#f3f4f6',
  };
}

function fitWaveformToContainer(wavesurfer: WaveSurfer, container: HTMLElement | null): void {
  if (!container) {
    return;
  }
  const duration = wavesurfer.getDuration();
  if (!Number.isFinite(duration) || duration <= 0) {
    return;
  }
  const width = container.clientWidth;
  if (!Number.isFinite(width) || width <= 0) {
    return;
  }
  const minPxPerSec = width / duration;
  wavesurfer.setOptions({
    minPxPerSec,
    hideScrollbar: true,
  });
}

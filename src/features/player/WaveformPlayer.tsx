import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { usePlayerStore } from './usePlayerStore';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';

export function WaveformPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const { currentFile, isPlaying, volume, togglePlay, pause } = usePlayerStore();
  const { t } = useTranslation();

  useEffect(() => {
    if (!containerRef.current) return;

    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4a90e2',
      progressColor: '#1e3a8a',
      cursorColor: '#ffffff',
      height: 200,
      normalize: true,
      minPxPerSec: 50,
      interact: true,
    });

    wavesurferRef.current.on('finish', () => {
        pause();
    });

    wavesurferRef.current.on('click', () => {
        // Optional: toggle play on click or just seek
    });

    return () => {
      wavesurferRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    const loadAudio = async () => {
        if (!currentFile || !wavesurferRef.current) return;
        
        try {
            const url = convertFileSrc(currentFile);
            await wavesurferRef.current.load(url);
            if (isPlaying) {
                wavesurferRef.current.play();
            }
        } catch (e) {
            console.error('Failed to load audio', e);
        }
    };
    loadAudio();
  }, [currentFile]);

  useEffect(() => {
    if (!wavesurferRef.current) return;
    if (isPlaying) {
      wavesurferRef.current.play();
    } else {
      wavesurferRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
      if (wavesurferRef.current) {
          wavesurferRef.current.setVolume(volume);
      }
  }, [volume]);

  // Keyboard shortcuts
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.code === 'Space') {
              e.preventDefault();
              togglePlay();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-950 p-4">
      {currentFile ? (
          <>
            <div className="w-full mb-4 text-center text-gray-400 truncate text-sm">
                {currentFile}
            </div>
            <div ref={containerRef} className="w-full" />
            <div className="mt-8 flex gap-4">
                <button onClick={togglePlay} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition-colors">
                    {isPlaying ? t('player.pause') : t('player.play')}
                </button>
            </div>
          </>
      ) : (
          <div className="text-gray-500">{t('player.selectFile')}</div>
      )}
    </div>
  );
}

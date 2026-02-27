import { create } from 'zustand';

interface PlayerState {
  currentFile: string | null;
  isPlaying: boolean;
  volume: number;
  setCurrentFile: (file: string | null) => void;
  play: (file: string) => void;
  pause: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  togglePlay: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentFile: null,
  isPlaying: false,
  volume: 1,
  setCurrentFile: (file) => set((state) => ({ currentFile: file, isPlaying: file ? state.isPlaying : false })),
  play: (file) => set({ currentFile: file, isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => set({ isPlaying: false, currentFile: null }),
  setVolume: (volume) => set({ volume }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
}));

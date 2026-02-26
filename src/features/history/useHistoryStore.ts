import { create } from 'zustand';
import { historyStore } from '../../lib/store';

export interface BatchJob {
  id: string;
  timestamp: number;
  inputFiles: string[];
  status: 'completed' | 'failed' | 'partial' | 'processing';
  results: { file: string; status: string; error?: string }[];
}

interface HistoryState {
  jobs: BatchJob[];
  isLoading: boolean;
  addJob: (job: BatchJob) => Promise<void>;
  updateJob: (id: string, updates: Partial<BatchJob>) => Promise<void>;
  loadHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  jobs: [],
  isLoading: false,
  
  loadHistory: async () => {
    set({ isLoading: true });
    try {
      const jobs = await historyStore.get<BatchJob[]>('jobs');
      if (jobs) {
        set({ jobs });
      }
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      set({ isLoading: false });
    }
  },

  addJob: async (job) => {
    const { jobs } = get();
    let newJobs = [job, ...jobs];
    
    // Limit to 50
    if (newJobs.length > 50) {
      newJobs = newJobs.slice(0, 50);
    }
    
    set({ jobs: newJobs });
    await historyStore.set('jobs', newJobs);
    await historyStore.save();
  },

  updateJob: async (id, updates) => {
    const { jobs } = get();
    const newJobs = jobs.map(j => j.id === id ? { ...j, ...updates } : j);
    set({ jobs: newJobs });
    await historyStore.set('jobs', newJobs);
    await historyStore.save();
  },

  clearHistory: async () => {
    set({ jobs: [] });
    await historyStore.set('jobs', []);
    await historyStore.save();
  }
}));

import { LazyStore } from '@tauri-apps/plugin-store';

export const settingsStore = new LazyStore('settings.json');
export const historyStore = new LazyStore('history.json');

// Initialize stores
export async function initStores() {
  await settingsStore.save(); // Ensure file exists
  await historyStore.save();
}

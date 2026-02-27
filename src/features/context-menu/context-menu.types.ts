export type ContextMenuPanel = 'fileBrowser' | 'waveformPlayer' | 'processor' | 'history';

export type ContextMenuCommandId =
  | 'file.play'
  | 'file.addToQueue'
  | 'file.addSelectedToQueue'
  | 'file.copyPath'
  | 'file.revealInExplorer'
  | 'folder.open'
  | 'folder.pin'
  | 'folder.unpin'
  | 'folder.copyPath'
  | 'folder.addAudioFilesToQueue'
  | 'folder.openInExplorer'
  | 'folder.openInNewTab'
  | 'browser.refresh'
  | 'browser.back'
  | 'browser.forward'
  | 'browser.up'
  | 'browser.pinCurrentFolder'
  | 'tab.pin'
  | 'tab.unpin'
  | 'tab.close'
  | 'tab.closeOthers'
  | 'queue.remove'
  | 'queue.prioritize'
  | 'queue.retry'
  | 'queue.dedupe'
  | 'queue.removeCompleted'
  | 'queue.removeFailed'
  | 'queue.clear'
  | 'history.expandToggle'
  | 'history.requeueJob'
  | 'history.copyJobSummary'
  | 'history.copyError'
  | 'history.openOutputFolder'
  | 'history.openOutputFileInBrowser'
  | 'history.copyPath'
  | 'history.reload'
  | 'history.clearSuccessful'
  | 'history.clearAll'
  | 'player.togglePlay'
  | 'player.showInBrowser'
  | 'player.copyPath'
  | 'player.copyDuration'
  | 'player.stopAll'
  | 'future.player.seekHere'
  | 'future.player.zoomReset';

export interface ContextMenuItem {
  id: ContextMenuCommandId;
  label: string;
  enabled?: boolean;
  danger?: boolean;
  separatorBefore?: boolean;
  shortcutHint?: string;
  comingSoon?: boolean;
}

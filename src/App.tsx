import { useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { FileBrowser } from './features/file-browser/FileBrowser';
import { WaveformPlayer } from './features/player/WaveformPlayer';
import { InspectorPanel } from './features/app/InspectorPanel';
import { TopToolbar } from './features/app/TopToolbar';
import { ManualModal } from './features/app/ManualModal';
import { SettingsModal } from './features/settings/SettingsModal';
import { useApplyAppPreferences } from './features/app/useApplyAppPreferences';

function App() {
  const [manualOpen, setManualOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useApplyAppPreferences();

  return (
    <>
      <AppLayout
        toolbar={<TopToolbar onOpenManual={() => setManualOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />}
        sidebar={<FileBrowser />}
        main={<WaveformPlayer />}
        inspector={<InspectorPanel />}
      />
      <ManualModal open={manualOpen} onClose={() => setManualOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

export default App;

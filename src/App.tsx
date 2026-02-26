import { AppLayout } from './components/layout/AppLayout';
import { FileBrowser } from './features/file-browser/FileBrowser';
import { WaveformPlayer } from './features/player/WaveformPlayer';
import { InspectorPanel } from './features/app/InspectorPanel';
import { useApplyAppPreferences } from './features/app/useApplyAppPreferences';

function App() {
  useApplyAppPreferences();

  return (
    <AppLayout
      sidebar={<FileBrowser />}
      main={<WaveformPlayer />}
      inspector={<InspectorPanel />}
    />
  );
}

export default App;

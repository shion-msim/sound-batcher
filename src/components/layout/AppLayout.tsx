import { ReactNode } from 'react';

interface AppLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
  inspector: ReactNode;
}

export function AppLayout({ sidebar, main, inspector }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900 text-white">
      <aside className="w-64 border-r border-gray-800 bg-gray-900/50 flex flex-col">
        {sidebar}
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden relative bg-gray-950">
        {main}
      </main>
      <aside className="w-80 border-l border-border bg-gray-900/50 flex flex-col">
        {inspector}
      </aside>
    </div>
  );
}

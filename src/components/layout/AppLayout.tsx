import { ReactNode } from 'react';

interface AppLayoutProps {
  toolbar: ReactNode;
  sidebar: ReactNode;
  main: ReactNode;
  inspector: ReactNode;
}

export function AppLayout({ toolbar, sidebar, main, inspector }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-gray-900 text-white">
      <header className="h-12 border-b border-gray-800 bg-gray-950/90">{toolbar}</header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="w-64 min-w-52 max-w-[55vw] shrink-0 resize-x overflow-auto hover-scroll border-r border-gray-800 bg-gray-900/50 flex flex-col">
          {sidebar}
        </aside>
        <main className="flex-1 flex flex-col overflow-hidden relative bg-gray-950">
          {main}
        </main>
        <aside className="w-80 border-l border-border bg-gray-900/50 flex flex-col">
          {inspector}
        </aside>
      </div>
    </div>
  );
}

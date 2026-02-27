import { MouseEvent as ReactMouseEvent, ReactNode, useEffect, useRef, useState } from 'react';

interface AppLayoutProps {
  toolbar: ReactNode;
  sidebar: ReactNode;
  main: ReactNode;
  inspector: ReactNode;
}

export function AppLayout({ toolbar, sidebar, main, inspector }: AppLayoutProps) {
  const MIN_SIDEBAR_WIDTH = 208;
  const DEFAULT_SIDEBAR_WIDTH = 256;
  const MAX_SIDEBAR_WIDTH_RATIO = 0.55;
  const MIN_INSPECTOR_WIDTH = 256;
  const DEFAULT_INSPECTOR_WIDTH = 320;
  const MAX_INSPECTOR_WIDTH_RATIO = 0.55;

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [inspectorWidth, setInspectorWidth] = useState(DEFAULT_INSPECTOR_WIDTH);
  const isDraggingSidebarRef = useRef(false);
  const isDraggingInspectorRef = useRef(false);
  const sidebarDragStartXRef = useRef(0);
  const sidebarDragStartWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);
  const inspectorDragStartXRef = useRef(0);
  const inspectorDragStartWidthRef = useRef(DEFAULT_INSPECTOR_WIDTH);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isDraggingSidebarRef.current) {
        const delta = event.clientX - sidebarDragStartXRef.current;
        const maxWidth = Math.floor(window.innerWidth * MAX_SIDEBAR_WIDTH_RATIO);
        const nextWidth = Math.min(
          maxWidth,
          Math.max(MIN_SIDEBAR_WIDTH, sidebarDragStartWidthRef.current + delta),
        );
        setSidebarWidth(nextWidth);
      }

      if (!isDraggingInspectorRef.current) {
        return;
      }

      const delta = inspectorDragStartXRef.current - event.clientX;
      const maxWidth = Math.floor(window.innerWidth * MAX_INSPECTOR_WIDTH_RATIO);
      const nextWidth = Math.min(
        maxWidth,
        Math.max(MIN_INSPECTOR_WIDTH, inspectorDragStartWidthRef.current + delta),
      );
      setInspectorWidth(nextWidth);
    };

    const handleMouseUp = () => {
      if (!isDraggingSidebarRef.current && !isDraggingInspectorRef.current) {
        return;
      }

      isDraggingSidebarRef.current = false;
      isDraggingInspectorRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleInspectorResizeStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    isDraggingInspectorRef.current = true;
    inspectorDragStartXRef.current = event.clientX;
    inspectorDragStartWidthRef.current = inspectorWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  const handleSidebarResizeStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    isDraggingSidebarRef.current = true;
    sidebarDragStartXRef.current = event.clientX;
    sidebarDragStartWidthRef.current = sidebarWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-gray-900 text-gray-100">
      <header className="h-12 border-b border-gray-800 bg-gray-950/90">{toolbar}</header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className="min-w-52 max-w-[55vw] shrink-0 overflow-auto hover-scroll border-r border-gray-800 bg-gray-900/50 flex flex-col"
          style={{ width: `${sidebarWidth}px` }}
        >
          {sidebar}
        </aside>
        <div
          className="w-1 shrink-0 cursor-col-resize bg-gray-800 hover:bg-gray-700 transition-colors"
          onMouseDown={handleSidebarResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar panel"
        />
        <main className="flex-1 flex flex-col overflow-hidden relative bg-gray-950">
          {main}
        </main>
        <div
          className="w-1 shrink-0 cursor-col-resize bg-gray-800 hover:bg-gray-700 transition-colors"
          onMouseDown={handleInspectorResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize inspector panel"
        />
        <aside
          className="min-w-64 max-w-[55vw] shrink-0 overflow-auto hover-scroll bg-gray-900/50 flex flex-col"
          style={{ width: `${inspectorWidth}px` }}
        >
          {inspector}
        </aside>
      </div>
    </div>
  );
}

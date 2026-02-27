import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ContextMenuItem } from './context-menu.types';

interface ContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  onSelect: (id: ContextMenuItem['id']) => void;
}

const MENU_WIDTH = 256;
const MENU_PADDING = 8;

export function ContextMenu({ open, x, y, items, onClose, onSelect }: ContextMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [menuSize, setMenuSize] = useState({ width: MENU_WIDTH, height: 0 });

  useLayoutEffect(() => {
    if (!open) return;
    const element = containerRef.current;
    if (!element) return;

    const { width, height } = element.getBoundingClientRect();
    setMenuSize((prev) => {
      if (prev.width === width && prev.height === height) return prev;
      return { width, height };
    });
  }, [items, open]);

  const position = useMemo(() => {
    const maxX = window.innerWidth - menuSize.width - MENU_PADDING;
    const maxY = window.innerHeight - menuSize.height - MENU_PADDING;
    const clampedX = Math.max(MENU_PADDING, Math.min(x, maxX));
    const clampedY = Math.max(MENU_PADDING, Math.min(y, maxY));
    return { left: clampedX, top: clampedY };
  }, [menuSize.height, menuSize.width, x, y]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && containerRef.current?.contains(target)) return;
      onClose();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('contextmenu', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('contextmenu', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, open]);

  if (!open || items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 min-w-64 max-w-72 overflow-y-auto rounded-md border border-gray-700 bg-gray-900 p-1 shadow-2xl"
      style={{ ...position, maxHeight: `calc(100vh - ${MENU_PADDING * 2}px)` }}
      role="menu"
    >
      {items.map((item) => {
        const disabled = item.enabled === false;
        return (
          <div key={item.id}>
            {item.separatorBefore ? <div className="my-1 border-t border-gray-700" /> : null}
            <button
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                onSelect(item.id);
                onClose();
              }}
              className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${
                disabled
                  ? 'cursor-not-allowed text-gray-500'
                  : item.danger
                    ? 'text-red-300 hover:bg-red-950/50'
                    : 'text-gray-200 hover:bg-gray-800'
              }`}
            >
              <span className="truncate">
                {item.label}
                {item.comingSoon ? <span className="ml-1 text-[10px] text-gray-500">(Soon)</span> : null}
              </span>
              {item.shortcutHint ? <span className="ml-2 text-[11px] text-gray-500">{item.shortcutHint}</span> : null}
            </button>
          </div>
        );
      })}
    </div>
  );
}

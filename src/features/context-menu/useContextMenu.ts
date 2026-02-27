import { useCallback, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import type { ContextMenuItem } from './context-menu.types';

interface UseContextMenuArgs<TTarget> {
  itemsBuilder: (target: TTarget | null) => ContextMenuItem[];
}

interface MenuState<TTarget> {
  open: boolean;
  x: number;
  y: number;
  target: TTarget | null;
}

const defaultState = {
  open: false,
  x: 0,
  y: 0,
};

export function useContextMenu<TTarget>({ itemsBuilder }: UseContextMenuArgs<TTarget>) {
  const [state, setState] = useState<MenuState<TTarget>>({
    ...defaultState,
    target: null,
  });

  const openMenu = useCallback((event: MouseEvent, target: TTarget) => {
    event.preventDefault();
    event.stopPropagation();
    setState({
      open: true,
      x: event.clientX,
      y: event.clientY,
      target,
    });
  }, []);

  const closeMenu = useCallback(() => {
    setState((prev) => ({ ...prev, open: false, target: null }));
  }, []);

  const items = useMemo(() => itemsBuilder(state.target), [itemsBuilder, state.target]);

  return {
    menuState: state,
    menuItems: items,
    openMenu,
    closeMenu,
  };
}

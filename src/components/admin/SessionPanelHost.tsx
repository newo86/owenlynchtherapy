'use client';

// One place that owns the desktop session panel, so Today, Calendar, Clients
// and Money all open the same panel (SessionPanel). `useSessionPanel` keeps
// which session is open and gives focus back to whatever opened it.

import { useCallback, useRef, useState } from 'react';
import { SessionPanel, type PanelOption } from './SessionPanel';
import type { ClientRow, SessionRow } from './types';

export interface PanelState { id: string; option: PanelOption | null }

export function useSessionPanel() {
  const [panel, setPanel] = useState<PanelState | null>(null);
  // What had focus when the panel opened, so closing can give it back.
  const opener = useRef<HTMLElement | null>(null);

  const open = useCallback((id: string, option: PanelOption | null = null) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPanel({ id, option });
  }, []);

  const close = useCallback(() => {
    const id = panel?.id;
    setPanel(null);
    window.setTimeout(() => {
      const el = opener.current?.isConnected
        ? opener.current
        : document.querySelector<HTMLElement>(`[data-session-row="${id}"] .dt-srow-main`);
      el?.focus();
    }, 0);
  }, [panel]);

  /** Close without moving focus (the next thing, e.g. an editor, takes it). */
  const dismiss = useCallback(() => setPanel(null), []);
  return { panel, open, close, dismiss };
}

interface HostProps {
  panel: PanelState | null;
  clients: ClientRow[];
  onClose: () => void;
  onDismiss: () => void;
  onChanged: () => void;
  onEditSession: (s: SessionRow, c: ClientRow) => void;
  onOpenClient: (c: ClientRow) => void;
}

export function SessionPanelHost({ panel, clients, onClose, onDismiss, onChanged, onEditSession, onOpenClient }: HostProps) {
  if (!panel) return null;
  let found: { s: SessionRow; c: ClientRow } | null = null;
  for (const c of clients) {
    const s = c.sessions.find(x => x.id === panel.id);
    if (s) { found = { s, c }; break; }
  }
  if (!found) return null;
  const { s, c } = found;
  return (
    <SessionPanel
      key={panel.id}
      session={s}
      client={c}
      initialOption={panel.option}
      onClose={onClose}
      onChanged={onChanged}
      onOpenClient={() => { onDismiss(); onOpenClient(c); }}
      onEdit={() => { onDismiss(); onEditSession(s, c); }}
    />
  );
}

'use client';

// Loads the "Followed from Google" list and runs Undo. Undo only changes the
// app: Google keeps showing the change, which the message says plainly.

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from './api';
import { FollowedFromGoogleCard } from './FollowedFromGoogleCard';
import type { FollowedItem } from '@/lib/followGoogle';

async function fetchItems(): Promise<FollowedItem[] | null> {
  try {
    const res = await adminFetch('/api/admin/calendar/followed');
    if (!res.ok) return null;
    const json = await res.json();
    return json.items ?? [];
  } catch { return null; }
}

export function FollowedFromGooglePanel({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<FollowedItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'alert'; text: string } | null>(null);

  const reload = useCallback(async () => {
    const list = await fetchItems();
    if (list) setItems(list);
  }, []);
  useEffect(() => {
    let alive = true;
    fetchItems().then(list => { if (alive && list) setItems(list); });
    // The 5-minute job may follow something while the dashboard is open.
    const t = window.setInterval(() => { fetchItems().then(list => { if (alive && list) setItems(list); }); }, 60_000);
    return () => { alive = false; window.clearInterval(t); };
  }, []);

  async function undo(id: string) {
    setBusy(id); setMessage(null);
    try {
      const res = await adminFetch('/api/admin/calendar/followed', { method: 'POST', body: JSON.stringify({ id, action: 'undo' }) });
      const json = await res.json().catch(() => ({}));
      setMessage({ kind: res.ok && json.ok ? 'ok' : 'alert', text: json.message ?? 'That did not work. Nothing was changed.' });
      if (res.ok && json.ok) onChanged();
      await reload();
    } catch {
      setMessage({ kind: 'alert', text: 'No connection. Nothing was changed.' });
    } finally {
      setBusy(null);
    }
  }

  return <FollowedFromGoogleCard items={items} onUndo={id => void undo(id)} busy={busy} message={message} />;
}

'use client';

// Dev-only preview of the "Followed from Google" card and the client record's
// "How often" control, with fake data (see src/app/(admin)/admin-demo).
// Nothing is saved or sent.
import { useState, useSyncExternalStore } from 'react';
import { FollowedFromGoogleCard } from './FollowedFromGoogleCard';
import { SeriesFrequencyView } from './SeriesFrequency';
import { demoFollowed, demoFrequencySummary } from './demoData';

const QUERY = '(max-width: 768px)';
const subscribe = (cb: () => void) => { const mq = window.matchMedia(QUERY); mq.addEventListener('change', cb); return () => mq.removeEventListener('change', cb); };
const isPhone = () => window.matchMedia(QUERY).matches;

export function FollowedFromGoogleDemo() {
  const compact = useSyncExternalStore(subscribe, isPhone, () => false);
  const [items, setItems] = useState(demoFollowed);
  const [message, setMessage] = useState<{ kind: 'ok' | 'alert'; text: string } | null>(null);
  const [interval, setIntervalWeeks] = useState(1);
  const [pending, setPending] = useState<{ to: number; summary: string } | null>(null);
  const [freqMsg, setFreqMsg] = useState<{ kind: 'ok' | 'alert'; text: string } | null>(null);

  return (
    <div className="admin-root" style={{ padding: 24 }}>
      <h2 className="admin-h2" style={{ margin: '24px 0 10px' }}>Home card</h2>
      <div style={{ maxWidth: 760 }}>
        <FollowedFromGoogleCard
          key={compact ? 'phone' : 'desk'}
          items={items}
          message={message}
          compact={compact}
          onUndo={id => {
            const it = items.find(i => i.id === id);
            setItems(list => list.map(i => (i.id === id ? { ...i, undone: true, canUndo: false } : i)));
            setMessage({ kind: 'ok', text: `${it?.label ?? 'The client'}’s session is back in the app. Google Calendar still shows it as deleted: add it back there, or it will show under “Google Calendar doesn’t match the app”. (Demo: nothing was saved.)` });
          }}
        />
      </div>

      <h2 className="admin-h2" style={{ margin: '24px 0 10px' }}>How often (client record)</h2>
      <div style={{ maxWidth: 596 }}>
        <SeriesFrequencyView
          interval={interval}
          pending={pending}
          busy={false}
          message={freqMsg}
          onPick={to => { setFreqMsg(null); setPending({ to, summary: to === 2 ? demoFrequencySummary : 'From Tue 9 Dec, weekly. Adds 4 sessions: Tue 16 Dec, Tue 30 Dec, Tue 13 Jan and Tue 27 Jan. Google Calendar will be updated. Your client won’t be emailed, so let them know yourself.' }); }}
          onConfirm={() => { if (pending) { setIntervalWeeks(pending.to); setFreqMsg({ kind: 'ok', text: 'Changed (demo: nothing was saved).' }); } setPending(null); }}
          onCancel={() => setPending(null)}
        />
      </div>
    </div>
  );
}

'use client';

// Dev-only preview of the "Followed from Google" card and the client record's
// "How often" control, with fake data (see src/app/(admin)/admin-demo).
// Nothing is saved or sent.
import { useState } from 'react';
import { FollowedFromGoogleCard } from './FollowedFromGoogleCard';
import { SeriesFrequencyView } from './SeriesFrequency';
import { demoFollowed, demoFrequencySummary } from './demoData';

export function FollowedFromGoogleDemo() {
  const [items, setItems] = useState(demoFollowed);
  const [message, setMessage] = useState<{ kind: 'ok' | 'alert'; text: string } | null>(null);
  const [interval, setIntervalWeeks] = useState(1);
  const [pending, setPending] = useState<{ to: number; summary: string } | null>(null);
  const [freqMsg, setFreqMsg] = useState<{ kind: 'ok' | 'alert'; text: string } | null>(null);

  return (
    <div className="admin-root" style={{ padding: 24 }}>
      <h2 className="admin-h2" style={{ margin: '24px 0 10px' }}>Followed from Google</h2>
      <div style={{ maxWidth: 760 }}>
        <FollowedFromGoogleCard
          items={items}
          message={message}
          onUndo={id => {
            setItems(list => list.map(i => (i.id === id ? { ...i, undone: true, canUndo: false } : i)));
            setMessage({ kind: 'ok', text: 'Brought back in the app. Google still shows it as deleted — re-add it there or it will show as a difference.' });
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
          onPick={to => { setFreqMsg(null); setPending({ to, summary: to === 2 ? demoFrequencySummary : 'From Tue 9 Dec, weekly. Adds 4 sessions: Tue 16 Dec, Tue 30 Dec, Tue 13 Jan and Tue 27 Jan. Google Calendar will be updated. Your client isn’t emailed.' }); }}
          onConfirm={() => { if (pending) { setIntervalWeeks(pending.to); setFreqMsg({ kind: 'ok', text: 'Changed (demo: nothing was saved).' }); } setPending(null); }}
          onCancel={() => setPending(null)}
        />
      </div>
    </div>
  );
}

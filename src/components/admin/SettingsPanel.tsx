'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from './api';
import type { PracticeSettings } from '@/lib/practiceSettings';

// Practice Settings (Platform plan, Phase 1).
//
// Edits the single practice_settings row that the public site, receipts and
// emails read (merged over the code defaults in src/practice.config.ts).
// Everything saves in one go — there is deliberately no per-field autosave so
// a half-finished edit can never go live.

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const euros = (cents: number) => (Number.isFinite(cents) ? String(cents / 100) : '');
const cents = (val: string) => Math.round(Number(val || '0') * 100);

function Field({ label, value, onChange, hint, type = 'text', placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="admin-label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="admin-input"
        placeholder={placeholder}
      />
      {hint && <p style={{ fontSize: 11, color: 'var(--ink-muted)', margin: '4px 0 0' }}>{hint}</p>}
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="admin-card" style={{ padding: 24 }}>
      <h2 className="admin-h2" style={{ marginBottom: sub ? 4 : 16 }}>{title}</h2>
      {sub && <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: '0 0 16px' }}>{sub}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {children}
      </div>
    </section>
  );
}

export function SettingsPanel() {
  const [settings, setSettings] = useState<PracticeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; msg: string } | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupNote, setBackupNote] = useState<{ kind: 'ok' | 'error'; msg: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testBusy, setTestBusy] = useState(false);
  const [testNote, setTestNote] = useState<{ kind: 'ok' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch('/api/admin/settings');
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        setSettings(json.settings as PracticeSettings);
        setStorageUnavailable(Boolean(json.storage_unavailable));
      } catch {
        setFeedback({ kind: 'error', msg: 'Could not load settings — refresh to try again.' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Typed one-level setters keep every input handler a one-liner.
  function set<K extends keyof PracticeSettings>(key: K, value: PracticeSettings[K]) {
    setSettings(s => (s ? { ...s, [key]: value } : s));
  }
  function setIn<K extends 'accreditation' | 'address' | 'geo' | 'fees' | 'stripeLinks' | 'socials'>(
    section: K, key: keyof PracticeSettings[K], value: PracticeSettings[K][keyof PracticeSettings[K]],
  ) {
    setSettings(s => (s ? { ...s, [section]: { ...s[section], [key]: value } } : s));
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await adminFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ settings }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ kind: 'error', msg: json.error ?? 'Could not save settings.' });
        return;
      }
      setFeedback({ kind: 'ok', msg: 'Saved. The website, receipts and emails now use these details.' });
    } catch {
      setFeedback({ kind: 'error', msg: 'Network error — nothing was saved.' });
    } finally {
      setSaving(false);
    }
  }

  async function sendTestReceipt() {
    setTestBusy(true);
    setTestNote(null);
    try {
      const res = await adminFetch('/api/admin/receipts/test', {
        method: 'POST',
        body: JSON.stringify({ email: testEmail }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTestNote({ kind: 'error', msg: json.error ?? 'Could not send the test receipt.' });
        return;
      }
      setTestNote({ kind: 'ok', msg: `Test receipt sent to ${testEmail}. Check your inbox (and spam) in a moment.` });
    } catch {
      setTestNote({ kind: 'error', msg: 'Network error — no test receipt was sent.' });
    } finally {
      setTestBusy(false);
    }
  }

  async function downloadBackup() {
    setBackupBusy(true);
    setBackupNote(null);
    try {
      const res = await adminFetch('/api/admin/backup');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setBackupNote({ kind: 'error', msg: json.error ?? 'Backup failed — try again.' });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `practice-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupNote({ kind: 'ok', msg: 'Backup downloaded — store it somewhere safe, it contains client information.' });
    } catch {
      setBackupNote({ kind: 'error', msg: 'Network error — no backup was downloaded.' });
    } finally {
      setBackupBusy(false);
    }
  }

  if (loading) {
    return <p style={{ color: 'var(--ink-muted)', fontSize: 13 }}>Loading settings…</p>;
  }
  if (!settings) {
    return (
      <p style={{ color: 'var(--terracotta)', fontSize: 13 }}>
        {feedback?.msg ?? 'Could not load settings.'}
      </p>
    );
  }

  const s = settings;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 860 }}>
      <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: 0, maxWidth: 640 }}>
        These details feed the public website, receipts and client emails. Change something,
        press <strong>Save</strong>, and it goes live — nothing saves until you do.
      </p>

      {storageUnavailable && (
        <div role="alert" style={{
          padding: '12px 18px', borderRadius: 12, fontSize: 13,
          background: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.5)', color: '#7A5C10',
        }}>
          The settings table hasn&apos;t been created in Supabase yet, so this form shows the
          built-in defaults and <strong>saving won&apos;t work</strong>. Run{' '}
          <code>supabase/migrations/practice_settings.sql</code> in the Supabase SQL editor first.
        </div>
      )}

      <Card title="Who you are" sub="Names used across the site, receipts and email sign-offs.">
        <Field label="Business name" value={s.businessName} onChange={v => set('businessName', v)} />
        <Field label="Your full name" value={s.practitionerName} onChange={v => set('practitionerName', v)} />
        <Field label="First name" value={s.practitionerFirstName} onChange={v => set('practitionerFirstName', v)}
          hint="Used to sign off emails warmly." />
        <Field label="Job title" value={s.jobTitle} onChange={v => set('jobTitle', v)} />
      </Card>

      <Card title="Accreditation" sub="Printed on every receipt — keep this exactly right.">
        <Field label="Body (short)" value={s.accreditation.bodyAbbrev}
          onChange={v => setIn('accreditation', 'bodyAbbrev', v)} placeholder="IAHIP" />
        <Field label="Body (full name)" value={s.accreditation.bodyName}
          onChange={v => setIn('accreditation', 'bodyName', v)} />
        <Field label="Registration number" value={s.accreditation.regNumber}
          onChange={v => setIn('accreditation', 'regNumber', v)} />
        <Field label="Summary line" value={s.accreditation.summary}
          onChange={v => setIn('accreditation', 'summary', v)} hint="Shown in footers, e.g. “IAHIP & ICP Accredited”." />
        <Field label="Client hours target" type="number" value={String(s.accreditation.hoursTarget)}
          onChange={v => setIn('accreditation', 'hoursTarget', Number(v || '0'))}
          hint="The accreditation milestone you're working towards (e.g. 500)." />
        <Field label="Hours before the count started" type="number" value={String(s.accreditation.hoursBaseline)}
          onChange={v => setIn('accreditation', 'hoursBaseline', Number(v || '0'))}
          hint="Client hours accrued before the dashboard's records begin — added to the automatic count." />
        <Field label="Count sessions from" type="date" value={s.accreditation.hoursCountFrom}
          onChange={v => setIn('accreditation', 'hoursCountFrom', v)}
          hint="Sessions in the dashboard on/after this date are counted automatically." />
      </Card>

      <Card title="Contact & location" sub="Your public contact details (they also drive local-SEO data).">
        <Field label="Contact email" type="email" value={s.email} onChange={v => set('email', v)} />
        <Field label="Phone (international)" value={s.telephone} onChange={v => set('telephone', v)}
          placeholder="+353851471689" hint="Digits only with country code — used in tel: links." />
        <Field label="Phone (as displayed)" value={s.telephoneDisplay} onChange={v => set('telephoneDisplay', v)}
          placeholder="085 147 1689" />
        <Field label="Service area" value={s.serviceArea} onChange={v => set('serviceArea', v)}
          placeholder="Dublin & Online · Ireland & the UK" />
        <div>
          <label className="admin-label">In-person sessions?</label>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            {[true, false].map(v => (
              <label key={String(v)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="radio" checked={s.hasInPerson === v} onChange={() => set('hasInPerson', v)} />
                {v ? 'Yes' : 'Online only'}
              </label>
            ))}
          </div>
        </div>
        <Field label="Venue" value={s.address.venue} onChange={v => setIn('address', 'venue', v)} />
        <Field label="Street address" value={s.address.streetAddress} onChange={v => setIn('address', 'streetAddress', v)} />
        <Field label="Town / city" value={s.address.addressLocality} onChange={v => setIn('address', 'addressLocality', v)} />
        <Field label="Eircode / postcode" value={s.address.postalCode} onChange={v => setIn('address', 'postalCode', v)} />
      </Card>

      <Card title="Fees & sessions" sub="Fees in euro. These are the defaults for new sessions, receipts and revenue maths.">
        <Field label="Online session (€)" type="number" value={euros(s.fees.onlineCents)}
          onChange={v => setIn('fees', 'onlineCents', cents(v))} />
        <Field label="In-person session (€)" type="number" value={euros(s.fees.inPersonCents)}
          onChange={v => setIn('fees', 'inPersonCents', cents(v))} />
        <Field label="Low-cost session (€)" type="number" value={euros(s.fees.lowCostCents)}
          onChange={v => setIn('fees', 'lowCostCents', cents(v))} />
        <Field label="Room cost per session (€)" type="number" value={euros(s.fees.roomCostCents)}
          onChange={v => setIn('fees', 'roomCostCents', cents(v))}
          hint="Deducted from in-person revenue in the Revenue view." />
        <Field label="Session length (minutes)" type="number" value={String(s.sessionMinutes)}
          onChange={v => set('sessionMinutes', Number(v || '0'))} />
        <Field label="Price range (public)" value={s.priceRange} onChange={v => set('priceRange', v)}
          placeholder="€70-€80" hint="Shown to Google as your price range." />
      </Card>

      <section className="admin-card" style={{ padding: 24 }}>
        <h2 className="admin-h2" style={{ marginBottom: 4 }}>Practice hours</h2>
        <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: '0 0 16px' }}>
          The days and times you see clients — Google shows these as your opening hours.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {s.openingHours.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                className="admin-input" style={{ maxWidth: 160 }}
                value={h.dayOfWeek}
                onChange={e => set('openingHours', s.openingHours.map((r, j) => j === i ? { ...r, dayOfWeek: e.target.value } : r))}
              >
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <input type="time" className="admin-input" style={{ maxWidth: 130 }} value={h.opens}
                onChange={e => set('openingHours', s.openingHours.map((r, j) => j === i ? { ...r, opens: e.target.value } : r))} />
              <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>to</span>
              <input type="time" className="admin-input" style={{ maxWidth: 130 }} value={h.closes}
                onChange={e => set('openingHours', s.openingHours.map((r, j) => j === i ? { ...r, closes: e.target.value } : r))} />
              <button type="button" className="admin-btn-secondary"
                onClick={() => set('openingHours', s.openingHours.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          ))}
          <button
            type="button" className="admin-btn-secondary" style={{ alignSelf: 'flex-start' }}
            onClick={() => set('openingHours', [...s.openingHours, { dayOfWeek: 'Monday', opens: '17:00', closes: '20:00' }])}
          >
            + Add a day
          </button>
        </div>
      </section>

      <section className="admin-card" style={{ padding: 24 }}>
        <h2 className="admin-h2" style={{ marginBottom: 4 }}>Available slots</h2>
        <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: '0 0 16px', maxWidth: 560 }}>
          The open slots shown to new clients on the contact page. Remove them all when
          you&apos;re full — the page then leads with the waiting list instead.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {s.availability.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input className="admin-input" style={{ maxWidth: 140 }} value={a.day} placeholder="Monday"
                onChange={e => set('availability', s.availability.map((r, j) => j === i ? { ...r, day: e.target.value } : r))} />
              <input className="admin-input" style={{ maxWidth: 110 }} value={a.time} placeholder="7:00pm"
                onChange={e => set('availability', s.availability.map((r, j) => j === i ? { ...r, time: e.target.value } : r))} />
              <select className="admin-input" style={{ maxWidth: 130 }} value={a.format}
                onChange={e => set('availability', s.availability.map((r, j) => j === i ? { ...r, format: e.target.value as 'in_person' | 'online' } : r))}>
                <option value="in_person">In person</option>
                <option value="online">Online</option>
              </select>
              <input className="admin-input" style={{ maxWidth: 190 }} value={a.note} placeholder="Note, e.g. every second week"
                onChange={e => set('availability', s.availability.map((r, j) => j === i ? { ...r, note: e.target.value } : r))} />
              <button type="button" className="admin-btn-secondary"
                onClick={() => set('availability', s.availability.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          ))}
          {s.availability.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--terracotta)', margin: 0 }}>
              No open slots — the contact page will say you&apos;re currently full and offer the waiting list.
            </p>
          )}
          <button
            type="button" className="admin-btn-secondary" style={{ alignSelf: 'flex-start' }}
            onClick={() => set('availability', [...s.availability, { day: '', time: '', format: 'in_person', note: '' }])}
          >
            + Add a slot
          </button>
        </div>
      </section>

      <Card title="Links & integrations" sub="Public links only — API keys and secrets stay in Vercel, never here.">
        <Field label="Video session link" value={s.telehealthUrl} onChange={v => set('telehealthUrl', v)}
          placeholder="https://doxy.me/…" hint="Included in online-session reminder emails." />
        <Field label="Stripe payment link — online" value={s.stripeLinks.online}
          onChange={v => setIn('stripeLinks', 'online', v)} placeholder="https://buy.stripe.com/…" />
        <Field label="Stripe payment link — in person" value={s.stripeLinks.inPerson}
          onChange={v => setIn('stripeLinks', 'inPerson', v)} placeholder="https://buy.stripe.com/…" />
        <Field label="Google Maps embed URL" value={s.mapsEmbedUrl} onChange={v => set('mapsEmbedUrl', v)}
          hint="Google Maps → Share → Embed a map → copy the src URL. Drives the /contact map." />
        <Field label="Google Tag Manager ID" value={s.gtmId} onChange={v => set('gtmId', v)}
          placeholder="GTM-XXXXXXX" hint="Leave empty to turn analytics off." />
        <Field label="Google site verification" value={s.googleSiteVerification}
          onChange={v => set('googleSiteVerification', v)} hint="From Google Search Console, if asked for one." />
      </Card>

      <Card title="Profiles" sub="Public profiles linked from the site and shown to search engines.">
        <Field label="Instagram" value={s.socials.instagram} onChange={v => setIn('socials', 'instagram', v)} />
        <Field label="Psychology Today profile" value={s.socials.psychologyToday}
          onChange={v => setIn('socials', 'psychologyToday', v)} />
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="admin-label">Directory profiles (one link per line)</label>
          <textarea
            className="admin-input" rows={3}
            value={s.socials.directoryProfiles.join('\n')}
            onChange={e => setIn('socials', 'directoryProfiles',
              e.target.value.split('\n').map(l => l.trim()).filter(Boolean))}
          />
        </div>
      </Card>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <button className="admin-btn-primary" onClick={() => void save()} disabled={saving || storageUnavailable}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {feedback && (
          <span role="status" style={{
            fontSize: 13,
            color: feedback.kind === 'ok' ? 'var(--sage)' : 'var(--terracotta)',
          }}>
            {feedback.msg}
          </span>
        )}
      </div>

      <section className="admin-card" style={{ padding: 24, marginTop: 8 }}>
        <h2 className="admin-h2" style={{ marginBottom: 4 }}>Backup</h2>
        <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: '0 0 16px', maxWidth: 560 }}>
          Downloads a complete copy of your practice data — clients, sessions, payments,
          intake forms, waitlist — as one file to keep on your own computer. Your data
          always stays in your database; this is an extra copy for peace of mind.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button className="admin-btn-secondary" onClick={() => void downloadBackup()} disabled={backupBusy}>
            {backupBusy ? 'Preparing…' : 'Download backup'}
          </button>
          {backupNote && (
            <span role="status" style={{
              fontSize: 13,
              color: backupNote.kind === 'ok' ? 'var(--sage)' : 'var(--terracotta)',
            }}>
              {backupNote.msg}
            </span>
          )}
        </div>
      </section>

      <section className="admin-card" style={{ padding: 24, marginTop: 8 }}>
        <h2 className="admin-h2" style={{ marginBottom: 4 }}>Test receipt email</h2>
        <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: '0 0 16px', maxWidth: 560 }}>
          Sends a sample receipt to any address so you can see exactly what clients get,
          and confirm receipt emails are working. It uses made-up “Sample Client” details —
          no real client is involved and nothing is recorded.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="you@example.com"
            className="admin-input"
            style={{ maxWidth: 280 }}
          />
          <button
            className="admin-btn-secondary"
            onClick={() => void sendTestReceipt()}
            disabled={testBusy || !testEmail.trim()}
          >
            {testBusy ? 'Sending…' : 'Send test receipt'}
          </button>
          {testNote && (
            <span role="status" style={{
              fontSize: 13,
              color: testNote.kind === 'ok' ? 'var(--sage)' : 'var(--terracotta)',
            }}>
              {testNote.msg}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

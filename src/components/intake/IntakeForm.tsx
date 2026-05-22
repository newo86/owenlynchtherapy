'use client';

import { useState } from 'react';
import IntakeProgress from './IntakeProgress';
import IntakeConfirmation from './IntakeConfirmation';
import FormField from './FormField';

// ── Shared styles ──────────────────────────────────────────────────────────
const inputCls =
  'w-full rounded-md px-4 py-3 text-sm bg-white text-gray-800 ' +
  'border border-[#E0D8CE] focus:outline-none focus:border-[#4F8A68] ' +
  'focus:ring-1 focus:ring-[#4F8A68] transition-colors placeholder:text-gray-400';

const textareaCls = inputCls + ' min-h-[120px] resize-none leading-relaxed';

const radioCls =
  'flex items-center gap-3 cursor-pointer group';

// ── Form state ─────────────────────────────────────────────────────────────
interface FormState {
  full_name: string;
  preferred_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  pronouns: string;
  session_format: string;
  referral_source: string;
  referral_source_other: string;
  reason_for_therapy: string;
  diagnosed_conditions: string;
  previous_therapy: string;
  previous_therapy_details: string;
  current_medication: string;
  seeing_psychiatrist: string;
  psychiatrist_details: string;
  uses_ai_tools: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  gp_name: string;
  gp_practice: string;
  additional_info: string;
  consent_therapeutic_agreement: boolean;
  consent_privacy_policy: boolean;
  consent_data_storage: boolean;
  consent_age_confirmation: boolean;
}

const initialState = (name: string, email: string): FormState => ({
  full_name: name,
  preferred_name: '',
  email,
  phone: '',
  date_of_birth: '',
  pronouns: '',
  session_format: '',
  referral_source: '',
  referral_source_other: '',
  reason_for_therapy: '',
  diagnosed_conditions: '',
  previous_therapy: '',
  previous_therapy_details: '',
  current_medication: '',
  seeing_psychiatrist: '',
  psychiatrist_details: '',
  uses_ai_tools: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',
  gp_name: '',
  gp_practice: '',
  additional_info: '',
  consent_therapeutic_agreement: false,
  consent_privacy_policy: false,
  consent_data_storage: false,
  consent_age_confirmation: false,
});

// ── Validation ─────────────────────────────────────────────────────────────
function validate(step: number, d: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 1) {
    if (!d.full_name.trim()) {
      e.full_name = 'Full name is required';
    } else if (!/^[a-zA-ZÀ-ÿ\s'\-]{2,100}$/.test(d.full_name.trim())) {
      e.full_name = 'Please enter your name using letters only';
    }
    if (!d.email.trim()) {
      e.email = 'Email address is required';
    } else if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(d.email.trim())) {
      e.email = 'Please enter a valid email address';
    }
    if (!d.phone.trim()) {
      e.phone = 'Phone number is required';
    } else {
      const stripped = d.phone.replace(/[\s\-\(\)]/g, '');
      if (!/^(\+353|0)(8[3-9]|1|2[1-9]|4[0-9]|5[0-9]|6[0-9]|7[0-9]|9[0-9])\d{6,7}$/.test(stripped)) {
        e.phone = 'Please enter a valid Irish phone number';
      }
    }
    if (!d.date_of_birth) {
      e.date_of_birth = 'Date of birth is required';
    } else {
      const dob = new Date(d.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 18) e.date_of_birth = 'You must be 18 or over to use this service';
      else if (age > 120) e.date_of_birth = 'Please enter a valid date of birth';
    }
  }
  if (step === 2) {
    if (!d.session_format) e.session_format = 'Please select a session format';
    if (!d.referral_source) e.referral_source = 'Please tell us how you heard about Owen';
    if (d.referral_source === 'Other' && !d.referral_source_other.trim())
      e.referral_source_other = 'Please provide more detail';
  }
  if (step === 3) {
    if (!d.reason_for_therapy.trim())
      e.reason_for_therapy = "Please share what's bringing you to therapy";
    if (!d.previous_therapy) e.previous_therapy = 'Please answer this question';
  }
  if (step === 4) {
    if (!d.seeing_psychiatrist) e.seeing_psychiatrist = 'Please answer this question';
    if (!d.uses_ai_tools) e.uses_ai_tools = 'Please answer this question';
  }
  if (step === 5) {
    if (!d.emergency_contact_name.trim()) e.emergency_contact_name = 'Name is required';
    if (!d.emergency_contact_phone.trim()) e.emergency_contact_phone = 'Phone number is required';
    if (!d.emergency_contact_relationship.trim()) e.emergency_contact_relationship = 'Relationship is required';
  }
  if (step === 6) {
    if (!d.consent_therapeutic_agreement) e.consent_therapeutic_agreement = 'You must agree to the Therapeutic Agreement to proceed';
    if (!d.consent_privacy_policy) e.consent_privacy_policy = 'You must agree to the Privacy Policy to proceed';
    if (!d.consent_data_storage) e.consent_data_storage = 'You must agree to this to proceed';
    if (!d.consent_age_confirmation) e.consent_age_confirmation = 'You must confirm you are 18 or over';
  }
  return e;
}

// ── Radio button ────────────────────────────────────────────────────────────
function Radio({
  name,
  value,
  label,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className={radioCls}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <span
        className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
        style={{
          borderColor: checked ? '#C85A1A' : '#D0C8BC',
          backgroundColor: checked ? '#C85A1A' : 'white',
        }}
      >
        {checked && <span className="w-2 h-2 rounded-full bg-white" />}
      </span>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
type Props = { token: string; clientName: string; clientEmail: string };

export default function IntakeForm({ token, clientName, clientEmail }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialState(clientName, clientEmail));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleBlur = (field: string) => {
    if (step !== 1) return;
    const errs = validate(1, form);
    setErrors(prev => {
      const next = { ...prev };
      if (errs[field]) next[field] = errs[field];
      else delete next[field];
      return next;
    });
  };

  function next() {
    const errs = validate(step, form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setErrors({});
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function back() {
    setErrors({});
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit() {
    const errs = validate(6, form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/intake/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const displayName = form.preferred_name.trim() || form.full_name.split(' ')[0] || clientName;

  if (submitted) {
    return <IntakeConfirmation displayName={displayName} />;
  }

  return (
    <div className="min-h-screen px-5 py-12 md:py-16" style={{ backgroundColor: '#F5F0E8' }}>
      <div className="max-w-[640px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p
            className="text-xs font-normal uppercase mb-2"
            style={{ color: '#C85A1A', letterSpacing: '2px' }}
          >
            Owen Lynch Psychotherapy
          </p>
          <h1 className="font-heading font-light text-3xl" style={{ color: '#2A4D3C' }}>
            Client Intake Form
          </h1>
        </div>

        {/* Form card */}
        <div
          className="bg-white rounded-lg px-6 py-8 md:px-10 md:py-10"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}
        >
          <IntakeProgress currentStep={step} />

          <div className="space-y-6">
            {/* ── Step 1: Your Details ── */}
            {step === 1 && (
              <>
                <FormField label="Full name" htmlFor="full_name" required error={errors.full_name}>
                  <input
                    id="full_name"
                    type="text"
                    value={form.full_name}
                    onChange={e => set('full_name', e.target.value)}
                    onBlur={() => handleBlur('full_name')}
                    className={inputCls}
                    autoComplete="name"
                  />
                </FormField>
                <FormField
                  label="Preferred name"
                  htmlFor="preferred_name"
                  helperText="If different from your full name — this is what I'll call you in sessions."
                >
                  <input
                    id="preferred_name"
                    type="text"
                    value={form.preferred_name}
                    onChange={e => set('preferred_name', e.target.value)}
                    className={inputCls}
                    autoComplete="nickname"
                  />
                </FormField>
                <FormField label="Email address" htmlFor="email" required error={errors.email}>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={inputCls}
                    autoComplete="email"
                  />
                </FormField>
                <FormField label="Phone number" htmlFor="phone" required error={errors.phone} helperText="Irish numbers only — e.g. 087 000 0000 or +353 87 000 0000">
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    className={inputCls}
                    autoComplete="tel"
                  />
                </FormField>
                <FormField label="Date of birth" htmlFor="date_of_birth" required error={errors.date_of_birth}>
                  <input
                    id="date_of_birth"
                    type="date"
                    value={form.date_of_birth}
                    onChange={e => set('date_of_birth', e.target.value)}
                    onBlur={() => handleBlur('date_of_birth')}
                    className={inputCls}
                  />
                </FormField>
                <FormField
                  label="Pronouns"
                  htmlFor="pronouns"
                  helperText="Optional — e.g. he/him, she/her, they/them"
                >
                  <input
                    id="pronouns"
                    type="text"
                    value={form.pronouns}
                    onChange={e => set('pronouns', e.target.value)}
                    className={inputCls}
                    placeholder="e.g. he/him, she/her, they/them"
                  />
                </FormField>
              </>
            )}

            {/* ── Step 2: Session Preferences ── */}
            {step === 2 && (
              <>
                <FormField label="Preferred session format" htmlFor="session_format" required error={errors.session_format}>
                  <div className="space-y-3 mt-1">
                    {[
                      { value: 'in_person', label: 'In person (106 Capel Street, Dublin 1)' },
                      { value: 'online', label: 'Online' },
                      { value: 'no_preference', label: 'No preference' },
                    ].map(opt => (
                      <Radio
                        key={opt.value}
                        name="session_format"
                        value={opt.value}
                        label={opt.label}
                        checked={form.session_format === opt.value}
                        onChange={v => set('session_format', v)}
                      />
                    ))}
                  </div>
                </FormField>

                <FormField label="How did you hear about Owen?" htmlFor="referral_source" required error={errors.referral_source}>
                  <select
                    id="referral_source"
                    value={form.referral_source}
                    onChange={e => set('referral_source', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select an option</option>
                    {[
                      'Google search',
                      'Psychology Today',
                      'Word of mouth',
                      'Social media',
                      'GP referral',
                      'Counselling directory',
                      'Other',
                    ].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </FormField>

                {form.referral_source === 'Other' && (
                  <FormField label="Please provide more detail" htmlFor="referral_source_other" error={errors.referral_source_other}>
                    <input
                      id="referral_source_other"
                      type="text"
                      value={form.referral_source_other}
                      onChange={e => set('referral_source_other', e.target.value)}
                      className={inputCls}
                    />
                  </FormField>
                )}
              </>
            )}

            {/* ── Step 3: About You ── */}
            {step === 3 && (
              <>
                <FormField
                  label="What's bringing you to therapy right now?"
                  htmlFor="reason_for_therapy"
                  required
                  error={errors.reason_for_therapy}
                  helperText="You don't need to go into detail — just enough to give me a starting point before we meet."
                >
                  <textarea
                    id="reason_for_therapy"
                    value={form.reason_for_therapy}
                    onChange={e => set('reason_for_therapy', e.target.value)}
                    className={textareaCls}
                  />
                </FormField>

                <FormField
                  label="Have you been diagnosed with any mental health conditions?"
                  htmlFor="diagnosed_conditions"
                  helperText="If you're comfortable sharing, this helps me prepare. There's no pressure to disclose anything you'd rather discuss in session."
                >
                  <textarea
                    id="diagnosed_conditions"
                    value={form.diagnosed_conditions}
                    onChange={e => set('diagnosed_conditions', e.target.value)}
                    className={textareaCls}
                    placeholder="Optional"
                  />
                </FormField>

                <FormField label="Have you attended therapy before?" htmlFor="previous_therapy" required error={errors.previous_therapy}>
                  <div className="space-y-3 mt-1">
                    <Radio name="previous_therapy" value="yes" label="Yes" checked={form.previous_therapy === 'yes'} onChange={v => set('previous_therapy', v)} />
                    <Radio name="previous_therapy" value="no" label="No" checked={form.previous_therapy === 'no'} onChange={v => set('previous_therapy', v)} />
                  </div>
                </FormField>

                {form.previous_therapy === 'yes' && (
                  <FormField
                    label="Roughly when, and was it helpful?"
                    htmlFor="previous_therapy_details"
                    helperText="Optional — any detail you're happy to share."
                  >
                    <textarea
                      id="previous_therapy_details"
                      value={form.previous_therapy_details}
                      onChange={e => set('previous_therapy_details', e.target.value)}
                      className={textareaCls}
                    />
                  </FormField>
                )}

                <FormField
                  label="Are you currently taking any medication relevant to your mental health?"
                  htmlFor="current_medication"
                >
                  <textarea
                    id="current_medication"
                    value={form.current_medication}
                    onChange={e => set('current_medication', e.target.value)}
                    className={textareaCls}
                    placeholder="Optional — medication name(s) and dosage if comfortable sharing"
                  />
                </FormField>
              </>
            )}

            {/* ── Step 4: Other Support ── */}
            {step === 4 && (
              <>
                <FormField label="Are you currently seeing a psychiatrist?" htmlFor="seeing_psychiatrist" required error={errors.seeing_psychiatrist}>
                  <div className="space-y-3 mt-1">
                    <Radio name="seeing_psychiatrist" value="yes" label="Yes" checked={form.seeing_psychiatrist === 'yes'} onChange={v => set('seeing_psychiatrist', v)} />
                    <Radio name="seeing_psychiatrist" value="no" label="No" checked={form.seeing_psychiatrist === 'no'} onChange={v => set('seeing_psychiatrist', v)} />
                  </div>
                </FormField>

                {form.seeing_psychiatrist === 'yes' && (
                  <FormField label="Psychiatrist name and practice" htmlFor="psychiatrist_details" helperText="Optional">
                    <input
                      id="psychiatrist_details"
                      type="text"
                      value={form.psychiatrist_details}
                      onChange={e => set('psychiatrist_details', e.target.value)}
                      className={inputCls}
                    />
                  </FormField>
                )}

                <FormField
                  label="Do you use AI tools for mental health support or life advice?"
                  htmlFor="uses_ai_tools"
                  required
                  error={errors.uses_ai_tools}
                  helperText="No judgment here — many people do. It's helpful for me to understand the full picture of the support you're drawing on."
                >
                  <div className="space-y-3 mt-1">
                    {[
                      { value: 'yes', label: 'Yes' },
                      { value: 'sometimes', label: 'Sometimes' },
                      { value: 'no', label: 'No' },
                    ].map(opt => (
                      <Radio
                        key={opt.value}
                        name="uses_ai_tools"
                        value={opt.value}
                        label={opt.label}
                        checked={form.uses_ai_tools === opt.value}
                        onChange={v => set('uses_ai_tools', v)}
                      />
                    ))}
                  </div>
                </FormField>
              </>
            )}

            {/* ── Step 5: Emergency Contact & GP ── */}
            {step === 5 && (
              <>
                <p className="text-sm leading-relaxed" style={{ color: '#666', lineHeight: 1.8 }}>
                  Emergency contact details are kept on file in case of a welfare concern and are
                  not contacted without your knowledge except in exceptional circumstances.
                </p>
                <FormField label="Emergency contact name" htmlFor="emergency_contact_name" required error={errors.emergency_contact_name}>
                  <input
                    id="emergency_contact_name"
                    type="text"
                    value={form.emergency_contact_name}
                    onChange={e => set('emergency_contact_name', e.target.value)}
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Emergency contact phone" htmlFor="emergency_contact_phone" required error={errors.emergency_contact_phone}>
                  <input
                    id="emergency_contact_phone"
                    type="tel"
                    value={form.emergency_contact_phone}
                    onChange={e => set('emergency_contact_phone', e.target.value)}
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Relationship to you" htmlFor="emergency_contact_relationship" required error={errors.emergency_contact_relationship}>
                  <input
                    id="emergency_contact_relationship"
                    type="text"
                    value={form.emergency_contact_relationship}
                    onChange={e => set('emergency_contact_relationship', e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Partner, Parent, Friend"
                  />
                </FormField>

                <div
                  className="pt-4 mt-2"
                  style={{ borderTop: '1px solid #F0EAE0' }}
                >
                  <p className="text-xs font-normal uppercase mb-4" style={{ color: '#2D5A42', letterSpacing: '1.5px' }}>
                    GP Details <span className="normal-case text-gray-400 tracking-normal">(optional)</span>
                  </p>
                  <div className="space-y-6">
                    <FormField label="GP name" htmlFor="gp_name">
                      <input
                        id="gp_name"
                        type="text"
                        value={form.gp_name}
                        onChange={e => set('gp_name', e.target.value)}
                        className={inputCls}
                      />
                    </FormField>
                    <FormField label="GP practice name" htmlFor="gp_practice">
                      <input
                        id="gp_practice"
                        type="text"
                        value={form.gp_practice}
                        onChange={e => set('gp_practice', e.target.value)}
                        className={inputCls}
                      />
                    </FormField>
                  </div>
                </div>
              </>
            )}

            {/* ── Step 6: Anything Else & Consent ── */}
            {step === 6 && (
              <>
                <FormField
                  label="Anything else you'd like me to know?"
                  htmlFor="additional_info"
                  helperText="Optional — anything that might be helpful to know before we meet."
                >
                  <textarea
                    id="additional_info"
                    value={form.additional_info}
                    onChange={e => set('additional_info', e.target.value)}
                    className={textareaCls}
                    placeholder="Optional"
                  />
                </FormField>

                <div
                  className="pt-4 mt-2 space-y-5"
                  style={{ borderTop: '1px solid #F0EAE0' }}
                >
                  {/* Consent: Therapeutic Agreement */}
                  <div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <span
                        className="mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors"
                        style={{
                          borderColor: form.consent_therapeutic_agreement ? '#C85A1A' : '#D0C8BC',
                          backgroundColor: form.consent_therapeutic_agreement ? '#C85A1A' : 'white',
                        }}
                      >
                        {form.consent_therapeutic_agreement && (
                          <svg width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden="true">
                            <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <input
                        type="checkbox"
                        checked={form.consent_therapeutic_agreement}
                        onChange={e => set('consent_therapeutic_agreement', e.target.checked)}
                        className="sr-only"
                      />
                      <span className="text-sm leading-relaxed" style={{ color: '#555', lineHeight: 1.8 }}>
                        I confirm I have read and agree to the{' '}
                        <span style={{ color: '#C85A1A', fontWeight: 500 }}>Therapeutic Agreement</span>
                        {' '}(attached to your welcome email). <span style={{ color: '#C85A1A' }}>*</span>
                      </span>
                    </label>
                    {errors.consent_therapeutic_agreement && (
                      <p className="mt-1.5 text-xs text-orange ml-8" role="alert">{errors.consent_therapeutic_agreement}</p>
                    )}
                  </div>

                  {/* Consent: Privacy Policy */}
                  <div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <span
                        className="mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors"
                        style={{
                          borderColor: form.consent_privacy_policy ? '#C85A1A' : '#D0C8BC',
                          backgroundColor: form.consent_privacy_policy ? '#C85A1A' : 'white',
                        }}
                      >
                        {form.consent_privacy_policy && (
                          <svg width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden="true">
                            <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <input
                        type="checkbox"
                        checked={form.consent_privacy_policy}
                        onChange={e => set('consent_privacy_policy', e.target.checked)}
                        className="sr-only"
                      />
                      <span className="text-sm leading-relaxed" style={{ color: '#555', lineHeight: 1.8 }}>
                        I confirm I have read and agree to the{' '}
                        <span style={{ color: '#C85A1A', fontWeight: 500 }}>Privacy Policy</span>
                        {' '}(attached to your welcome email). <span style={{ color: '#C85A1A' }}>*</span>
                      </span>
                    </label>
                    {errors.consent_privacy_policy && (
                      <p className="mt-1.5 text-xs text-orange ml-8" role="alert">{errors.consent_privacy_policy}</p>
                    )}
                  </div>

                  {/* Consent: Data storage */}
                  <div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <span
                        className="mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors"
                        style={{
                          borderColor: form.consent_data_storage ? '#C85A1A' : '#D0C8BC',
                          backgroundColor: form.consent_data_storage ? '#C85A1A' : 'white',
                        }}
                      >
                        {form.consent_data_storage && (
                          <svg width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden="true">
                            <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <input
                        type="checkbox"
                        checked={form.consent_data_storage}
                        onChange={e => set('consent_data_storage', e.target.checked)}
                        className="sr-only"
                      />
                      <span className="text-sm leading-relaxed" style={{ color: '#555', lineHeight: 1.8 }}>
                        I understand that the information I provide will be stored securely and used solely
                        for the purpose of my therapy with Owen Lynch Psychotherapy. I can request access
                        to or deletion of my data at any time by contacting{' '}
                        <a href="mailto:info@owenlynchtherapy.com" className="underline underline-offset-2" style={{ color: '#C85A1A' }}>
                          info@owenlynchtherapy.com
                        </a>
                        . <span style={{ color: '#C85A1A' }}>*</span>
                      </span>
                    </label>
                    {errors.consent_data_storage && (
                      <p className="mt-1.5 text-xs text-orange ml-8" role="alert">{errors.consent_data_storage}</p>
                    )}
                  </div>

                  {/* Consent 2 */}
                  <div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <span
                        className="mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors"
                        style={{
                          borderColor: form.consent_age_confirmation ? '#C85A1A' : '#D0C8BC',
                          backgroundColor: form.consent_age_confirmation ? '#C85A1A' : 'white',
                        }}
                      >
                        {form.consent_age_confirmation && (
                          <svg width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden="true">
                            <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <input
                        type="checkbox"
                        checked={form.consent_age_confirmation}
                        onChange={e => set('consent_age_confirmation', e.target.checked)}
                        className="sr-only"
                      />
                      <span className="text-sm" style={{ color: '#555', lineHeight: 1.8 }}>
                        I confirm I am 18 years of age or over.{' '}
                        <span style={{ color: '#C85A1A' }}>*</span>
                      </span>
                    </label>
                    {errors.consent_age_confirmation && (
                      <p className="mt-1.5 text-xs text-orange ml-8" role="alert">{errors.consent_age_confirmation}</p>
                    )}
                  </div>
                </div>

                {submitError && (
                  <div
                    className="rounded-md p-4 text-sm"
                    style={{ backgroundColor: '#FDF0EB', color: '#C85A1A', border: '1px solid rgba(200,90,26,0.2)' }}
                    role="alert"
                  >
                    {submitError}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 mt-10 pt-6" style={{ borderTop: '1px solid #F0EAE0' }}>
            {step > 1 && (
              <button
                type="button"
                onClick={back}
                className="px-8 py-3.5 rounded-md text-xs uppercase font-normal transition-colors"
                style={{
                  letterSpacing: '2px',
                  border: '1px solid #2A4D3C',
                  color: '#2A4D3C',
                  backgroundColor: 'transparent',
                }}
              >
                Back
              </button>
            )}
            {step < 6 ? (
              <button
                type="button"
                onClick={next}
                className="flex-1 sm:flex-none px-8 py-3.5 rounded-md text-xs uppercase font-normal text-white transition-colors"
                style={{ letterSpacing: '2px', backgroundColor: '#C85A1A' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A64810')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C85A1A')}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="flex-1 sm:flex-none px-8 py-3.5 rounded-md text-xs uppercase font-normal text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ letterSpacing: '2px', backgroundColor: '#C85A1A' }}
                onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#A64810'; }}
                onMouseLeave={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#C85A1A'; }}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-center mt-6" style={{ color: '#AAA' }}>
          Your responses are encrypted and stored securely. Questions?{' '}
          <a href="mailto:info@owenlynchtherapy.com" className="underline" style={{ color: '#C85A1A' }}>
            info@owenlynchtherapy.com
          </a>
        </p>
      </div>
    </div>
  );
}

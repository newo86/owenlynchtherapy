'use client';

// "How did they pay?": Revolut, Cash or Card, shown when marking a session
// paid (desktop panel and phone session page). Starts on Revolut, or Cash for a
// low-cost client. Nothing is emailed by choosing; the button that follows says
// what it will do.

import { PAY_CHOICES, type PayChoice } from './paymentMethods';

interface Props {
  value: PayChoice;
  onChange: (v: PayChoice) => void;
  disabled?: boolean;
  /** Stripe card payments are recorded automatically; this is for card taken in person or by another route. */
  label?: string;
}

export function PayHow({ value, onChange, disabled, label = 'How did they pay?' }: Props) {
  return (
    <div className="sd-seg-wrap">
      <p className="sd-seg-label" id="pay-how-label">{label}</p>
      <div className="sd-seg" role="radiogroup" aria-labelledby="pay-how-label">
        {PAY_CHOICES.map(c => (
          <button key={c.value} type="button" role="radio" aria-checked={value === c.value}
            disabled={disabled} onClick={() => onChange(c.value)}>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

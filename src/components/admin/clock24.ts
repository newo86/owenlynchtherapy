'use client';

// The whole dashboard shows times on a 24-hour clock ("16:00"), desktop and
// phone (Owen, Nov 2026). The older calendar and list components read this
// context; it now defaults to true, so no provider is needed. Emails to
// clients are not affected (they have their own 12-hour formatting).
import { createContext, useContext } from 'react';

export const Clock24Context = createContext(true);
export const useClock24 = () => useContext(Clock24Context);

'use client';

// The desktop Sage Diary pages show times on a 24-hour clock ("16:00"). The
// older calendar and list (kept under the new Calendar page) read this to
// match; everywhere else, including the phone, it stays 12-hour.
import { createContext, useContext } from 'react';

export const Clock24Context = createContext(false);
export const useClock24 = () => useContext(Clock24Context);

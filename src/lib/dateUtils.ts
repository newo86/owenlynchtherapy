export function startOfWeek(d: Date = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun … 6 Sat
  const diff = (day + 6) % 7; // distance back to Monday
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

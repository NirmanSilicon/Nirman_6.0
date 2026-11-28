// All user-facing times are shown in India Standard Time (storage/JSON stay UTC).
export const IST = "Asia/Kolkata";

export function getIstCurrentDate(): Date {
  return new Date();
}

/** Returns hour (0-23) in IST */
export function getIstHour(date: Date = new Date()): number {
  const hourStr = date.toLocaleTimeString("en-GB", { timeZone: IST, hour: "2-digit", hour12: false });
  return parseInt(hourStr, 10);
}

/** Determines if it is daytime or nighttime in Bhubaneswar (IST) */
export function isDayTimeInIst(date: Date = new Date()): boolean {
  const hour = getIstHour(date);
  // Day time is 06:00 to 18:30 IST
  return hour >= 6 && hour < 19;
}

/** Formats current time greeting & mode */
export function getDayNightStatus(date: Date = new Date()): {
  isDay: boolean;
  label: string;
  icon: string;
  timeStr: string;
  greeting: string;
} {
  const isDay = isDayTimeInIst(date);
  const hour = getIstHour(date);
  let greeting = "Good Night";
  if (hour >= 5 && hour < 12) greeting = "Good Morning";
  else if (hour >= 12 && hour < 17) greeting = "Good Afternoon";
  else if (hour >= 17 && hour < 21) greeting = "Good Evening";

  const timeStr = date.toLocaleTimeString("en-IN", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return {
    isDay,
    label: isDay ? "Daytime" : "Nighttime",
    icon: isDay ? "☀️" : "🌙",
    timeStr,
    greeting,
  };
}

export function formatIstTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatIstDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric" });
}

export function formatIstDateTime(iso: string): string {
  return `${formatIstDate(iso)}, ${formatIstTime(iso)} IST`;
}

/** "HH:MM – HH:MM" in IST. */
export function formatIstRange(startIso: string, endIso: string): string {
  return `${formatIstTime(startIso)} – ${formatIstTime(endIso)}`;
}

/** Parse "YYYY-MM-DD" + "HH:MM" entered as IST wall-clock time. Returns null if invalid. */
export function parseIstInput(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2}$/.test(time)) return null;
  const hhmm = time.length === 4 ? `0${time}` : time;
  const d = new Date(`${date}T${hhmm}:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "YYYY-MM-DD" and "HH:MM" of an instant, in IST. */
export function toIstInputParts(iso: string): { date: string; time: string } {
  return {
    date: new Date(iso).toLocaleDateString("en-CA", { timeZone: IST }),
    time: formatIstTime(iso),
  };
}

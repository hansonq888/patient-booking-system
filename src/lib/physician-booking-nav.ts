/** Which physician tab the user came from — keeps tab highlight correct on booking detail URLs. */
export type PhysicianBookingFromTab = "schedule" | "calendar" | "patients" | "inbox";

export const PHYSICIAN_BOOKING_FROM_PARAM = "from" as const;

/** Selected calendar day in URL (YYYY-MM-DD) — restores day after detail / browser back. */
export const PHYSICIAN_CALENDAR_DAY_PARAM = "day" as const;

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidPhysicianCalendarDayKey(s: string): boolean {
  if (!DAY_KEY_RE.test(s)) return false;
  const [y, mo, d] = s.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

/** Month index 0–11 for the given day key. */
export function calendarDayKeyMonth(s: string): { y: number; m0: number } | null {
  if (!isValidPhysicianCalendarDayKey(s)) return null;
  const [y, mo] = s.split("-").map(Number);
  return { y, m0: mo - 1 };
}

export function physicianBookingDetailHref(
  physicianId: string,
  bookingId: string,
  from: PhysicianBookingFromTab,
  /** When opening from calendar, pass so back link restores the same day. */
  calendarDayKey?: string | null
): string {
  const base = `/physician/${physicianId}/bookings/${bookingId}`;
  const q = new URLSearchParams({ [PHYSICIAN_BOOKING_FROM_PARAM]: from });
  if (from === "calendar" && calendarDayKey && isValidPhysicianCalendarDayKey(calendarDayKey)) {
    q.set(PHYSICIAN_CALENDAR_DAY_PARAM, calendarDayKey);
  }
  return `${base}?${q.toString()}`;
}

export function physicianBookingListBack(
  physicianId: string,
  from: string | null,
  /** Copied from booking detail URL when `from=calendar`. */
  calendarDay?: string | null
): { href: string; label: string } {
  if (from === "schedule") {
    return { href: `/physician/${physicianId}`, label: "My Schedule" };
  }
  if (from === "inbox") {
    return { href: `/physician/${physicianId}/inbox`, label: "Inbox" };
  }
  if (from === "calendar") {
    const base = `/physician/${physicianId}/calendar`;
    if (calendarDay && isValidPhysicianCalendarDayKey(calendarDay)) {
      return {
        href: `${base}?${new URLSearchParams({ [PHYSICIAN_CALENDAR_DAY_PARAM]: calendarDay }).toString()}`,
        label: "Calendar",
      };
    }
    return { href: base, label: "Calendar" };
  }
  return { href: `/physician/${physicianId}/bookings`, label: "All Patients" };
}

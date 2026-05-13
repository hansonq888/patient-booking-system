export type AdminBookingFromTab = "dashboard" | "bookings";

export const ADMIN_BOOKING_FROM_PARAM = "from" as const;

export function adminBookingDetailHref(bookingId: string, from: AdminBookingFromTab): string {
  const base = `/admin/bookings/${bookingId}`;
  const q = new URLSearchParams({ [ADMIN_BOOKING_FROM_PARAM]: from });
  return `${base}?${q.toString()}`;
}

export function adminBookingListBack(from: string | null): { href: string; label: string } {
  if (from === "dashboard") {
    return { href: "/admin", label: "Dashboard" };
  }
  return { href: "/admin/bookings", label: "All Bookings" };
}

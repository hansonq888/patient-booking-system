import type { Booking } from "@/lib/types";

/** Admin “today / triage” cards — same language as physician schedule cards where applicable */
export function adminOperationsBookingSurface(booking: Booking, muted: boolean): string {
  if (muted) {
    return "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm";
  }
  if (booking.status === "PENDING") {
    return "bg-amber-50/40 border-amber-100 hover:border-amber-200 hover:shadow-sm";
  }
  return "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm";
}

/** Physician timeline — adds “next up” highlight */
export function physicianScheduleBookingSurface(
  booking: Booking,
  muted: boolean,
  isNext: boolean
): string {
  if (muted) {
    return "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm";
  }
  if (isNext) {
    return "bg-teal-50/50 border-teal-200 shadow-sm hover:shadow-md";
  }
  if (booking.status === "PENDING") {
    return "bg-amber-50/40 border-amber-100 hover:border-amber-200 hover:shadow-sm";
  }
  return "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm";
}

/** Shared quick actions: admin All bookings + physician All patients (not admin today / physician today schedule) */
export const bookingQuickConfirmClassName =
  "rounded-lg border border-teal-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-50 disabled:opacity-50";

export const bookingQuickCancelClassName =
  "rounded-lg bg-red-50/60 px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-100 hover:text-red-600 disabled:opacity-50";

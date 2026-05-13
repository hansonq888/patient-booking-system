"use client";

import Link from "next/link";
import { Building2, Video, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import type { Booking } from "@/lib/types";
import { formatShortDate, formatSlotTime, isPast } from "@/lib/utils/date";
import { REASON_COLORS } from "@/lib/constants";
import { adminOperationsBookingSurface, bookingQuickCancelClassName, bookingQuickConfirmClassName } from "@/lib/booking-schedule-ui";
import { cn } from "@/lib/utils";

export type AdminBookingRowLayout = "card" | "sheet";

export interface AdminBookingRowProps {
  booking: Booking;
  href: string;
  layout: AdminBookingRowLayout;
  showDate: boolean;
  /** Quick confirm/cancel — intended for All bookings / physician All patients (advance triage); today schedule is read-only row tap */
  showActions: boolean;
  showChevron: boolean;
  /** When false, hide “· physician” (single-physician lists). */
  showPhysicianMeta?: boolean;
  actionLoadingId?: string | null;
  onConfirm?: (id: string) => void;
  onCancelClick?: (id: string) => void;
}

export function AdminBookingRow({
  booking,
  href,
  layout,
  showDate,
  showActions,
  showChevron,
  showPhysicianMeta = true,
  actionLoadingId,
  onConfirm,
  onCancelClick,
}: AdminBookingRowProps) {
  const past = isPast(booking.slot.startsAt);
  const muted = past || booking.status === "CANCELLED";
  const canAct = booking.status !== "CANCELLED" && !past;
  const isLoading = actionLoadingId === booking.id;
  const inPerson = booking.slot.visitType === "IN_PERSON";

  const visitPill = (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        inPerson
          ? "bg-teal-50 text-teal-800 ring-1 ring-teal-100"
          : "bg-blue-50 text-blue-800 ring-1 ring-blue-100"
      )}
    >
      {inPerson ? <Building2 className="h-3 w-3" /> : <Video className="h-3 w-3" />}
      {inPerson ? "In-person" : "Virtual"}
    </span>
  );

  const metaPhysician = (
    <span className="min-w-0 truncate text-xs text-slate-500">· {booking.slot.physician.name}</span>
  );

  const inner = (
    <>
      <div
        className={cn(
          "flex flex-1 items-center gap-4 min-w-0",
          layout === "card" ? "px-4 py-3.5" : "min-w-0",
          layout === "card" && muted && "opacity-50 group-hover:opacity-75 transition-opacity"
        )}
      >
        {showDate ? (
          <div className="w-28 shrink-0">
            <p className="text-xs text-slate-500">{formatShortDate(booking.slot.startsAt)}</p>
            <p className="text-sm font-semibold tabular-nums text-slate-900 mt-0.5">
              {formatSlotTime(booking.slot.startsAt)}
            </p>
          </div>
        ) : (
          <div className="w-16 shrink-0">
            <p className="text-sm font-semibold tabular-nums text-slate-900">{formatSlotTime(booking.slot.startsAt)}</p>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{booking.patientName}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-medium",
                REASON_COLORS[booking.reasonChip] ?? "bg-slate-100 text-slate-500"
              )}
            >
              {booking.reasonChip}
            </span>
            {visitPill}
            {showPhysicianMeta ? metaPhysician : null}
          </div>
        </div>

        <div className="shrink-0">
          <StatusBadge status={booking.status} />
        </div>
      </div>

      {showActions && canAct && onConfirm && onCancelClick && (
        <div className="relative z-10 flex shrink-0 items-center gap-1.5 pr-4">
          {booking.status === "PENDING" && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onConfirm(booking.id);
              }}
              disabled={isLoading}
              className={bookingQuickConfirmClassName}
            >
              {isLoading ? "…" : "Confirm"}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onCancelClick(booking.id);
            }}
            disabled={isLoading}
            className={bookingQuickCancelClassName}
          >
            Cancel
          </button>
        </div>
      )}

      {showChevron && (
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-200 transition-colors group-hover:text-slate-400" />
      )}
    </>
  );

  if (layout === "card") {
    return (
      <Link
        href={href}
        className={cn(
          "relative flex items-center rounded-xl border transition-all group",
          adminOperationsBookingSurface(booking, muted)
        )}
      >
        {inner}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 transition-colors hover:bg-slate-50/50 group sm:flex-nowrap sm:gap-5"
    >
      {inner}
    </Link>
  );
}

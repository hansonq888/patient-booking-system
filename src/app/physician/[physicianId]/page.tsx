"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Video, Sun, CloudSun, CalendarOff, AlertCircle, RefreshCw, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Booking } from "@/lib/types";
import { formatSlotTime, isPast } from "@/lib/utils/date";
import { REASON_COLORS } from "@/lib/constants";
import { usePhysician } from "@/context/PhysicianContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function getSalutation(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function minsUntil(startsAt: string): number {
  return Math.round((new Date(startsAt).getTime() - Date.now()) / 60000);
}


export default function PhysicianDashboardPage({
  params,
}: {
  params: Promise<{ physicianId: string }>;
}) {
  const { physicianId } = use(params);
  const { selectedPhysician } = usePhysician();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(false);
    fetch(`/api/bookings?physicianId=${physicianId}&date=today`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: Booking[]) => { setBookings(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }

  useEffect(() => { load(); }, [physicianId]);

  async function updateStatus(id: string, newStatus: "CONFIRMED" | "CANCELLED") {
    const prev = bookings;
    setActionLoadingId(id);
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status: newStatus } : b)));
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        newStatus === "CONFIRMED"
          ? "Appointment confirmed"
          : "Appointment cancelled — slot is now available"
      );
      window.dispatchEvent(new CustomEvent("pendingCountChanged"));
    } catch {
      setBookings(prev);
      toast.error("Action failed. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  }

  if (!selectedPhysician) return null;

  const lastName = selectedPhysician.name.split(" ").pop() ?? selectedPhysician.name;

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "PENDING").length,
    confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
    cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
  };

  // First non-past, non-cancelled booking — shown as "Next"
  const nextUpId =
    [...bookings]
      .filter((b) => !isPast(b.slot.startsAt) && b.status !== "CANCELLED")
      .sort((a, b) => new Date(a.slot.startsAt).getTime() - new Date(b.slot.startsAt).getTime())[0]
      ?.id ?? null;

  const morning = bookings.filter((b) => new Date(b.slot.startsAt).getHours() < 12);
  const afternoon = bookings.filter((b) => new Date(b.slot.startsAt).getHours() >= 12);

  const sections = [
    { label: "Morning", Icon: Sun, items: morning },
    { label: "Afternoon", Icon: CloudSun, items: afternoon },
  ] as const;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-light text-slate-900">
          {getSalutation()},{" "}
          <em style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>
            Dr. {lastName}
          </em>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        {!loading && !error && bookings.length > 0 && (
          <p className="text-slate-500 text-sm mt-1">
            {`You have ${stats.total} appointment${stats.total !== 1 ? "s" : ""} today`}
            {stats.pending > 0 ? ` — ${stats.pending} pending confirmation.` : "."}
          </p>
        )}
      </div>

      {/* Stats — 4 cards in 2×2 / 4-col */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : !error ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total today", value: stats.total, accent: "text-slate-900" },
            { label: "Pending", value: stats.pending, accent: "text-amber-500" },
            { label: "Confirmed", value: stats.confirmed, accent: "text-teal-600" },
            { label: "Cancelled", value: stats.cancelled, accent: "text-slate-400" },
          ].map(({ label, value, accent }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 px-4 py-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
              <p className={`text-3xl font-light mt-1 ${accent}`}>{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <p className="text-slate-500 text-sm mb-4">Failed to load your schedule</p>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-14 text-center">
          <CalendarOff className="w-8 h-8 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-900 text-sm font-medium">No appointments today</p>
          <p className="text-slate-400 text-sm mt-1.5">
            Enjoy your day, Dr. {lastName}.{" "}
            <Link href={`/physician/${physicianId}/bookings`} className="text-teal-600 hover:underline">
              View all patients →
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map(({ label, Icon, items }) => {
            if (items.length === 0) return null;

            const pastItems = items.filter((b) => isPast(b.slot.startsAt));
            const upcomingItems = items.filter((b) => !isPast(b.slot.startsAt));
            const showNowLine = pastItems.length > 0 && upcomingItems.length > 0;

            return (
              <div key={label}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                </div>

                <div className="space-y-2">
                  {/* Past appointments */}
                  {pastItems.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      physicianId={physicianId}
                      nextUpId={nextUpId}
                      actionLoadingId={actionLoadingId}
                      onConfirm={(id) => updateStatus(id, "CONFIRMED")}
                      onCancelClick={(id) => setConfirmCancelId(id)}
                    />
                  ))}

                  {/* "Now" divider — only shown when there are both past and upcoming items */}
                  {showNowLine && (
                    <div className="flex items-center gap-3 py-1">
                      <div className="flex-1 h-px bg-teal-100" />
                      <div className="flex items-center gap-1.5 text-teal-400">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs font-medium">Now</span>
                      </div>
                      <div className="flex-1 h-px bg-teal-100" />
                    </div>
                  )}

                  {/* Upcoming appointments */}
                  {upcomingItems.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      physicianId={physicianId}
                      nextUpId={nextUpId}
                      actionLoadingId={actionLoadingId}
                      onConfirm={(id) => updateStatus(id, "CONFIRMED")}
                      onCancelClick={(id) => setConfirmCancelId(id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmCancelId !== null}
        title="Cancel this appointment?"
        description="The patient's slot will be released and made available for rebooking."
        confirmLabel="Yes, cancel"
        cancelLabel="Keep appointment"
        onConfirm={() => {
          if (confirmCancelId) updateStatus(confirmCancelId, "CANCELLED");
          setConfirmCancelId(null);
        }}
        onCancel={() => setConfirmCancelId(null)}
      />
    </div>
  );
}

function BookingCard({
  booking,
  physicianId,
  nextUpId,
  actionLoadingId,
  onConfirm,
  onCancelClick,
}: {
  booking: Booking;
  physicianId: string;
  nextUpId: string | null;
  actionLoadingId: string | null;
  onConfirm: (id: string) => void;
  onCancelClick: (id: string) => void;
}) {
  const past = isPast(booking.slot.startsAt);
  const isLoading = actionLoadingId === booking.id;
  const canAct = booking.status !== "CANCELLED" && !past;
  const isNext = booking.id === nextUpId;
  const mins = isNext ? minsUntil(booking.slot.startsAt) : null;
  const muted = past || booking.status === "CANCELLED";

  return (
    <div
      className={cn(
        "relative flex items-center rounded-xl border transition-all group",
        muted
          ? "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm"
          : isNext
          ? "bg-teal-50/50 border-teal-200 shadow-sm hover:shadow-md"
          : booking.status === "PENDING"
          ? "bg-amber-50/40 border-amber-100 hover:border-amber-200 hover:shadow-sm"
          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
      )}
    >
      {/* Card content */}
      <div
        className={cn(
          "flex-1 flex items-center gap-4 px-4 py-3.5 min-w-0",
          muted && "opacity-50 group-hover:opacity-75 transition-opacity"
        )}
      >
        {/* Time + countdown */}
        <div className="w-16 shrink-0">
          <p className="text-sm font-semibold text-slate-900 tabular-nums">
            {formatSlotTime(booking.slot.startsAt)}
          </p>
          {isNext && mins !== null && (
            <p className="text-[10px] font-medium text-teal-500 mt-0.5 tabular-nums">
              {mins <= 0 ? "Now" : `${mins}m`}
            </p>
          )}
        </div>

        {/* Patient name + chips */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{booking.patientName}</p>
            {isNext && (
              <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-teal-100 text-teal-700 text-[10px] font-semibold uppercase tracking-wide">
                Next
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                REASON_COLORS[booking.reasonChip] ?? "bg-slate-100 text-slate-500"
              }`}
            >
              {booking.reasonChip}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              {booking.slot.visitType === "IN_PERSON" ? (
                <Building2 className="w-3.5 h-3.5" />
              ) : (
                <Video className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {booking.slot.visitType === "IN_PERSON" ? "In-person" : "Virtual"}
              </span>
            </span>
          </div>
        </div>

        {/* Status badge */}
        <div className="shrink-0 hidden sm:block">
          <StatusBadge status={booking.status} />
        </div>
      </div>

      {/* Action buttons — z-10 so they sit above the full-card Link */}
      {canAct && (
        <div className="relative z-10 flex items-center gap-1.5 pr-4 shrink-0">
          {booking.status === "PENDING" && (
            <button
              onClick={() => onConfirm(booking.id)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/80 text-teal-700 border border-teal-200 hover:bg-teal-50 transition-colors disabled:opacity-50"
            >
              {isLoading ? "…" : "Confirm"}
            </button>
          )}
          <button
            onClick={() => onCancelClick(booking.id)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50/60 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Full-card link sits last in the DOM so z-10 buttons win the stacking order */}
      <Link
        href={`/physician/${physicianId}/bookings/${booking.id}`}
        className="absolute inset-0"
        aria-label={`View booking for ${booking.patientName}`}
      />
    </div>
  );
}

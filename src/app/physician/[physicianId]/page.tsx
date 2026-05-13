"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Video, Sun, CloudSun, CalendarOff, AlertCircle, RefreshCw, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Booking } from "@/lib/types";
import { formatSlotTime, isPast } from "@/lib/utils/date";
import { REASON_COLORS } from "@/lib/constants";
import { usePhysician } from "@/context/PhysicianContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { physicianScheduleBookingSurface } from "@/lib/booking-schedule-ui";
import { physicianBookingDetailHref } from "@/lib/physician-booking-nav";

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
  const { selectedPhysician, setSelectedPhysician } = usePhysician();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [accepting, setAccepting] = useState(selectedPhysician?.acceptingNew ?? true);
  const [toggling, setToggling] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    fetch(`/api/bookings?physicianId=${physicianId}&date=today`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Booking[]) => {
        setBookings(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
        toast.error("Failed to load your schedule");
      });
  }

  useEffect(() => {
    load();
  }, [physicianId]);

  useEffect(() => {
    if (selectedPhysician) setAccepting(selectedPhysician.acceptingNew);
  }, [selectedPhysician]);

  // Optimistic update: flip immediately, revert on API failure
  async function handleToggle() {
    if (!selectedPhysician || toggling) return;
    const next = !accepting;
    setAccepting(next);
    setToggling(true);
    try {
      const res = await fetch(`/api/physicians/${physicianId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptingNew: next }),
      });
      if (!res.ok) throw new Error();
      setSelectedPhysician({ ...selectedPhysician, acceptingNew: next });
      toast.success(next ? "Now accepting new patients" : "No longer accepting new patients");
    } catch {
      setAccepting(!next);
      toast.error("Failed to update. Please try again.");
    } finally {
      setToggling(false);
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
        <p className="text-slate-500 text-sm mt-2 max-w-lg">
          Today&apos;s schedule is read-only — tap a row for details. Use{" "}
          <Link
            href={`/physician/${physicianId}/bookings`}
            className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
          >
            All patients
          </Link>{" "}
          to confirm, cancel, or search appointments ahead of time.
        </p>

        <button
          onClick={handleToggle}
          disabled={toggling}
          className="mt-4 flex items-center gap-2.5 group"
          aria-label={accepting ? "Stop accepting new patients" : "Start accepting new patients"}
        >
          <span
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
              accepting ? "bg-teal-500" : "bg-slate-300",
              toggling && "opacity-60"
            )}
          >
            <span
              className={cn(
                "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
                accepting ? "translate-x-4" : "translate-x-1"
              )}
            />
          </span>
          <span className="text-sm text-slate-500 group-hover:text-slate-700 transition-colors">
            {accepting ? "Accepting new patients" : "Not accepting new patients"}
          </span>
        </button>
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
            type="button"
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
                  {pastItems.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      physicianId={physicianId}
                      nextUpId={nextUpId}
                    />
                  ))}

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

                  {upcomingItems.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      physicianId={physicianId}
                      nextUpId={nextUpId}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  physicianId,
  nextUpId,
}: {
  booking: Booking;
  physicianId: string;
  nextUpId: string | null;
}) {
  const past = isPast(booking.slot.startsAt);
  const isNext = booking.id === nextUpId;
  const mins = isNext ? minsUntil(booking.slot.startsAt) : null;
  const muted = past || booking.status === "CANCELLED";

  return (
    <Link
      href={physicianBookingDetailHref(physicianId, booking.id, "schedule")}
      className={cn(
        "relative flex items-center rounded-xl border transition-all group",
        physicianScheduleBookingSurface(booking, muted, isNext)
      )}
    >
      <div
        className={cn(
          "flex flex-1 items-center gap-4 px-4 py-3.5 min-w-0",
          muted && "opacity-50 group-hover:opacity-75 transition-opacity"
        )}
      >
        <div className="w-16 shrink-0">
          <p className="text-sm font-semibold text-slate-900 tabular-nums">{formatSlotTime(booking.slot.startsAt)}</p>
          {isNext && mins !== null && (
            <p className="text-[10px] font-medium text-teal-500 mt-0.5 tabular-nums">
              {mins <= 0 ? "Now" : mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`}
            </p>
          )}
        </div>

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

        <div className="shrink-0">
          <StatusBadge status={booking.status} />
        </div>
      </div>
    </Link>
  );
}

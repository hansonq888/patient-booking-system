"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Video, AlertCircle, RefreshCw } from "lucide-react";
import { PhysicianMonthCalendar, type DayCounts } from "@/components/PhysicianMonthCalendar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Booking } from "@/lib/types";
import { formatSlotDate, formatSlotTime, localDateKey, localDateKeyFromDate } from "@/lib/utils/date";
import { REASON_COLORS } from "@/lib/constants";
import { usePhysician } from "@/context/PhysicianContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { physicianBookingDetailHref, PHYSICIAN_CALENDAR_DAY_PARAM, calendarDayKeyMonth, isValidPhysicianCalendarDayKey } from "@/lib/physician-booking-nav";

function defaultSelectedDay(viewYear: number, viewMonth: number, counts: Record<string, DayCounts>): string | null {
  const now = new Date();
  if (now.getFullYear() === viewYear && now.getMonth() === viewMonth) {
    return localDateKeyFromDate(now);
  }
  const keys = Object.entries(counts)
    .filter(([, v]) => v.active > 0)
    .map(([k]) => k)
    .sort();
  return keys[0] ?? null;
}

export default function PhysicianCalendarPage({
  params,
}: {
  params: Promise<{ physicianId: string }>;
}) {
  const { physicianId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const dayParam = searchParams.get(PHYSICIAN_CALENDAR_DAY_PARAM) ?? "";
  const { selectedPhysician } = usePhysician();
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const monthRange = useMemo(() => {
    const from = new Date(view.y, view.m, 1, 0, 0, 0, 0);
    const to = new Date(view.y, view.m + 1, 0, 23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [view.y, view.m]);

  const countsByDay = useMemo(() => {
    const map: Record<string, DayCounts> = {};
    for (const b of bookings) {
      const key = localDateKey(b.slot.startsAt);
      if (!map[key]) map[key] = { active: 0, pending: 0 };
      if (b.status !== "CANCELLED") map[key].active += 1;
      if (b.status === "PENDING") map[key].pending += 1;
    }
    return map;
  }, [bookings]);

  const selectionMonthRef = useRef<string>("");

  useEffect(() => {
    setLoading(true);
    setError(false);
    setBookings([]);
    const q = new URLSearchParams({
      physicianId,
      rangeFrom: monthRange.from,
      rangeTo: monthRange.to,
    });
    fetch(`/api/bookings?${q.toString()}`)
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
        toast.error("Failed to load calendar");
      });
  }, [physicianId, monthRange.from, monthRange.to, retryToken]);

  useEffect(() => {
    if (loading) return;

    if (dayParam && isValidPhysicianCalendarDayKey(dayParam)) {
      const parsed = calendarDayKeyMonth(dayParam);
      if (!parsed) return;
      const { y, m0 } = parsed;
      if (view.y !== y || view.m !== m0) {
        setView({ y, m: m0 });
        return;
      }
      setSelectedDayKey(dayParam);
      return;
    }

    const mk = `${view.y}-${view.m}`;
    if (selectionMonthRef.current !== mk) {
      selectionMonthRef.current = mk;
      setSelectedDayKey(defaultSelectedDay(view.y, view.m, countsByDay));
    } else {
      setSelectedDayKey((prev) =>
        prev === null ? defaultSelectedDay(view.y, view.m, countsByDay) : prev
      );
    }
  }, [loading, view.y, view.m, dayParam, countsByDay]);

  // replace() keeps day selection out of browser history so Back skips it
  function handleSelectDay(key: string) {
    setSelectedDayKey(key);
    router.replace(
      `/physician/${physicianId}/calendar?${new URLSearchParams({ [PHYSICIAN_CALENDAR_DAY_PARAM]: key }).toString()}`
    );
  }

  function goPrevMonth() {
    setView((v) => (v.m <= 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
    router.replace(`/physician/${physicianId}/calendar`);
  }

  function goNextMonth() {
    setView((v) => (v.m >= 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));
    router.replace(`/physician/${physicianId}/calendar`);
  }

  const todayKey = localDateKeyFromDate(new Date());

  const dayBookings = useMemo(() => {
    if (!selectedDayKey) return [];
    return bookings
      .filter((b) => localDateKey(b.slot.startsAt) === selectedDayKey)
      .sort((a, b) => new Date(a.slot.startsAt).getTime() - new Date(b.slot.startsAt).getTime());
  }, [bookings, selectedDayKey]);

  const dayKeyForBookingLinks =
    dayParam && isValidPhysicianCalendarDayKey(dayParam) ? dayParam : selectedDayKey ?? undefined;

  if (!selectedPhysician) return null;

  const selectedLabel =
    selectedDayKey && dayBookings.length > 0
      ? formatSlotDate(dayBookings[0].slot.startsAt)
      : selectedDayKey
        ? (() => {
            const [yy, mm, dd] = selectedDayKey.split("-").map(Number);
            return new Date(yy, mm - 1, dd).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            });
          })()
        : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-light text-slate-900">Calendar</h1>
        <p className="mt-1 max-w-lg text-sm text-slate-500">
          Month view of your appointments. Tap a day for times and patient names — open a row for full details. To
          confirm or cancel, use{" "}
          <Link
            href={`/physician/${physicianId}/bookings`}
            className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
          >
            All patients
          </Link>
          .
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[380px] w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <AlertCircle className="mx-auto mb-2 h-6 w-6 text-red-400" />
          <p className="mb-4 text-sm text-slate-500">Failed to load calendar</p>
          <button
            type="button"
            onClick={() => {
              setError(false);
              setRetryToken((t) => t + 1);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
        </div>
      ) : (
        <>
          <PhysicianMonthCalendar
            viewYear={view.y}
            viewMonth={view.m}
            onPrevMonth={goPrevMonth}
            onNextMonth={goNextMonth}
            countsByDay={countsByDay}
            selectedDayKey={selectedDayKey}
            onSelectDay={handleSelectDay}
            todayKey={todayKey}
          />

          <section aria-labelledby="day-heading" className="space-y-3">
            <h2 id="day-heading" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {selectedLabel ?? "Select a day"}
            </h2>

            {!selectedDayKey ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white/80 px-4 py-8 text-center text-sm text-slate-500">
                Choose a date on the calendar.
              </p>
            ) : dayBookings.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                No appointments this day.
              </p>
            ) : (
              <ul className="space-y-2">
                {dayBookings.map((booking) => {
                  const muted = booking.status === "CANCELLED";
                  return (
                    <li key={booking.id}>
                      <Link
                        href={physicianBookingDetailHref(physicianId, booking.id, "calendar", dayKeyForBookingLinks)}
                        className={cn(
                          "flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-all",
                          muted
                            ? "border-slate-100 bg-white opacity-60"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                        )}
                      >
                        <div className="w-16 shrink-0">
                          <p className="text-sm font-semibold tabular-nums text-slate-900">
                            {formatSlotTime(booking.slot.startsAt)}
                          </p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{booking.patientName}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "rounded-md px-2 py-0.5 text-xs font-medium",
                                REASON_COLORS[booking.reasonChip] ?? "bg-slate-100 text-slate-500"
                              )}
                            >
                              {booking.reasonChip}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              {booking.slot.visitType === "IN_PERSON" ? (
                                <Building2 className="h-3.5 w-3.5" />
                              ) : (
                                <Video className="h-3.5 w-3.5" />
                              )}
                              {booking.slot.visitType === "IN_PERSON" ? "In-person" : "Virtual"}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <StatusBadge status={booking.status} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

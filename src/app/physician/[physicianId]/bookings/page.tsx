"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, RefreshCw, Search, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBookingRow } from "@/components/AdminBookingRow";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Booking, BookingStatus } from "@/lib/types";
import { formatSlotDate } from "@/lib/utils/date";
import { usePhysician } from "@/context/PhysicianContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { physicianBookingDetailHref } from "@/lib/physician-booking-nav";

const STATUS_FILTERS = [
  { label: "All statuses", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const PERIOD_OPTIONS = ["upcoming", "past"] as const;
type Period = (typeof PERIOD_OPTIONS)[number];
const PERIOD_LABELS: Record<Period, string> = { upcoming: "Upcoming", past: "Past" };

export default function PhysicianBookingsPage({
  params,
}: {
  params: Promise<{ physicianId: string }>;
}) {
  const { physicianId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedPhysician } = usePhysician();

  const statusFilter = searchParams.get("status") ?? "ALL";
  const period: Period = searchParams.get("period") === "past" ? "past" : "upcoming";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  function load() {
    setLoading(true);
    setError(false);
    fetch(`/api/bookings?physicianId=${physicianId}&period=${period}`)
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
        toast.error("Failed to load bookings");
      });
  }

  useEffect(() => {
    load();
  }, [physicianId, period]);

  // Optimistic update: snapshot for rollback on API failure
  async function updateStatus(id: string, newStatus: BookingStatus) {
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
      toast.success(newStatus === "CONFIRMED" ? "Appointment confirmed" : "Appointment cancelled");
      window.dispatchEvent(new CustomEvent("pendingCountChanged"));
    } catch {
      setBookings(prev);
      toast.error("Action failed. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  }

  const filtered = bookings
    .filter((b) => statusFilter === "ALL" || b.status === statusFilter)
    .filter((b) => !debouncedSearch || b.patientName.toLowerCase().includes(debouncedSearch.toLowerCase()));

  const groups: Record<string, Booking[]> = {};
  for (const b of filtered) {
    const key = new Date(b.slot.startsAt).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  }
  const sortedKeys = Object.keys(groups).sort((a, b) =>
    period === "past" ? new Date(b).getTime() - new Date(a).getTime() : new Date(a).getTime() - new Date(b).getTime()
  );

  function updateParam(key: string, value: string, defaultValue: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value === defaultValue) p.delete(key);
    else p.set(key, value);
    router.replace(`?${p.toString()}`);
  }

  if (!selectedPhysician) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light text-slate-900">All Patients</h1>
        <p className="text-slate-500 text-sm mt-1">
          {period === "upcoming" ? "Your upcoming appointments" : "Your past appointments"} — confirm or cancel here;
          your today schedule is read-only.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Filter by time period">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => updateParam("period", p, "upcoming")}
              aria-pressed={period === p}
              className={cn(
                "min-h-11 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                period === p
                  ? "bg-teal-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:border-slate-300"
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Filter patients by status">
            {STATUS_FILTERS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateParam("status", value, "ALL")}
                aria-pressed={statusFilter === value}
                className={cn(
                  "min-h-11 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                  statusFilter === value
                    ? "bg-teal-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:border-slate-300"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-h-11 pl-8 pr-8 py-2 rounded-lg border border-slate-200 text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-h-8 min-w-8 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-36" />
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-[72px] w-full rounded-xl" />
              ))}
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <p className="text-slate-500 text-sm mb-4">Failed to load bookings</p>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      ) : sortedKeys.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-14 text-center">
          <p className="text-slate-900 text-sm font-medium">
            {bookings.length === 0
              ? period === "upcoming"
                ? "No upcoming appointments"
                : "No past appointments"
              : "No patients match your search"}
          </p>
          {(debouncedSearch || statusFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                updateParam("status", "ALL", "ALL");
              }}
              className="text-teal-600 text-sm hover:underline mt-2 block mx-auto"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {sortedKeys.map((key) => (
            <div key={key}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {formatSlotDate(groups[key][0].slot.startsAt)}
              </p>
              <div className="space-y-2">
                {groups[key].map((booking) => (
                  <AdminBookingRow
                    key={booking.id}
                    booking={booking}
                    href={physicianBookingDetailHref(physicianId, booking.id, "patients")}
                    layout="card"
                    showDate={false}
                    showActions
                    showChevron={false}
                    showPhysicianMeta={false}
                    actionLoadingId={actionLoadingId}
                    onConfirm={(id) => updateStatus(id, "CONFIRMED")}
                    onCancelClick={(id) => setConfirmCancelId(id)}
                  />
                ))}
              </div>
            </div>
          ))}
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

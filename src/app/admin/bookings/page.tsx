"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, X, ClipboardList } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBookingRow } from "@/components/AdminBookingRow";
import { adminBookingDetailHref } from "@/lib/admin-booking-nav";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Booking, BookingStatus, Physician } from "@/lib/types";
import { toast } from "sonner";

const STATUS_OPTIONS = ["ALL", "PENDING", "CONFIRMED", "CANCELLED"] as const;
type FilterStatus = (typeof STATUS_OPTIONS)[number];

const PERIOD_OPTIONS = ["upcoming", "past"] as const;
type FilterPeriod = (typeof PERIOD_OPTIONS)[number];
const PERIOD_LABELS: Record<FilterPeriod, string> = {
  upcoming: "Upcoming",
  past: "Past",
};

function AllBookingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function AllBookingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = (searchParams.get("status") ?? "ALL") as FilterStatus;
  const physicianId = searchParams.get("physicianId") ?? "";
  const search = searchParams.get("search") ?? "";
  const rawPeriod = searchParams.get("period");
  const period: FilterPeriod = rawPeriod === "past" ? "past" : "upcoming";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/physicians")
      .then((r) => r.json())
      .then((data: Physician[]) => setPhysicians(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    if (physicianId) params.set("physicianId", physicianId);
    if (search) params.set("search", search);
    params.set("period", period);

    setLoading(true);
    fetch(`/api/bookings?${params.toString()}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: Booking[]) => { setBookings(data); setLoading(false); })
      .catch(() => { toast.error("Failed to load bookings"); setLoading(false); });
  }, [status, physicianId, search, period]);


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

  function updateParams(updates: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`/admin/bookings?${next.toString()}`);
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParams({ search: value }), 300);
  }

  function clearFilters() {
    setSearchInput("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    router.replace("/admin/bookings");
  }

  const hasFilters = status !== "ALL" || physicianId !== "" || search !== "" || period !== "upcoming";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-light text-slate-900">
          All{" "}
          <em className="font-serif" style={{ fontStyle: "italic" }}>
            bookings
          </em>
        </h1>
        <p className="text-slate-500 text-sm mt-1">Manage and review all patient appointments.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Filter by time period">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => updateParams({ period: p === "upcoming" ? "" : p })}
              aria-pressed={period === p}
              className={`min-h-11 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                period === p
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Filter by booking status">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => updateParams({ status: s === "ALL" ? "" : s })}
              aria-pressed={status === s}
              className={`min-h-11 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                status === s
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200"
              }`}
            >
              {s === "ALL" ? "All statuses" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <select
            value={physicianId}
            onChange={(e) => updateParams({ physicianId: e.target.value })}
            className="h-11 w-full sm:w-auto px-3 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="">All physicians</option>
            {physicians.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <div className="relative flex-1 min-w-48 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search patient name…"
              className="w-full h-11 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="min-h-11 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Count + List */}
      <div className="space-y-2">
      {!loading && (
        <p className="text-xs text-slate-500 px-1">
          {bookings.length} {period}{" "}
          {bookings.length === 1 ? "appointment" : "appointments"}
          {(status !== "ALL" || physicianId || search) ? " matching filters" : ""}
        </p>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-14 text-center">
          <ClipboardList className="w-8 h-8 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">
            {hasFilters ? "No bookings match your filters" : "No appointments booked yet"}
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-100 text-slate-500 text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
          {bookings.map((booking) => (
            <AdminBookingRow
              key={booking.id}
              booking={booking}
              href={adminBookingDetailHref(booking.id, "bookings")}
              layout="sheet"
              showDate
              showActions
              showChevron={false}
              actionLoadingId={actionLoadingId}
              onConfirm={(bid) => updateStatus(bid, "CONFIRMED")}
              onCancelClick={(bid) => setConfirmCancelId(bid)}
            />
          ))}
        </div>
      )}
      </div>

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

export default function AllBookingsPage() {
  return (
    <Suspense fallback={<AllBookingsSkeleton />}>
      <AllBookingsContent />
    </Suspense>
  );
}

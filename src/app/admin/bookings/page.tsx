"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Building2, Video, X, ChevronRight, ClipboardList } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Booking, Physician } from "@/lib/types";
import { formatShortDate, formatSlotTime } from "@/lib/utils/date";
import { toast } from "sonner";

const STATUS_OPTIONS = ["ALL", "PENDING", "CONFIRMED", "CANCELLED"] as const;
type FilterStatus = (typeof STATUS_OPTIONS)[number];

const reasonColors: Record<string, string> = {
  "Annual physical": "bg-teal-50 text-teal-600",
  "Follow-up": "bg-blue-50 text-blue-600",
  "Sick visit": "bg-red-50 text-red-500",
  Consultation: "bg-purple-50 text-purple-600",
  Vaccination: "bg-green-50 text-green-600",
  "Lab review": "bg-amber-50 text-amber-600",
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
          <Skeleton key={i} className="h-[68px] w-full rounded-2xl" />
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

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    setLoading(true);
    fetch(`/api/bookings?${params.toString()}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: Booking[]) => { setBookings(data); setLoading(false); })
      .catch(() => { toast.error("Failed to load bookings"); setLoading(false); });
  }, [status, physicianId, search]);

  function updateParams(updates: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.push(`/admin/bookings?${next.toString()}`);
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParams({ search: value }), 300);
  }

  function clearFilters() {
    setSearchInput("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    router.push("/admin/bookings");
  }

  const hasFilters = status !== "ALL" || physicianId !== "" || search !== "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-light text-slate-900">
          All{" "}
          <em className="font-serif" style={{ fontStyle: "italic" }}>
            bookings
          </em>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage and review all patient appointments.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => updateParams({ status: s === "ALL" ? "" : s })}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                status === s
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={physicianId}
            onChange={(e) => updateParams({ physicianId: e.target.value })}
            className="h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="">All physicians</option>
            {physicians.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search patient name…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full rounded-2xl" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-14 text-center">
          <ClipboardList className="w-8 h-8 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">No bookings match your filters</p>
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
            <Link
              key={booking.id}
              href={`/admin/bookings/${booking.id}`}
              className="flex items-center gap-5 px-5 py-4 hover:bg-slate-50/50 transition-colors group"
            >
              <div className="w-28 shrink-0">
                <p className="text-xs text-slate-300">{formatShortDate(booking.slot.startsAt)}</p>
                <p className="text-sm font-medium text-slate-800 mt-0.5">
                  {formatSlotTime(booking.slot.startsAt)}
                </p>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {booking.patientName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                      reasonColors[booking.reasonChip] ?? "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {booking.reasonChip}
                  </span>
                  <span className="text-xs text-slate-300 truncate">
                    {booking.slot.physician.name}
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-slate-200 hidden sm:block">
                {booking.slot.visitType === "IN_PERSON" ? (
                  <Building2 className="w-4 h-4" />
                ) : (
                  <Video className="w-4 h-4" />
                )}
              </div>

              <div className="shrink-0">
                <StatusBadge status={booking.status} />
              </div>

              <ChevronRight className="w-4 h-4 text-slate-200 shrink-0 group-hover:text-slate-400 transition-colors" />
            </Link>
          ))}
        </div>
      )}
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

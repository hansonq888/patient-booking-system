"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, Video, AlertCircle, RefreshCw, Search, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Booking } from "@/lib/types";
import { formatSlotTime, formatSlotDate } from "@/lib/utils/date";
import { REASON_COLORS } from "@/lib/constants";
import { usePhysician } from "@/context/PhysicianContext";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Cancelled", value: "CANCELLED" },
];

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

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  function load() {
    setLoading(true);
    setError(false);
    fetch(`/api/bookings?physicianId=${physicianId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: Booking[]) => { setBookings(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }

  useEffect(() => { load(); }, [physicianId]);

  const filtered = bookings
    .filter((b) => statusFilter === "ALL" || b.status === statusFilter)
    .filter((b) => !debouncedSearch || b.patientName.toLowerCase().includes(debouncedSearch.toLowerCase()));

  const groups: Record<string, Booking[]> = {};
  for (const b of filtered) {
    const key = new Date(b.slot.startsAt).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  }
  const sortedKeys = Object.keys(groups).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  function setStatusParam(value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value === "ALL") p.delete("status");
    else p.set("status", value);
    router.push(`?${p.toString()}`);
  }

  if (!selectedPhysician) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light text-slate-900">All Patients</h1>
        <p className="text-slate-400 text-sm mt-1">Your complete booking history</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setStatusParam(value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                statusFilter === value
                  ? "bg-teal-600 text-white"
                  : "bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300"
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
            className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-slate-200 text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-36" />
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-[62px] w-full rounded-xl" />
              ))}
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <p className="text-slate-500 text-sm mb-4">Failed to load bookings</p>
          <button
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
              ? "You have no patient bookings yet"
              : "No patients match your search"}
          </p>
          {(debouncedSearch || statusFilter !== "ALL") && (
            <button
              onClick={() => { setSearch(""); setStatusParam("ALL"); }}
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
                  <Link
                    key={booking.id}
                    href={`/physician/${physicianId}/bookings/${booking.id}`}
                    className={cn(
                      "flex items-center gap-4 bg-white rounded-xl border px-4 py-3.5 transition-all",
                      booking.status === "CANCELLED"
                        ? "border-slate-100 opacity-60"
                        : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                    )}
                  >
                    <div className="w-16 shrink-0">
                      <p className="text-sm font-semibold text-slate-900 tabular-nums">
                        {formatSlotTime(booking.slot.startsAt)}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{booking.patientName}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${REASON_COLORS[booking.reasonChip] ?? "bg-slate-100 text-slate-500"}`}>
                          {booking.reasonChip}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          {booking.slot.visitType === "IN_PERSON"
                            ? <Building2 className="w-3.5 h-3.5" />
                            : <Video className="w-3.5 h-3.5" />}
                          <span className="hidden sm:inline">
                            {booking.slot.visitType === "IN_PERSON" ? "In-person" : "Virtual"}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={booking.status} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

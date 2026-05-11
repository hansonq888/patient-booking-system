"use client";

import { useEffect, useState } from "react";
import { Building2, Video, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Booking, BookingStatus } from "@/lib/types";
import { formatSlotTime } from "@/lib/utils/date";
import { toast } from "sonner";

const reasonColors: Record<string, string> = {
  "Annual physical": "bg-teal-50 text-teal-600",
  "Follow-up": "bg-blue-50 text-blue-600",
  "Sick visit": "bg-red-50 text-red-500",
  Consultation: "bg-purple-50 text-purple-600",
  Vaccination: "bg-green-50 text-green-600",
  "Lab review": "bg-amber-50 text-amber-600",
};

function StatCard({
  label,
  value,
  accent,
  loading,
}: {
  label: string;
  value: number;
  accent: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 px-6 py-5">
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-12" />
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
          <p className={`text-4xl font-light mt-1.5 ${accent}`}>{value}</p>
        </>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookings?date=today")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: Booking[]) => { setBookings(data); setLoading(false); })
      .catch(() => { toast.error("Failed to load today's schedule"); setLoading(false); });
  }, []);

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "PENDING").length,
    confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
    cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
  };

  async function updateStatus(id: string, newStatus: BookingStatus) {
    const prev = bookings;
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
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-light text-slate-900">
          {"Today's"}{" "}
          <em className="font-serif" style={{ fontStyle: "italic" }}>
            overview
          </em>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {new Date().toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Appointments" value={stats.total} accent="text-slate-900" loading={loading} />
        <StatCard label="Pending review" value={stats.pending} accent="text-amber-500" loading={loading} />
        <StatCard label="Confirmed" value={stats.confirmed} accent="text-green-600" loading={loading} />
        <StatCard label="Cancelled" value={stats.cancelled} accent="text-slate-400" loading={loading} />
      </div>

      {/* Schedule */}
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4">
          {"Today's schedule"}
        </p>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-14 text-center">
            <Calendar className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">
              No appointments scheduled for today
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center gap-5 px-5 py-4 hover:bg-slate-50/50 transition-colors"
              >
                {/* Time */}
                <div className="w-16 shrink-0 text-center">
                  <p className="text-sm font-medium text-slate-800">
                    {formatSlotTime(booking.slot.startsAt)}
                  </p>
                  <div className="flex items-center justify-center mt-0.5 text-slate-300">
                    {booking.slot.visitType === "IN_PERSON" ? (
                      <Building2 className="w-3 h-3" />
                    ) : (
                      <Video className="w-3 h-3" />
                    )}
                  </div>
                </div>

                {/* Patient + reason */}
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

                <div className="shrink-0 hidden sm:block">
                  <StatusBadge status={booking.status} />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {booking.status === "PENDING" && (
                    <button
                      onClick={() => updateStatus(booking.id, "CONFIRMED")}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Confirm</span>
                    </button>
                  )}
                  {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
                    <button
                      onClick={() => updateStatus(booking.id, "CANCELLED")}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Cancel</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

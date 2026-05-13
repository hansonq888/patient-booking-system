"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Booking } from "@/lib/types";
import { AdminBookingRow } from "@/components/AdminBookingRow";
import { adminBookingDetailHref } from "@/lib/admin-booking-nav";
import { toast } from "sonner";

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
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Booking[]) => {
        setBookings(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load today's schedule");
        setLoading(false);
      });
  }, []);

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "PENDING").length,
    confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
    cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
  };

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
        <p className="text-slate-500 text-sm mt-2 max-w-lg">
          Use{" "}
          <Link
            href="/admin/bookings"
            className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
          >
            All bookings
          </Link>{" "}
          to confirm, cancel, or filter appointments ahead of time.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Appointments" value={stats.total} accent="text-slate-900" loading={loading} />
        <StatCard label="Pending review" value={stats.pending} accent="text-amber-500" loading={loading} />
        <StatCard label="Confirmed" value={stats.confirmed} accent="text-green-600" loading={loading} />
        <StatCard label="Cancelled" value={stats.cancelled} accent="text-slate-400" loading={loading} />
      </div>

      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4">
          {"Today's schedule"}
        </p>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[60px] w-full rounded-xl" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-14 text-center">
            <Calendar className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">No appointments scheduled for today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map((booking) => (
              <AdminBookingRow
                key={booking.id}
                booking={booking}
                href={adminBookingDetailHref(booking.id, "dashboard")}
                layout="card"
                showDate={false}
                showActions={false}
                showChevron={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

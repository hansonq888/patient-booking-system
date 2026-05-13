"use client";

import { use, useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBookingRow } from "@/components/AdminBookingRow";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Booking, BookingStatus } from "@/lib/types";
import { usePhysician } from "@/context/PhysicianContext";
import { physicianBookingDetailHref } from "@/lib/physician-booking-nav";
import { localDateKeyFromDate } from "@/lib/utils/date";
import { toast } from "sonner";

const DAYS = 14;

function groupLabel(createdAt: string): "Today" | "Yesterday" | "Earlier" {
  const created = localDateKeyFromDate(new Date(createdAt));
  const today = localDateKeyFromDate(new Date());
  const yesterday = localDateKeyFromDate(new Date(Date.now() - 86400000));
  if (created === today) return "Today";
  if (created === yesterday) return "Yesterday";
  return "Earlier";
}

export default function PhysicianInboxPage({
  params,
}: {
  params: Promise<{ physicianId: string }>;
}) {
  const { physicianId } = use(params);
  const { selectedPhysician } = usePhysician();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const cutoff = new Date(Date.now() - DAYS * 86400000);
    fetch(`/api/bookings?physicianId=${physicianId}&sort=created`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: Booking[]) => {
        // Filter to last 14 days client-side
        setBookings(data.filter((b) => new Date(b.createdAt) >= cutoff));
        setLoading(false);
      })
      .catch(() => { toast.error("Failed to load inbox"); setLoading(false); });
  }, [physicianId]);

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

  if (!selectedPhysician) return null;

  const groups: Record<"Today" | "Yesterday" | "Earlier", Booking[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };
  for (const b of bookings) {
    groups[groupLabel(b.createdAt)].push(b);
  }
  const sections = (["Today", "Yesterday", "Earlier"] as const).filter(
    (label) => groups[label].length > 0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light text-slate-900">
          Recent{" "}
          <em style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>bookings</em>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Appointments booked in the last {DAYS} days, newest first.
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[3, 2].map((n, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              {Array.from({ length: n }).map((_, j) => (
                <Skeleton key={j} className="h-[72px] w-full rounded-xl" />
              ))}
            </div>
          ))}
        </div>
      ) : sections.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-14 text-center">
          <Inbox className="w-8 h-8 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">No new bookings in the last {DAYS} days</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map((label) => (
            <div key={label}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {label}
              </p>
              <div className="space-y-2">
                {groups[label].map((booking) => (
                  <AdminBookingRow
                    key={booking.id}
                    booking={booking}
                    href={physicianBookingDetailHref(physicianId, booking.id, "inbox")}
                    layout="card"
                    showDate
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

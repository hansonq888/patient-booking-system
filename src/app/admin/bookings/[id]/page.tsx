"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Video, Clock, CalendarDays, User, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Booking, BookingStatus } from "@/lib/types";
import { formatSlotDate, formatSlotTime } from "@/lib/utils/date";
import { toast } from "sonner";

const reasonColors: Record<string, string> = {
  "Annual physical": "bg-teal-50 text-teal-600",
  "Follow-up": "bg-blue-50 text-blue-600",
  "Sick visit": "bg-red-50 text-red-500",
  Consultation: "bg-purple-50 text-purple-600",
  Vaccination: "bg-green-50 text-green-600",
  "Lab review": "bg-amber-50 text-amber-600",
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-28" />
      <div className="space-y-1">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <p className="text-xs font-medium text-slate-300 uppercase tracking-wide mb-4">{title}</p>
      {children}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Booking | null) => {
        if (data) { setBooking(data); setAdminNotes(data.adminNotes ?? ""); }
        setLoading(false);
      })
      .catch(() => { toast.error("Failed to load booking"); setLoading(false); });
  }, [id]);

  async function handleStatusChange(newStatus: BookingStatus) {
    if (!booking) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Action failed");
      }
      const updated: Booking = await res.json();
      setBooking(updated);
      toast.success(newStatus === "CONFIRMED" ? "Appointment confirmed" : "Appointment cancelled");
      window.dispatchEvent(new CustomEvent("pendingCountChanged"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveNotes() {
    if (!booking) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes }),
      });
      if (!res.ok) throw new Error();
      const updated: Booking = await res.json();
      setBooking(updated);
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  }

  if (loading) return <LoadingSkeleton />;

  if (notFound || !booking) {
    return (
      <div className="text-center py-24">
        <p className="text-slate-400 text-sm">Booking not found</p>
        <Link href="/admin/bookings" className="mt-4 inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to bookings
        </Link>
      </div>
    );
  }

  const { slot } = booking;
  const physician = slot.physician;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/bookings"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All Bookings
      </Link>

      <div>
        <h1 className="text-2xl font-light text-slate-900">{booking.patientName}</h1>
        <p className="text-slate-300 mt-0.5 font-mono text-xs tracking-wide">
          #{booking.id.slice(-8).toUpperCase()}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Main */}
        <div className="lg:col-span-2 space-y-3">
          <InfoCard title="Patient">
            <div className="space-y-3.5">
              <DetailRow icon={User} label="Full name" value={booking.patientName} />
              <DetailRow icon={CalendarDays} label="Date of birth" value={booking.patientDob} />
              <DetailRow icon={Phone} label="Phone" value={booking.patientPhone} />
            </div>
          </InfoCard>

          <InfoCard title="Appointment">
            <div className="space-y-3.5">
              <DetailRow
                icon={User}
                label="Physician"
                value={
                  <span>
                    {physician.name}{" "}
                    <span className="text-slate-400 font-normal">· {physician.specialty}</span>
                  </span>
                }
              />
              <DetailRow icon={CalendarDays} label="Date" value={formatSlotDate(slot.startsAt)} />
              <DetailRow
                icon={Clock}
                label="Time"
                value={
                  <span>
                    {formatSlotTime(slot.startsAt)}{" "}
                    <span className="text-slate-400 font-normal">· {slot.durationMins} min</span>
                  </span>
                }
              />
              <DetailRow
                icon={slot.visitType === "IN_PERSON" ? Building2 : Video}
                label="Visit type"
                value={slot.visitType === "IN_PERSON" ? "In-person" : "Virtual"}
              />
            </div>
          </InfoCard>

          <InfoCard title="Reason for visit">
            <span
              className={`inline-block px-2.5 py-1 rounded-lg text-sm font-medium ${
                reasonColors[booking.reasonChip] ?? "bg-slate-100 text-slate-500"
              }`}
            >
              {booking.reasonChip}
            </span>
            {booking.reasonNotes && (
              <p className="text-sm text-slate-500 mt-3 leading-relaxed">{booking.reasonNotes}</p>
            )}
          </InfoCard>

          <InfoCard title="Metadata">
            <dl className="space-y-2">
              {[
                { label: "Booking ID", value: <span className="font-mono">{booking.id}</span> },
                {
                  label: "Created",
                  value: new Date(booking.createdAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }),
                },
                {
                  label: "Updated",
                  value: new Date(booking.updatedAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }),
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-xs text-slate-300">{label}</dt>
                  <dd className="text-xs text-slate-600 text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </InfoCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          <InfoCard title="Status">
            <div className="mb-5">
              <StatusBadge status={booking.status} />
            </div>

            {booking.status === "CANCELLED" ? (
              <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3 leading-relaxed">
                This booking has been cancelled.
              </p>
            ) : (
              <div className="space-y-2">
                {booking.status === "PENDING" && (
                  <button
                    onClick={() => handleStatusChange("CONFIRMED")}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-white font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    Confirm appointment
                  </button>
                )}
                <button
                  onClick={() => handleStatusChange("CANCELLED")}
                  disabled={actionLoading}
                  className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-red-500 hover:border-red-200 font-medium text-sm transition-colors disabled:opacity-50"
                >
                  Cancel appointment
                </button>
              </div>
            )}
          </InfoCard>

          <InfoCard title="Admin notes">
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes about this booking…"
              rows={5}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent"
            />
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="mt-2.5 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              {savingNotes ? "Saving…" : "Save notes"}
            </button>
          </InfoCard>
        </div>
      </div>
    </div>
  );
}

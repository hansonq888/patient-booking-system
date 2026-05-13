"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, Video, Clock, CalendarDays, User, Phone, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Booking } from "@/lib/types";
import { formatSlotDate, formatSlotTime, formatDob, isPast } from "@/lib/utils/date";
import { formatPhone } from "@/lib/utils/format";
import { REASON_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ADMIN_BOOKING_FROM_PARAM,
  adminBookingListBack,
} from "@/lib/admin-booking-nav";

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

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
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
  const searchParams = useSearchParams();
  const fromParam = searchParams.get(ADMIN_BOOKING_FROM_PARAM);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  // Cleanup ref prevents calling setState after unmount if the success timer is still running
  const notesSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [actionLoading, setActionLoading] = useState<"CONFIRMED" | "CANCELLED" | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

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

  useEffect(() => () => {
    if (notesSavedTimer.current) clearTimeout(notesSavedTimer.current);
  }, []);

  const back = adminBookingListBack(fromParam);

  const notesIsDirty = adminNotes !== (booking?.adminNotes ?? "");

  async function handleStatusChange(newStatus: "CONFIRMED" | "CANCELLED") {
    if (!booking) return;
    setActionLoading(newStatus);
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
      setActionLoading(null);
    }
  }

  async function handleSaveNotes() {
    if (!booking || !notesIsDirty) return;
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
      setNotesSaved(true);
      if (notesSavedTimer.current) clearTimeout(notesSavedTimer.current);
      notesSavedTimer.current = setTimeout(() => setNotesSaved(false), 2500);
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
        <Link
          href={back.href}
          scroll={back.href === "/admin"}
          className="mt-4 inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
          <span className="sr-only"> to {back.label}</span>
        </Link>
      </div>
    );
  }

  const { slot } = booking;
  const physician = slot.physician;
  const past = isPast(slot.startsAt);

  return (
    <div className="space-y-6">
      <Link
        href={back.href}
        scroll={back.href === "/admin"}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
        <span className="sr-only"> to {back.label}</span>
      </Link>

      <div>
        <h1 className="text-2xl font-light text-slate-900 truncate">{booking.patientName}</h1>
        <p className="text-slate-300 mt-0.5 font-mono text-xs tracking-wide">
          #{booking.id.slice(-8).toUpperCase()}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          <InfoCard title="Patient">
            <div className="space-y-3.5">
              <DetailRow icon={User} label="Full name" value={booking.patientName} />
              <DetailRow icon={CalendarDays} label="Date of birth" value={formatDob(booking.patientDob)} />
              <DetailRow
                icon={Phone}
                label="Phone"
                value={
                  <a
                    href={`tel:${booking.patientPhone}`}
                    className="hover:text-slate-600 transition-colors"
                  >
                    {formatPhone(booking.patientPhone)}
                  </a>
                }
              />
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
                REASON_COLORS[booking.reasonChip] ?? "bg-slate-100 text-slate-500"
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
                  value: new Date(booking.createdAt).toLocaleString("en-CA", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                },
                {
                  label: "Updated",
                  value: new Date(booking.updatedAt).toLocaleString("en-CA", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
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

        <div className="space-y-3">
          <InfoCard title="Status">
            <div className="mb-5">
              <StatusBadge status={booking.status} />
            </div>

            {booking.status === "CANCELLED" ? (
              <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3 leading-relaxed">
                This booking has been cancelled.
              </p>
            ) : past ? (
              <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3 leading-relaxed">
                This appointment has already taken place.
              </p>
            ) : (
              <div className="space-y-2">
                {booking.status === "PENDING" && (
                  <button
                    onClick={() => handleStatusChange("CONFIRMED")}
                    disabled={actionLoading !== null}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-white font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    {actionLoading === "CONFIRMED" ? "Confirming…" : "Confirm appointment"}
                  </button>
                )}
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={actionLoading !== null}
                  className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-red-500 hover:border-red-200 font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {actionLoading === "CANCELLED" ? "Cancelling…" : "Cancel appointment"}
                </button>
              </div>
            )}
          </InfoCard>

          <InfoCard title="Admin notes">
            <textarea
              value={adminNotes}
              onChange={(e) => { setAdminNotes(e.target.value); setNotesSaved(false); }}
              placeholder="Internal notes about this booking…"
              rows={5}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent"
            />
            <button
              onClick={handleSaveNotes}
              disabled={!notesIsDirty || savingNotes}
              className={cn(
                "mt-2.5 w-full py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-1.5",
                notesSaved
                  ? "bg-green-600 text-white"
                  : notesIsDirty
                  ? "bg-slate-900 hover:bg-slate-700 text-white"
                  : "bg-slate-200 text-slate-400"
              )}
            >
              {notesSaved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Saved
                </>
              ) : savingNotes ? (
                "Saving…"
              ) : (
                "Save notes"
              )}
            </button>
          </InfoCard>
        </div>
      </div>

      <ConfirmDialog
        open={showCancelConfirm}
        title="Cancel this appointment?"
        description="The patient's slot will be released and made available for rebooking."
        confirmLabel="Yes, cancel"
        cancelLabel="Keep appointment"
        onConfirm={() => { setShowCancelConfirm(false); handleStatusChange("CANCELLED"); }}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
}

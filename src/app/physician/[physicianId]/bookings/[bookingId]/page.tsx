"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Building2, Video, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Booking } from "@/lib/types";
import { formatSlotDate, formatSlotTime, formatDob } from "@/lib/utils/date";
import { formatPhone } from "@/lib/utils/format";
import { REASON_COLORS } from "@/lib/constants";
import { usePhysician } from "@/context/PhysicianContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function PhysicianBookingDetailPage({
  params,
}: {
  params: Promise<{ physicianId: string; bookingId: string }>;
}) {
  const { physicianId, bookingId } = use(params);
  const router = useRouter();
  const { selectedPhysician } = usePhysician();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/${bookingId}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Booking | null) => {
        if (!data) return;
        if (data.slot.physician.id !== physicianId) {
          router.replace(`/physician/${physicianId}`);
          return;
        }
        setBooking(data);
        setNotes(data.adminNotes ?? "");
        setSavedNotes(data.adminNotes ?? "");
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [bookingId, physicianId, router]);

  async function updateStatus(newStatus: "CONFIRMED" | "CANCELLED") {
    if (!booking) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      const updated: Booking = await res.json();
      setBooking(updated);
      window.dispatchEvent(new CustomEvent("pendingCountChanged"));
      toast.success(
        newStatus === "CONFIRMED"
          ? "Appointment confirmed"
          : "Appointment cancelled — slot is now available"
      );
    } catch {
      toast.error("Action failed. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  async function saveNotes() {
    setNotesSaving(true);
    setNotesSaved(false);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes: notes }),
      });
      if (!res.ok) throw new Error();
      setSavedNotes(notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2500);
    } catch {
      toast.error("Failed to save notes. Please try again.");
    } finally {
      setNotesSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-52" />
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-4">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (notFound || !booking) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
        <p className="text-slate-500 text-sm mb-4">Booking not found</p>
        <Link
          href={`/physician/${physicianId}/bookings`}
          className="text-teal-600 text-sm hover:underline"
        >
          ← Back to all patients
        </Link>
      </div>
    );
  }

  if (!selectedPhysician) return null;

  const notesChanged = notes !== savedNotes;

  return (
    <div className="space-y-6">
      {/* Back + heading */}
      <div>
        <Link
          href={`/physician/${physicianId}/bookings`}
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> All Patients
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-light text-slate-900">Patient Visit</h1>
          <StatusBadge status={booking.status} />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {/* Left — patient + appointment info */}
        <div className="sm:col-span-2 space-y-4">
          {/* Patient */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Patient</p>
            <p className="text-lg font-medium text-slate-900">{booking.patientName}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Date of birth</p>
                <p className="text-slate-700">{formatDob(booking.patientDob)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Phone</p>
                <a href={`tel:${booking.patientPhone}`} className="text-slate-700 hover:text-teal-600 transition-colors">
                  {formatPhone(booking.patientPhone)}
                </a>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reason for visit</p>
            <span className={`inline-block px-2.5 py-1 rounded-md text-sm font-medium ${REASON_COLORS[booking.reasonChip] ?? "bg-slate-100 text-slate-500"}`}>
              {booking.reasonChip}
            </span>
            {booking.reasonNotes && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{booking.reasonNotes}</p>
              </div>
            )}
          </div>

          {/* Appointment */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Appointment</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Date</p>
                <p className="text-slate-700">{formatSlotDate(booking.slot.startsAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Time</p>
                <p className="text-slate-700">{formatSlotTime(booking.slot.startsAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Duration</p>
                <p className="text-slate-700">{booking.slot.durationMins} minutes</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Visit type</p>
                <span className="flex items-center gap-1.5 text-slate-700">
                  {booking.slot.visitType === "IN_PERSON"
                    ? <Building2 className="w-3.5 h-3.5" />
                    : <Video className="w-3.5 h-3.5" />}
                  {booking.slot.visitType === "IN_PERSON" ? "In-person" : "Virtual"}
                </span>
              </div>
            </div>
          </div>

          {/* Clinical notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clinical notes</p>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
              placeholder="Add pre-visit notes…"
              rows={4}
              className="w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 resize-none"
            />
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-xs font-medium transition-opacity",
                notesSaved ? "text-teal-600 opacity-100" : "opacity-0"
              )}>
                Saved ✓
              </span>
              <button
                onClick={saveNotes}
                disabled={!notesChanged || notesSaving}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed",
                  notesChanged
                    ? "bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                    : "bg-slate-100 text-slate-400"
                )}
              >
                {notesSaving ? "Saving…" : "Save notes"}
              </button>
            </div>
          </div>
        </div>

        {/* Right — actions */}
        <div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 sticky top-24">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Status</span>
              <StatusBadge status={booking.status} />
            </div>

            {booking.status === "PENDING" && (
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => updateStatus("CONFIRMED")}
                  disabled={actionLoading}
                  className="w-full px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Confirming…" : "Confirm appointment"}
                </button>
                <button
                  onClick={() => updateStatus("CANCELLED")}
                  disabled={actionLoading}
                  className="w-full px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Cancelling…" : "Cancel appointment"}
                </button>
              </div>
            )}

            {booking.status === "CONFIRMED" && (
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => updateStatus("CANCELLED")}
                  disabled={actionLoading}
                  className="w-full px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Cancelling…" : "Cancel appointment"}
                </button>
                <p className="text-xs text-slate-400">Cancelling will free this slot for other patients.</p>
              </div>
            )}

            {booking.status === "CANCELLED" && (
              <p className="text-sm text-slate-400 leading-relaxed">
                This appointment has been cancelled. The slot has been returned to availability.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

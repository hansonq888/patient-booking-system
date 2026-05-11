"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBooking } from "@/context/BookingContext";
import { formatSlotDate, formatSlotTime } from "@/lib/utils/date";
import { Building2, Video } from "lucide-react";
import { PhysicianAvatar } from "@/components/PhysicianAvatar";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 uppercase tracking-wide shrink-0">{label}</span>
      <span className="text-sm text-slate-800 text-right">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 px-5 py-4">
      <p className="text-xs font-medium text-slate-300 uppercase tracking-wide mb-3">{title}</p>
      {children}
    </div>
  );
}

export default function ConfirmPage() {
  const router = useRouter();
  const { form, reset } = useBooking();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (submitted) return;
    if (!form.patientName || !form.slot || !form.physician) {
      router.replace("/book");
    }
  }, [form, router, submitted]);

  if (!form.slot || !form.physician) return null;

  async function handleConfirm() {
    if (!form.slot) return;
    setLoading(true);
    setApiError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: form.slot.id,
          patientName: form.patientName,
          patientDob: form.patientDob,
          patientPhone: form.patientPhone,
          reasonChip: form.reasonChip,
          reasonNotes: form.reasonNotes || undefined,
        }),
      });

      const data = await res.json() as { bookingId?: string; error?: string };

      if (!res.ok) {
        setApiError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
      reset();
      router.push(`/book/success?id=${data.bookingId}`);
    } catch {
      setApiError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const { slot, physician } = form;

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-light text-slate-900">
          Review your{" "}
          <em className="font-serif" style={{ fontStyle: "italic" }}>
            booking
          </em>
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Confirm your details before submitting.
        </p>
      </div>

      <div className="space-y-3">
        {/* Appointment section */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <p className="text-xs font-medium text-slate-300 uppercase tracking-wide px-5 pt-4 mb-3">
            Appointment
          </p>

          {/* Physician header */}
          <div className="flex items-center gap-3 px-5 pb-4 border-b border-slate-50">
            <PhysicianAvatar
              initials={physician.initials}
              color={physician.color}
              size="md"
            />
            <div>
              <p className="font-medium text-slate-900 text-sm">{physician.name}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wide mt-0.5">
                {physician.specialty}
              </p>
            </div>
          </div>

          {/* Slot details */}
          <div className="px-5 py-1">
            <Row label="Date" value={formatSlotDate(slot.startsAt)} />
            <Row label="Time" value={formatSlotTime(slot.startsAt)} />
            <Row label="Duration" value={`${slot.durationMins} minutes`} />
            <Row
              label="Visit type"
              value={
                <span className="flex items-center justify-end gap-1.5">
                  {slot.visitType === "IN_PERSON" ? (
                    <><Building2 className="w-3.5 h-3.5 text-slate-400" />In-person</>
                  ) : (
                    <><Video className="w-3.5 h-3.5 text-slate-400" />Virtual</>
                  )}
                </span>
              }
            />
          </div>
        </div>

        <Section title="Reason">
          <p className="text-sm text-slate-800 font-medium">{form.reasonChip}</p>
          {form.reasonNotes && (
            <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
              {form.reasonNotes}
            </p>
          )}
        </Section>

        <Section title="Patient">
          <Row label="Name" value={form.patientName} />
          <Row label="Date of birth" value={form.patientDob} />
          <Row label="Phone" value={form.patientPhone} />
        </Section>
      </div>

      {apiError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {apiError}
        </p>
      )}

      <div className="space-y-2.5">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 text-white font-medium py-3 rounded-xl transition-colors"
        >
          {loading ? "Booking…" : "Confirm booking"}
        </button>
        <button
          onClick={() => router.back()}
          disabled={loading}
          className="w-full bg-transparent hover:bg-slate-100 text-slate-400 hover:text-slate-600 font-medium py-3 rounded-xl transition-colors text-sm"
        >
          Go back
        </button>
      </div>
    </div>
  );
}

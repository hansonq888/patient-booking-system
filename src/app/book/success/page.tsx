"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Calendar, Building2, Video, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Booking } from "@/lib/types";
import { formatSlotDate, formatSlotTime, generateICS } from "@/lib/utils/date";
import { PhysicianAvatar } from "@/components/PhysicianAvatar";

export default function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = use(searchParams);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    fetch(`/api/bookings/${id}`)
      .then((r) => r.json())
      .then((data: Booking) => { setBooking(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  function downloadICS() {
    if (!booking) return;
    const ics = generateICS(
      `Appointment with ${booking.slot.physician.name}`,
      booking.slot.startsAt,
      booking.slot.durationMins,
      `${booking.reasonChip}${booking.reasonNotes ? ` — ${booking.reasonNotes}` : ""}`
    );
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "appointment.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  const shortRef = id ? id.slice(-8).toUpperCase() : null;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: "linear-gradient(150deg, #ddeef6 0%, #f0f4f8 50%, #ede9f4 100%)" }}
    >
      <div className="max-w-sm w-full space-y-4">

        {/* Avatar + heading + status */}
        <div className="text-center space-y-3">
          {loading ? (
            <Skeleton className="w-16 h-16 rounded-2xl mx-auto" />
          ) : booking ? (
            <div className="relative inline-block">
              <PhysicianAvatar
                initials={booking.slot.physician.initials}
                color={booking.slot.physician.color}
                size="lg"
              />
              <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center ring-2 ring-white/80">
                <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/70 backdrop-blur-sm border border-white mx-auto">
              <Check className="w-7 h-7 text-slate-800" />
            </div>
          )}

          <div>
            <h1 className="text-3xl font-light text-slate-900">
              You&rsquo;re{" "}
              <em className="font-serif" style={{ fontStyle: "italic" }}>
                all set.
              </em>
            </h1>
            {shortRef && (
              <p className="text-[11px] text-slate-400 tracking-widest font-mono mt-1">
                REF #{shortRef}
              </p>
            )}
          </div>

          <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Awaiting confirmation
          </span>
        </div>

        {/* Booking card */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/80 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-5 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-28" />
              <div className="pt-1 space-y-2.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ) : booking ? (
            <>
              {/* Date + time hero */}
              <div className="px-5 pt-5 pb-4 border-b border-white/60">
                <p className="text-xl font-light text-slate-900">
                  {formatSlotDate(booking.slot.startsAt)}
                </p>
                <p className="text-slate-400 text-sm mt-0.5">
                  {formatSlotTime(booking.slot.startsAt)}&nbsp;&middot;&nbsp;{booking.slot.durationMins} min
                </p>
              </div>

              {/* Physician + details */}
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <PhysicianAvatar
                    initials={booking.slot.physician.initials}
                    color={booking.slot.physician.color}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {booking.slot.physician.name}
                    </p>
                    <p className="text-xs text-slate-400">{booking.slot.physician.specialty}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Visit type</p>
                    <p className="flex items-center gap-1 text-sm text-slate-700 font-medium mt-0.5">
                      {booking.slot.visitType === "IN_PERSON" ? (
                        <><Building2 className="w-3.5 h-3.5 text-slate-400" />In-person</>
                      ) : (
                        <><Video className="w-3.5 h-3.5 text-slate-400" />Virtual</>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Reason</p>
                    <p className="text-sm text-slate-700 font-medium mt-0.5">{booking.reasonChip}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center p-5">Booking confirmed.</p>
          )}
        </div>

        {/* What happens next */}
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-white/70 px-5 py-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">
            What happens next
          </p>
          <div className="space-y-2.5">
            {[
              "Request received. Your booking is now in our system.",
              "Clinic confirms. You’ll hear from them shortly.",
              "Attend your visit. Add it to your calendar below.",
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-500 leading-snug">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {booking && (
            <button
              onClick={downloadICS}
              className="w-full bg-white/70 hover:bg-white backdrop-blur-sm text-slate-700 font-medium py-3 rounded-xl border border-white/80 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Calendar className="w-4 h-4 text-slate-400" />
              Add to calendar
            </button>
          )}
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors text-sm"
          >
            Done <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBooking } from "@/context/BookingContext";
import { Slot } from "@/lib/types";
import { formatSlotDate, formatSlotTime } from "@/lib/utils/date";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Video, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SlotPage() {
  const router = useRouter();
  const { form, setSlot } = useBooking();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!form.physician) {
      router.replace("/book");
      return;
    }
    fetch(`/api/slots?physicianId=${form.physician.id}`)
      .then((r) => r.json())
      .then((data: Slot[]) => {
        setSlots(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [form.physician, router]);

  function handleSelect(slot: Slot) {
    setSlot(slot);
    router.push("/book/reason");
  }

  const grouped: Record<string, Slot[]> = {};
  for (const slot of slots) {
    const key = new Date(slot.startsAt).toDateString();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(slot);
  }
  const dateKeys = Object.keys(grouped);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-light text-slate-900">
          Choose a{" "}
          <em className="font-serif" style={{ fontStyle: "italic" }}>
            time
          </em>
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Available with {form.physician?.name ?? "your physician"}.
        </p>
      </div>

      {loading ? (
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, j) => (
                  <Skeleton key={j} className="h-14 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : dateKeys.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-2xl border border-slate-100">
          <Clock className="w-9 h-9 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-sm">No availability</p>
          <p className="text-slate-400 text-xs mt-1">
            This physician has no upcoming open slots.
          </p>
          <button
            onClick={() => router.push("/book")}
            className="mt-5 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            Choose another physician
          </button>
        </div>
      ) : (
        <div className="space-y-7">
          {dateKeys.map((dateKey) => {
            const daySlots = grouped[dateKey];
            return (
              <div key={dateKey}>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                  {formatSlotDate(daySlots[0].startsAt)}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {daySlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => handleSelect(slot)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 bg-white rounded-xl border py-3 px-2 transition-all hover:shadow-sm",
                        slot.visitType === "IN_PERSON"
                          ? "border-teal-100 hover:border-teal-300"
                          : "border-blue-100 hover:border-blue-300"
                      )}
                    >
                      <span className="text-sm font-medium text-slate-800">
                        {formatSlotTime(slot.startsAt)}
                      </span>
                      <span
                        className={cn(
                          "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                          slot.visitType === "IN_PERSON"
                            ? "bg-teal-50 text-teal-600"
                            : "bg-blue-50 text-blue-600"
                        )}
                      >
                        {slot.visitType === "IN_PERSON" ? (
                          <><Building2 className="w-2.5 h-2.5" />In-person</>
                        ) : (
                          <><Video className="w-2.5 h-2.5" />Virtual</>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-300">
                        {slot.durationMins} min
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

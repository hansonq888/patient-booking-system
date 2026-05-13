"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBooking } from "@/context/BookingContext";
import { Slot } from "@/lib/types";
import { formatSlotTime, localDateKeyFromDate } from "@/lib/utils/date";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Video, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const DAY_ABBREVS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_ABBREVS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDateKey(key: string) {
  const [y, mo, d] = key.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  const today = new Date();
  const isToday = y === today.getFullYear() && mo - 1 === today.getMonth() && d === today.getDate();
  return { day: DAY_ABBREVS[dt.getDay()], num: d, month: MONTH_ABBREVS[mo - 1], isToday };
}

export default function SlotPage() {
  const router = useRouter();
  const { form, setSlot } = useBooking();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!form.physician) {
      router.replace("/book");
      return;
    }
    fetch(`/api/slots?physicianId=${form.physician.id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: Slot[]) => {
        setSlots(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [form.physician, router]);

  const grouped: Record<string, Slot[]> = {};
  for (const slot of slots) {
    const key = localDateKeyFromDate(new Date(slot.startsAt));
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(slot);
  }
  const dateKeys = Object.keys(grouped).sort();

  // Select first available date once slots load
  useEffect(() => {
    if (dateKeys.length > 0 && selectedDate === null) {
      setSelectedDate(dateKeys[0]);
    }
  }, [slots]);

  function handleSelect(slot: Slot) {
    setSlot(slot);
    router.push("/book/reason");
  }

  const daySlots = selectedDate ? (grouped[selectedDate] ?? []) : [];

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
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-14 shrink-0 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, j) => (
              <Skeleton key={j} className="h-14 rounded-xl" />
            ))}
          </div>
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
        <div className="space-y-5">
          {/* Scrollable date strip */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {dateKeys.map((key) => {
              const { day, num, month, isToday } = parseDateKey(key);
              const active = key === selectedDate;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  className={cn(
                    "shrink-0 flex flex-col items-center justify-center w-14 h-[4.25rem] rounded-xl border text-xs transition-all",
                    active
                      ? "bg-teal-600 border-teal-600 text-white"
                      : "bg-white border-slate-100 text-slate-600 hover:border-teal-200 hover:text-teal-700"
                  )}
                >
                  <span className={cn("text-[10px] font-semibold uppercase tracking-wide leading-none mb-0.5", active ? "text-teal-100" : "text-slate-400")}>
                    {isToday ? "Today" : day}
                  </span>
                  <span className="text-lg font-semibold leading-none">{num}</span>
                  <span className={cn("text-[10px] leading-none mt-0.5", active ? "text-teal-100" : "text-slate-400")}>{month}</span>
                </button>
              );
            })}
          </div>

          {/* Slot grid for the selected date */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {daySlots.map((slot) => (
              <button
                key={slot.id}
                onClick={() => handleSelect(slot)}
                className={cn(
                  "min-h-16 flex flex-col items-center justify-center gap-1.5 bg-white rounded-xl border py-3 px-2 transition-all hover:shadow-sm",
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
      )}
    </div>
  );
}

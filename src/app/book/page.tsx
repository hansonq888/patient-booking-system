"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBooking } from "@/context/BookingContext";
import { Physician } from "@/lib/types";
import { formatSlotTime, formatShortDate } from "@/lib/utils/date";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Clock, Video, Building2, ChevronRight } from "lucide-react";

const specialties = ["All", "Family Medicine", "Internal Medicine", "Dermatology", "Pediatrics"];

const colorMap: Record<string, string> = {
  teal: "bg-teal-50 text-teal-600",
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-purple-50 text-purple-600",
  amber: "bg-amber-50 text-amber-600",
};

export default function BookPage() {
  const router = useRouter();
  const { setPhysician } = useBooking();
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    fetch("/api/physicians")
      .then((r) => r.json())
      .then((data) => {
        setPhysicians(data);
        setLoading(false);
      });
  }, []);

  const filtered =
    filter === "All"
      ? physicians
      : physicians.filter((p) => p.specialty === filter);

  function handleSelect(physician: Physician) {
    setPhysician(physician);
    router.push("/book/slot");
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-light text-slate-900">
          Choose a{" "}
          <em className="font-serif" style={{ fontStyle: "italic" }}>
            physician
          </em>
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Select a doctor to see their available times.
        </p>
      </div>

      {/* Specialty filter */}
      <div className="flex gap-2 flex-wrap">
        {specialties.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === s
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Physician cards */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No physicians found for this specialty.
          </div>
        ) : (
          filtered.map((physician) => (
            <button
              key={physician.id}
              onClick={() => physician.acceptingNew && handleSelect(physician)}
              disabled={!physician.acceptingNew}
              className={`w-full text-left bg-white rounded-2xl border p-5 transition-all ${
                physician.acceptingNew
                  ? "border-slate-100 hover:border-slate-300 hover:shadow-sm cursor-pointer"
                  : "border-slate-100 opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-semibold text-sm shrink-0 ${
                      colorMap[physician.color] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {physician.initials}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900">
                        {physician.name}
                      </span>
                      {!physician.acceptingNew && (
                        <Badge variant="secondary" className="text-xs">
                          Not accepting new patients
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                      {physician.specialty}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">{physician.bio}</p>
                    <div className="flex items-center gap-4 mt-2.5">
                      {physician.nextAvailable ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            Next:{" "}
                            {formatShortDate(physician.nextAvailable)}{" "}
                            at {formatSlotTime(physician.nextAvailable)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">
                          No upcoming availability
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Building2 className="w-3.5 h-3.5" />
                        <Video className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
                {physician.acceptingNew && (
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

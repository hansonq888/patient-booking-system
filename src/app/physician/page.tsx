"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, RefreshCw, UserX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Physician } from "@/lib/types";
import { usePhysician } from "@/context/PhysicianContext";
import { AVATAR_COLOR_CLASSES } from "@/lib/constants";

export default function PhysicianPickerPage() {
  const router = useRouter();
  const { setSelectedPhysician } = usePhysician();
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    fetch("/api/physicians")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: Physician[]) => { setPhysicians(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  function handleSelect(physician: Physician) {
    setSelectedPhysician(physician);
    router.push(`/physician/${physician.id}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/v-logo.svg" alt="Vero" width={36} height={28} className="h-7 w-auto mx-auto mb-5" />
          <h1 className="text-2xl font-light text-slate-900">
            Physician{" "}
            <em className="font-serif" style={{ fontStyle: "italic" }}>workspace</em>
          </h1>
          <p className="text-slate-400 text-sm mt-2">Select your name to view your schedule</p>
        </div>

        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
            ))
          ) : error ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <p className="text-slate-500 text-sm mb-4">Failed to load physicians</p>
              <button
                onClick={load}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try again
              </button>
            </div>
          ) : physicians.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <UserX className="w-6 h-6 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No physicians found</p>
            </div>
          ) : (
            physicians.map((physician) => (
              <button
                key={physician.id}
                onClick={() => handleSelect(physician)}
                className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all text-left"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                    AVATAR_COLOR_CLASSES[physician.color] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {physician.initials}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{physician.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{physician.specialty}</p>
                </div>

                {!physician.acceptingNew && (
                  <span className="shrink-0 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-600 whitespace-nowrap">
                    Not accepting new
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/admin"
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Admin view →
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { use, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PHYSICIAN_BOOKING_FROM_PARAM } from "@/lib/physician-booking-nav";
import Link from "next/link";
import Image from "next/image";
import { Booking } from "@/lib/types";
import { usePhysician } from "@/context/PhysicianContext";
import { AVATAR_COLOR_CLASSES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function PhysicianLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ physicianId: string }>;
}) {
  const { physicianId } = use(params);
  const { selectedPhysician, clearPhysician } = usePhysician();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Guards against redirect before PhysicianContext has read localStorage on first render
  const [ready, setReady] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  // Mark hydration complete (localStorage is read inside PhysicianContext useEffect)
  useEffect(() => { setReady(true); }, []);

  useEffect(() => {
    if (!ready) return;
    if (!selectedPhysician || selectedPhysician.id !== physicianId) {
      router.replace("/physician");
    }
  }, [ready, selectedPhysician, physicianId, router]);

  function fetchPending() {
    fetch(`/api/bookings?physicianId=${physicianId}&status=PENDING`)
      .then((r) => r.json())
      .then((data: Booking[]) => setPendingCount(data.length))
      .catch(() => {});
  }

  useEffect(() => { fetchPending(); }, [physicianId]);

  useEffect(() => {
    window.addEventListener("pendingCountChanged", fetchPending);
    return () => window.removeEventListener("pendingCountChanged", fetchPending);
  }, [physicianId]);

  // Show nothing while hydrating or if auth check will redirect
  if (!ready || !selectedPhysician || selectedPhysician.id !== physicianId) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  const avatarClass = AVATAR_COLOR_CLASSES[selectedPhysician.color] ?? "bg-slate-100 text-slate-600";
  const scheduleHref = `/physician/${physicianId}`;
  const calendarHref = `/physician/${physicianId}/calendar`;
  const patientsHref = `/physician/${physicianId}/bookings`;

  const tabs = [
    { label: "My Schedule", href: scheduleHref },
    { label: "Calendar", href: calendarHref },
    { label: "All Patients", href: patientsHref },
  ];

  const fromTab = searchParams.get(PHYSICIAN_BOOKING_FROM_PARAM);
  const onBookingDetail =
    pathname.startsWith(`${patientsHref}/`) && pathname.slice(patientsHref.length + 1).length > 0;

  function isActive(href: string) {
    if (href === scheduleHref) {
      if (pathname === scheduleHref) return true;
      return onBookingDetail && fromTab === "schedule";
    }
    if (href === calendarHref) {
      if (pathname === calendarHref) return true;
      return onBookingDetail && fromTab === "calendar";
    }
    if (href === patientsHref) {
      if (pathname === patientsHref) return true;
      if (onBookingDetail && fromTab !== "schedule" && fromTab !== "calendar") return true;
      return false;
    }
    return false;
  }

  function handleSignOut() {
    clearPhysician();
    router.replace("/physician");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:text-slate-900 focus:px-3 focus:py-2 focus:rounded-lg focus:border"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
        {/* Identity bar */}
        <div className="flex items-center justify-between px-6 py-3.5">
          <Link href="/">
            <Image src="/v-logo.svg" alt="Vero" width={28} height={22} className="h-6 w-auto" />
          </Link>

          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarClass}`}>
              {selectedPhysician.initials}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900 leading-none">{selectedPhysician.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{selectedPhysician.specialty}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="text-xs text-slate-400 hover:text-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Tab nav */}
        <div className="flex items-center px-6 border-t border-slate-50">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 px-1 py-3 mr-8 text-sm font-medium border-b-2 -mb-px transition-colors",
                  active
                    ? "text-teal-600 border-teal-500"
                    : "text-slate-400 border-transparent hover:text-slate-700"
                )}
              >
                {tab.label}
                {tab.label === "All Patients" && pendingCount !== null && pendingCount > 0 && (
                  <span className="bg-amber-100 text-amber-600 text-xs font-semibold px-1.5 py-0.5 rounded-full leading-none">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </header>

      <main id="main-content" className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

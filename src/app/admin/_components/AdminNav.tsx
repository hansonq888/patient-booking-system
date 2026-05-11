"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { Booking } from "@/lib/types";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/bookings", label: "All Bookings", icon: ClipboardList, exact: false },
] as const;

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image src="/v-logo.svg" alt="Vero" width={28} height={22} className="h-6 w-auto" />
      <span className="text-[10px] font-medium text-slate-300 uppercase tracking-widest mt-0.5">
        Admin
      </span>
    </Link>
  );
}

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  pendingCount: number | null;
  mobile?: boolean;
}

function NavItem({ href, label, icon: Icon, active, pendingCount, mobile }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg text-sm transition-colors relative",
        mobile ? "px-3 py-2" : "px-3 py-2.5",
        active
          ? "text-slate-900 font-medium bg-slate-100"
          : "text-slate-400 hover:text-slate-700 hover:bg-slate-50 font-normal"
      )}
    >
      {!mobile && active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-slate-900 rounded-full" />
      )}
      <Icon className="w-4 h-4 shrink-0" />
      <span className={cn(mobile && "hidden sm:inline")}>{label}</span>
      {label === "All Bookings" && pendingCount !== null && pendingCount > 0 && (
        <span className="ml-auto bg-amber-100 text-amber-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">
          {pendingCount}
        </span>
      )}
    </Link>
  );
}

export function AdminNav() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const prevPathname = useRef(pathname);

  function fetchPendingCount() {
    fetch("/api/bookings?status=PENDING")
      .then((r) => r.json())
      .then((data: Booking[]) => setPendingCount(data.length))
      .catch(() => {});
  }

  useEffect(() => { fetchPendingCount(); }, []);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      fetchPendingCount();
    }
  }, [pathname]);

  useEffect(() => {
    const handler = () => fetchPendingCount();
    window.addEventListener("pendingCountChanged", handler);
    return () => window.removeEventListener("pendingCountChanged", handler);
  }, []);

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <>
      {/* Mobile top nav */}
      <header className="md:hidden bg-white border-b border-slate-100 px-5 py-3.5 flex items-center gap-5">
        <Logo />
        <nav className="flex items-center gap-1 ml-2">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href, item.exact)}
              pendingCount={pendingCount}
              mobile
            />
          ))}
        </nav>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-slate-100 shrink-0">
        <div className="px-6 py-6 border-b border-slate-100">
          <Logo />
        </div>
        <nav className="flex-1 px-3 py-5 space-y-0.5">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href, item.exact)}
              pendingCount={pendingCount}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}

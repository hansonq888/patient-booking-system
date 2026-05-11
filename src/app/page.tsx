import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(150deg, #ddeef6 0%, #f0f4f8 40%, #ede9f4 100%)" }}>
      {/* Nav */}
      <header className="px-8 py-5 flex items-center justify-between">
        <Image src="/v-logo.svg" alt="Vero" width={40} height={32} className="h-8 w-auto" />
        <Link
          href="/book"
          className="bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
        >
          Book now <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-24">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-5xl sm:text-6xl font-light text-slate-900 leading-[1.1] tracking-tight">
            The simplest way to book{" "}
            <em className="font-serif italic not-italic" style={{ fontStyle: "italic" }}>
              modern care.
            </em>
          </h1>

          <p className="text-lg text-slate-500 max-w-md mx-auto leading-relaxed">
            Real-time availability, instant confirmation, and a experience that
            feels nothing like a waiting room.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/book"
              className="bg-slate-900 hover:bg-slate-700 text-white font-medium px-6 py-3 rounded-xl transition-colors flex items-center gap-2"
            >
              Book an appointment <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/admin"
              className="bg-white/70 hover:bg-white text-slate-700 font-medium px-6 py-3 rounded-xl border border-slate-200 transition-colors backdrop-blur-sm"
            >
              Admin dashboard
            </Link>
          </div>
        </div>

        {/* Floating stat strip */}
        <div className="mt-20 w-full max-w-xl bg-white/60 backdrop-blur-md rounded-2xl border border-white/80 px-6 py-5 grid grid-cols-3 gap-4 shadow-sm">
          {[
            { value: "4", label: "Physicians" },
            { value: "< 2 min", label: "To book" },
            { value: "100%", label: "Online" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-light text-slate-900">{value}</p>
              <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

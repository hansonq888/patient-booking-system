"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";

const steps = [
  { path: "/book", label: "Physician" },
  { path: "/book/slot", label: "Time" },
  { path: "/book/reason", label: "Reason" },
  { path: "/book/details", label: "Details" },
  { path: "/book/confirm", label: "Review" },
];

const prevPaths: (string | null)[] = [null, "/book", "/book/slot", "/book/reason", "/book/details"];

function getStepIndex(pathname: string) {
  if (pathname.startsWith("/book/confirm")) return 4;
  if (pathname.startsWith("/book/details")) return 3;
  if (pathname.startsWith("/book/reason")) return 2;
  if (pathname.startsWith("/book/slot")) return 1;
  return 0;
}

export default function BookLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/book/success")) {
    return <>{children}</>;
  }

  const currentStep = getStepIndex(pathname);
  const prevPath = prevPaths[currentStep];

  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 grid grid-cols-3 items-center">
          {/* Back button */}
          <div>
            {prevPath ? (
              <Link
                href={prevPath}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Link>
            ) : (
              <Link href="/" className="inline-flex items-center gap-1 text-slate-300 hover:text-slate-500 transition-colors text-sm">
                <ChevronLeft className="w-4 h-4" />
                Home
              </Link>
            )}
          </div>

          {/* Logo center */}
          <div className="flex justify-center">
            <Link href="/">
              <Image src="/v-logo.svg" alt="Vero" width={32} height={26} className="h-7 w-auto" />
            </Link>
          </div>

          {/* Step counter */}
          <div className="flex justify-end">
            <span className="text-xs text-slate-400 tracking-wide uppercase">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto px-6 pb-4">
          <div className="flex gap-1.5">
            {steps.map((step, i) => (
              <div key={step.path} className="flex-1">
                <div
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i <= currentStep ? "bg-slate-800" : "bg-slate-200"
                  }`}
                />
              </div>
            ))}
          </div>
          <div className="flex mt-2">
            {steps.map((step, i) => (
              <div key={step.path} className="flex-1 flex justify-center">
                <span
                  className={`text-xs transition-colors ${
                    i === currentStep
                      ? "text-slate-800 font-medium"
                      : i < currentStep
                      ? "text-slate-400"
                      : "text-slate-300"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}

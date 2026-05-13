"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBooking } from "@/context/BookingContext";

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-shadow";

function Field({
  label,
  id,
  hint,
  error,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function DetailsPage() {
  const router = useRouter();
  const { form, setPatientDetails } = useBooking();

  const [name, setName] = useState(form.patientName);
  const [dob, setDob] = useState(form.patientDob);
  const [phone, setPhone] = useState(form.patientPhone);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!form.reasonChip) {
      router.replace("/book");
    }
  }, [form.reasonChip, router]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Full name is required.";
    if (!dob) errs.dob = "Date of birth is required.";
    if (!phone.trim() || phone.replace(/\D/g, "").length < 7)
      errs.phone = "A valid phone number is required.";
    return errs;
  }

  function handleContinue(e?: FormEvent) {
    e?.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setPatientDetails(name.trim(), dob, phone.trim());
    router.push("/book/confirm");
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-light text-slate-900">
          Your{" "}
          <em className="font-serif" style={{ fontStyle: "italic" }}>
            details
          </em>
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Used to confirm your appointment. Never shared without your consent.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleContinue} noValidate>
        {Object.keys(errors).length > 0 && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Please review the highlighted fields before continuing.
          </div>
        )}
        <Field label="Full name" id="name" error={errors.name}>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((p) => ({ ...p, name: "" }));
            }}
            placeholder="Jane Smith"
            className={inputClass}
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
        </Field>

        <Field
          label="Date of birth"
          id="dob"
          hint="Used to verify your identity at check-in."
          error={errors.dob}
        >
          <input
            id="dob"
            type="date"
            value={dob}
            onChange={(e) => {
              setDob(e.target.value);
              setErrors((p) => ({ ...p, dob: "" }));
            }}
            max={new Date().toISOString().split("T")[0]}
            className={inputClass}
            aria-invalid={Boolean(errors.dob)}
            aria-describedby={errors.dob ? "dob-error" : "dob-hint"}
          />
        </Field>

        <Field label="Phone number" id="phone" hint="Include area code for faster confirmation." error={errors.phone}>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setErrors((p) => ({ ...p, phone: "" }));
            }}
            placeholder="+1 (555) 000-0000"
            className={inputClass}
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "phone-error" : "phone-hint"}
          />
        </Field>
        <button
          type="submit"
          className="w-full min-h-11 bg-slate-900 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors"
        >
          Review booking
        </button>
      </form>
    </div>
  );
}

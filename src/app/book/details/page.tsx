"use client";

import { useEffect, useState } from "react";
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
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-slate-400 uppercase tracking-wide"
      >
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-300">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
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

  function handleContinue() {
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

      <div className="space-y-5">
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
          />
        </Field>

        <Field label="Phone number" id="phone" error={errors.phone}>
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
          />
        </Field>
      </div>

      <button
        onClick={handleContinue}
        className="w-full bg-slate-900 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors"
      >
        Review booking
      </button>
    </div>
  );
}

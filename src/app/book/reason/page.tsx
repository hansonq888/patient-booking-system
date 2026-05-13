"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBooking } from "@/context/BookingContext";

const REASON_CHIPS = [
  "Annual physical",
  "Follow-up",
  "Sick visit",
  "Consultation",
  "Vaccination",
  "Lab review",
];

export default function ReasonPage() {
  const router = useRouter();
  const { form, setReason } = useBooking();
  const [selected, setSelected] = useState(form.reasonChip);
  const [notes, setNotes] = useState(form.reasonNotes);

  useEffect(() => {
    if (!form.slot) {
      router.replace("/book");
    }
  }, [form.slot, router]);

  function handleContinue(e?: FormEvent) {
    e?.preventDefault();
    if (!selected) return;
    setReason(selected, notes);
    router.push("/book/details");
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-light text-slate-900">
          Reason for{" "}
          <em className="font-serif" style={{ fontStyle: "italic" }}>
            visit
          </em>
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Helps your physician prepare for your appointment.
        </p>
      </div>

      <form className="space-y-7" onSubmit={handleContinue}>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
          What brings you in?
        </p>
        <div className="flex flex-wrap gap-2">
          {REASON_CHIPS.map((chip) => (
            <button
              type="button"
              key={chip}
              onClick={() => setSelected(chip)}
              aria-pressed={selected === chip}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                selected === chip
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2"
        >
          Additional notes{" "}
          <span className="normal-case text-slate-400">(optional)</span>
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe your symptoms or any relevant context..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-shadow"
        />
      </div>

      <button
        type="submit"
        disabled={!selected}
        className="w-full min-h-11 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-500 text-white font-medium py-3 rounded-xl transition-colors"
      >
        Continue
      </button>
      </form>
    </div>
  );
}

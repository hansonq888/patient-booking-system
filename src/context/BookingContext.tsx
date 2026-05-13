"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { BookingFormState, Physician, Slot } from "@/lib/types";

const defaultState: BookingFormState = {
  physician: null,
  slot: null,
  reasonChip: "",
  reasonNotes: "",
  patientName: "",
  patientDob: "",
  patientPhone: "",
};
// Versioned key so stale form data from old schemas doesn't break the flow
const BOOKING_STORAGE_KEY = "vero-booking-form-v1";

interface BookingContextType {
  form: BookingFormState;
  setPhysician: (p: Physician) => void;
  setSlot: (s: Slot) => void;
  setReason: (chip: string, notes: string) => void;
  setPatientDetails: (name: string, dob: string, phone: string) => void;
  reset: () => void;
}

const BookingContext = createContext<BookingContextType | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [form, setForm] = useState<BookingFormState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOOKING_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as BookingFormState;
      setForm({ ...defaultState, ...parsed });
    } catch {
      // Ignore stale/invalid local storage payloads.
    } finally {
      setHydrated(true);
    }
  }, []);

  // Hydration guard: skip writing until localStorage has been read to avoid overwriting with defaults
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(form));
  }, [form, hydrated]);

  const setPhysician = (physician: Physician) =>
    setForm((prev) => ({ ...prev, physician, slot: null }));

  const setSlot = (slot: Slot) =>
    setForm((prev) => ({ ...prev, slot }));

  const setReason = (reasonChip: string, reasonNotes: string) =>
    setForm((prev) => ({ ...prev, reasonChip, reasonNotes }));

  const setPatientDetails = (
    patientName: string,
    patientDob: string,
    patientPhone: string
  ) => setForm((prev) => ({ ...prev, patientName, patientDob, patientPhone }));

  const reset = () => {
    setForm(defaultState);
    localStorage.removeItem(BOOKING_STORAGE_KEY);
  };

  return (
    <BookingContext.Provider
      value={{ form, setPhysician, setSlot, setReason, setPatientDetails, reset }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}
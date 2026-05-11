"use client";

import { createContext, useContext, useState, ReactNode } from "react";
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

  const reset = () => setForm(defaultState);

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
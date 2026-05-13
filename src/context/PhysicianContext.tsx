"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Physician } from "@/lib/types";

// Persists selected physician across pages without requiring a server-side session
const STORAGE_KEY = "vero_selected_physician";

interface PhysicianContextType {
  selectedPhysician: Physician | null;
  setSelectedPhysician: (p: Physician) => void;
  clearPhysician: () => void;
}

const PhysicianContext = createContext<PhysicianContextType | null>(null);

export function PhysicianProvider({ children }: { children: ReactNode }) {
  const [selectedPhysician, setSelectedPhysicianState] = useState<Physician | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSelectedPhysicianState(JSON.parse(raw) as Physician);
    } catch {
      // localStorage unavailable or corrupted — start with no selection
    }
  }, []);

  function setSelectedPhysician(p: Physician) {
    setSelectedPhysicianState(p);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
  }

  function clearPhysician() {
    setSelectedPhysicianState(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  return (
    <PhysicianContext.Provider value={{ selectedPhysician, setSelectedPhysician, clearPhysician }}>
      {children}
    </PhysicianContext.Provider>
  );
}

export function usePhysician() {
  const ctx = useContext(PhysicianContext);
  if (!ctx) throw new Error("usePhysician must be used within PhysicianProvider");
  return ctx;
}

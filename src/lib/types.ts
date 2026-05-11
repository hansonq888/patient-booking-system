import { BookingStatus, VisitType } from "@prisma/client";

export type { BookingStatus, VisitType };

export interface Physician {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  initials: string;
  color: string;
  acceptingNew: boolean;
  nextAvailable: string | null;
}

export interface Slot {
  id: string;
  physicianId: string;
  startsAt: string;
  durationMins: number;
  visitType: VisitType;
  isAvailable: boolean;
}

export interface Booking {
  id: string;
  slotId: string;
  patientName: string;
  patientDob: string;
  patientPhone: string;
  reasonChip: string;
  reasonNotes: string | null;
  status: BookingStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  slot: Slot & {
    physician: Physician;
  };
}

export interface BookingFormState {
  physician: Physician | null;
  slot: Slot | null;
  reasonChip: string;
  reasonNotes: string;
  patientName: string;
  patientDob: string;
  patientPhone: string;
}
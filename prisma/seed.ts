import dotenv from "dotenv";
dotenv.config();

import { PrismaClient, VisitType, BookingStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function setTime(date: Date, hour: number, minute = 0): Date {
  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  return result;
}

// Patient roster — reused across bookings so returning visits feel realistic
const PATIENTS = {
  hanson:  { patientName: "Hanson Qin",   patientDob: "1998-07-15", patientPhone: "4165550101" },
  grace:   { patientName: "Grace Wang",   patientDob: "1992-03-28", patientPhone: "4165550102" },
  annie:   { patientName: "Annie Wu",     patientDob: "1965-09-14", patientPhone: "4165550103" },
  daniel:  { patientName: "Daniel Ma",    patientDob: "1987-11-22", patientPhone: "4165550104" },
  jade:    { patientName: "Jade Tao",     patientDob: "2018-04-07", patientPhone: "4165550105" },
  kevin:   { patientName: "Kevin Seo",    patientDob: "1979-06-30", patientPhone: "4165550106" },
  ryan:    { patientName: "Ryan Yu",      patientDob: "1995-12-05", patientPhone: "4165550107" },
  julian:  { patientName: "Julian Chen",  patientDob: "1983-08-18", patientPhone: "4165550108" },
};

async function main() {
  await prisma.booking.deleteMany();
  await prisma.appointmentSlot.deleteMany();
  await prisma.physician.deleteMany();

  const physicians = await Promise.all([
    prisma.physician.create({
      data: {
        name: "Dr. Maya Chen",
        specialty: "Family Medicine",
        bio: "10+ years helping families stay healthy across all stages of life.",
        initials: "MC",
        color: "teal",
        acceptingNew: true,
      },
    }),
    prisma.physician.create({
      data: {
        name: "Dr. David Patel",
        specialty: "Internal Medicine",
        bio: "Focused on complex chronic conditions and preventive care.",
        initials: "DP",
        color: "blue",
        acceptingNew: true,
      },
    }),
    prisma.physician.create({
      data: {
        name: "Dr. Sofia Nguyen",
        specialty: "Dermatology",
        bio: "Specialist in skin health, acne, and cosmetic dermatology.",
        initials: "SN",
        color: "purple",
        acceptingNew: false,
      },
    }),
    prisma.physician.create({
      data: {
        name: "Dr. Aaron Brooks",
        specialty: "Pediatrics",
        bio: "Caring for children from newborns through adolescence.",
        initials: "AB",
        color: "amber",
        acceptingNew: true,
      },
    }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const slotTemplates = [
    { hour: 9,  minute: 0  },
    { hour: 9,  minute: 30 },
    { hour: 10, minute: 0  },
    { hour: 10, minute: 30 },
    { hour: 11, minute: 0  },
    { hour: 13, minute: 0  },
    { hour: 13, minute: 30 },
    { hour: 14, minute: 0  },
    { hour: 14, minute: 30 },
    { hour: 15, minute: 0  },
  ];

  // pastGrid[physicianIdx][pastDayIdx][slotIdx] = slot id
  // pastDayIdx 0 = yesterday (most recent past weekday), 1 = 2 weekdays ago, 2 = 3 weekdays ago
  const pastGrid: string[][][] = physicians.map(() => []);

  // slotGrid[physicianIdx][dayIdx][slotIdx] = slot id
  // Physicians: 0=Chen, 1=Patel, 2=Nguyen, 3=Brooks
  // Days:       0=today, 1=+1d, 2=+2d, 3=+3d, 4=+6d (skips weekend)
  // Slots:      0=9:00, 1=9:30, 2=10:00, 3=10:30, 4=11:00,
  //             5=1:00, 6=1:30, 7=2:00, 8=2:30,  9=3:00
  const slotGrid: string[][][] = physicians.map(() => []);
  let totalSlots = 0;

  for (let pIdx = 0; pIdx < physicians.length; pIdx++) {
    const physician = physicians[pIdx];

    // Past days — go back up to 7 calendar days, collect 3 weekdays
    let pastDayIdx = 0;
    for (let dayOffset = -1; dayOffset >= -7 && pastDayIdx < 3; dayOffset--) {
      const date = addDays(today, dayOffset);
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      pastGrid[pIdx][pastDayIdx] = [];

      for (const template of slotTemplates) {
        const startsAt = setTime(date, template.hour, template.minute);
        const visitType = template.hour < 12 ? VisitType.IN_PERSON : VisitType.VIRTUAL;

        const slot = await prisma.appointmentSlot.create({
          data: { physicianId: physician.id, startsAt, durationMins: 30, visitType, isAvailable: true },
        });

        pastGrid[pIdx][pastDayIdx].push(slot.id);
        totalSlots++;
      }

      pastDayIdx++;
    }

    // Future days (today + 7 calendar days)
    let dayIdx = 0;
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const date = addDays(today, dayOffset);
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      slotGrid[pIdx][dayIdx] = [];

      for (const template of slotTemplates) {
        const startsAt = setTime(date, template.hour, template.minute);
        const visitType = template.hour < 12 ? VisitType.IN_PERSON : VisitType.VIRTUAL;

        const slot = await prisma.appointmentSlot.create({
          data: { physicianId: physician.id, startsAt, durationMins: 30, visitType, isAvailable: true },
        });

        slotGrid[pIdx][dayIdx].push(slot.id);
        totalSlots++;
      }

      dayIdx++;
    }
  }

  function slotId(pIdx: number, dayIdx: number, slotIdx: number) {
    return slotGrid[pIdx][dayIdx][slotIdx];
  }

  function pastSlotId(pIdx: number, pastDayIdx: number, slotIdx: number) {
    return pastGrid[pIdx][pastDayIdx][slotIdx];
  }

  const seedBookings: {
    slotId: string;
    patientName: string;
    patientDob: string;
    patientPhone: string;
    reasonChip: string;
    reasonNotes: string | null;
    status: BookingStatus;
    adminNotes: string | null;
  }[] = [
    // ── Day 0 (today) ──────────────────────────────────────────────
    {
      slotId: slotId(0, 0, 0), // Chen 9:00 AM
      ...PATIENTS.hanson,
      reasonChip: "Routine checkup",
      reasonNotes: null,
      status: BookingStatus.CONFIRMED,
      adminNotes: "Patient has been seen before. No new concerns.",
    },
    {
      slotId: slotId(0, 0, 2), // Chen 10:00 AM
      ...PATIENTS.grace,
      reasonChip: "Follow-up",
      reasonNotes: "Following up on blood pressure results from last visit.",
      status: BookingStatus.PENDING,
      adminNotes: null,
    },
    {
      slotId: slotId(1, 0, 1), // Patel 9:30 AM
      ...PATIENTS.annie,
      reasonChip: "New concern",
      reasonNotes: "Experiencing fatigue and shortness of breath for 2 weeks.",
      status: BookingStatus.CONFIRMED,
      adminNotes: "Order bloodwork before appointment.",
    },
    {
      slotId: slotId(1, 0, 5), // Patel 1:00 PM
      ...PATIENTS.daniel,
      reasonChip: "Test results",
      reasonNotes: null,
      status: BookingStatus.PENDING,
      adminNotes: null,
    },
    {
      slotId: slotId(3, 0, 3), // Brooks 10:30 AM
      ...PATIENTS.jade,
      reasonChip: "Routine checkup",
      reasonNotes: "Annual wellness visit.",
      status: BookingStatus.CONFIRMED,
      adminNotes: null,
    },

    // ── Day 1 ───────────────────────────────────────────────────────
    {
      slotId: slotId(0, 1, 0), // Chen 9:00 AM
      ...PATIENTS.kevin,
      reasonChip: "Prescription renewal",
      reasonNotes: null,
      status: BookingStatus.CONFIRMED,
      adminNotes: null,
    },
    {
      slotId: slotId(0, 1, 6), // Chen 1:30 PM
      ...PATIENTS.ryan,
      reasonChip: "New concern",
      reasonNotes: "Recurring headaches and dizziness over the past month.",
      status: BookingStatus.PENDING,
      adminNotes: null,
    },
    {
      slotId: slotId(1, 1, 2), // Patel 10:00 AM
      ...PATIENTS.julian,
      reasonChip: "Follow-up",
      reasonNotes: "Checking in after diabetes management plan started 6 weeks ago.",
      status: BookingStatus.CONFIRMED,
      adminNotes: "Review A1C results.",
    },
    {
      slotId: slotId(3, 1, 4), // Brooks 11:00 AM
      ...PATIENTS.grace,
      reasonChip: "New concern",
      reasonNotes: "Persistent cough for 5 days.",
      status: BookingStatus.PENDING,
      adminNotes: null,
    },
    {
      slotId: slotId(2, 1, 1), // Nguyen 9:30 AM
      ...PATIENTS.daniel,
      reasonChip: "Routine checkup",
      reasonNotes: null,
      status: BookingStatus.CONFIRMED,
      adminNotes: null,
    },

    // ── Day 2 ───────────────────────────────────────────────────────
    {
      slotId: slotId(0, 2, 1), // Chen 9:30 AM
      ...PATIENTS.hanson,
      reasonChip: "Follow-up",
      reasonNotes: "Post-surgery check-in.",
      status: BookingStatus.PENDING,
      adminNotes: null,
    },
    {
      slotId: slotId(1, 2, 7), // Patel 2:00 PM
      ...PATIENTS.annie,
      reasonChip: "Routine checkup",
      reasonNotes: null,
      status: BookingStatus.CANCELLED,
      adminNotes: "Patient cancelled — rescheduling next week.",
    },
    {
      slotId: slotId(3, 2, 0), // Brooks 9:00 AM
      ...PATIENTS.jade,
      reasonChip: "Routine checkup",
      reasonNotes: "Annual physical.",
      status: BookingStatus.CONFIRMED,
      adminNotes: null,
    },
    {
      slotId: slotId(2, 2, 3), // Nguyen 10:30 AM
      ...PATIENTS.kevin,
      reasonChip: "Prescription renewal",
      reasonNotes: null,
      status: BookingStatus.PENDING,
      adminNotes: null,
    },

    // ── Day 3 ───────────────────────────────────────────────────────
    {
      slotId: slotId(0, 3, 5), // Chen 1:00 PM
      ...PATIENTS.grace,
      reasonChip: "Follow-up",
      reasonNotes: "Following up on cholesterol panel from last visit.",
      status: BookingStatus.PENDING,
      adminNotes: null,
    },
    {
      slotId: slotId(1, 3, 0), // Patel 9:00 AM
      ...PATIENTS.ryan,
      reasonChip: "New concern",
      reasonNotes: "Chest tightness and irregular heartbeat reported.",
      status: BookingStatus.CONFIRMED,
      adminNotes: "Refer to cardiology if EKG shows abnormalities.",
    },
    {
      slotId: slotId(3, 3, 6), // Brooks 1:30 PM
      ...PATIENTS.julian,
      reasonChip: "Routine checkup",
      reasonNotes: null,
      status: BookingStatus.PENDING,
      adminNotes: null,
    },

    // ── Past day 0 (yesterday) ─────────────────────────────────────
    {
      slotId: pastSlotId(0, 0, 0), // Chen 9:00 AM
      ...PATIENTS.hanson,
      reasonChip: "Routine checkup",
      reasonNotes: null,
      status: BookingStatus.CONFIRMED,
      adminNotes: null,
    },
    {
      slotId: pastSlotId(1, 0, 2), // Patel 10:00 AM
      ...PATIENTS.annie,
      reasonChip: "Follow-up",
      reasonNotes: "Checking in on fatigue symptoms after initial visit.",
      status: BookingStatus.CONFIRMED,
      adminNotes: "Patient reported improvement. Monitor for another 2 weeks.",
    },
    {
      slotId: pastSlotId(3, 0, 5), // Brooks 1:00 PM
      ...PATIENTS.jade,
      reasonChip: "Routine checkup",
      reasonNotes: "Annual wellness visit.",
      status: BookingStatus.CONFIRMED,
      adminNotes: null,
    },

    // ── Past day 1 (2 weekdays ago) ─────────────────────────────────
    {
      slotId: pastSlotId(0, 1, 1), // Chen 9:30 AM
      ...PATIENTS.grace,
      reasonChip: "New concern",
      reasonNotes: "Recurring headaches and mild dizziness.",
      status: BookingStatus.CONFIRMED,
      adminNotes: "Referred for MRI. Follow-up in 2 weeks.",
    },
    {
      slotId: pastSlotId(1, 1, 6), // Patel 1:30 PM
      ...PATIENTS.daniel,
      reasonChip: "Test results",
      reasonNotes: null,
      status: BookingStatus.CONFIRMED,
      adminNotes: null,
    },
    {
      slotId: pastSlotId(2, 1, 0), // Nguyen 9:00 AM
      ...PATIENTS.kevin,
      reasonChip: "Prescription renewal",
      reasonNotes: null,
      status: BookingStatus.CANCELLED,
      adminNotes: "Patient no-show.",
    },

    // ── Past day 2 (3 weekdays ago) ─────────────────────────────────
    {
      slotId: pastSlotId(3, 2, 3), // Brooks 10:30 AM
      ...PATIENTS.ryan,
      reasonChip: "Routine checkup",
      reasonNotes: "Annual physical.",
      status: BookingStatus.CONFIRMED,
      adminNotes: null,
    },
    {
      slotId: pastSlotId(0, 2, 7), // Chen 2:00 PM
      ...PATIENTS.julian,
      reasonChip: "Follow-up",
      reasonNotes: "Post-surgery check-in at 3 weeks.",
      status: BookingStatus.CONFIRMED,
      adminNotes: "Recovery on track. No further follow-up needed.",
    },

    // ── Day 4 (next Monday) ─────────────────────────────────────────
    {
      slotId: slotId(0, 4, 2), // Chen 10:00 AM
      ...PATIENTS.grace,
      reasonChip: "Prescription renewal",
      reasonNotes: null,
      status: BookingStatus.PENDING,
      adminNotes: null,
    },
    {
      slotId: slotId(1, 4, 4), // Patel 11:00 AM
      ...PATIENTS.annie,
      reasonChip: "Follow-up",
      reasonNotes: "Reviewing bloodwork results from last week's visit.",
      status: BookingStatus.PENDING,
      adminNotes: null,
    },
    {
      slotId: slotId(3, 4, 1), // Brooks 9:30 AM
      ...PATIENTS.daniel,
      reasonChip: "Routine checkup",
      reasonNotes: "Annual physical.",
      status: BookingStatus.CONFIRMED,
      adminNotes: null,
    },
  ];

  for (const b of seedBookings) {
    await prisma.booking.create({
      data: {
        slotId: b.slotId,
        patientName: b.patientName,
        patientDob: b.patientDob,
        patientPhone: b.patientPhone,
        reasonChip: b.reasonChip,
        reasonNotes: b.reasonNotes,
        status: b.status,
        adminNotes: b.adminNotes,
      },
    });

    await prisma.appointmentSlot.update({
      where: { id: b.slotId },
      data: { isAvailable: false },
    });
  }

  console.log("Seed complete.");
  console.log(`  ${physicians.length} physicians`);
  console.log(`  ${totalSlots} slots`);
  console.log(`  ${seedBookings.length} bookings spread across 8 days (3 past + 5 upcoming)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

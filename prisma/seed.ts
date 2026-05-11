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

  const allSlots: { id: string; physicianId: string }[] = [];

  for (const physician of physicians) {
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const date = addDays(today, dayOffset);
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      for (const template of slotTemplates) {
        const startsAt = setTime(date, template.hour, template.minute);
        const visitType =
          template.hour < 12 ? VisitType.IN_PERSON : VisitType.VIRTUAL;

        const slot = await prisma.appointmentSlot.create({
          data: {
            physicianId: physician.id,
            startsAt,
            durationMins: 30,
            visitType,
            isAvailable: true,
          },
        });

        allSlots.push({ id: slot.id, physicianId: physician.id });
      }
    }
  }

  const slotsForChen = allSlots.filter(
    (s) => s.physicianId === physicians[0].id
  );
  const slotsForPatel = allSlots.filter(
    (s) => s.physicianId === physicians[1].id
  );
  const slotsForBrooks = allSlots.filter(
    (s) => s.physicianId === physicians[3].id
  );

  const seedBookings = [
    {
      slot: slotsForChen[0],
      patientName: "James Whitfield",
      patientDob: "1985-03-12",
      patientPhone: "4165550101",
      reasonChip: "Routine checkup",
      reasonNotes: null,
      status: BookingStatus.CONFIRMED,
      adminNotes: "Patient has been seen before. No new concerns.",
    },
    {
      slot: slotsForChen[1],
      patientName: "Priya Sharma",
      patientDob: "1992-07-24",
      patientPhone: "4165550102",
      reasonChip: "Follow-up",
      reasonNotes: "Following up on blood pressure results from last visit.",
      status: BookingStatus.PENDING,
      adminNotes: null,
    },
    {
      slot: slotsForChen[2],
      patientName: "Marcus Johnson",
      patientDob: "1978-11-05",
      patientPhone: "4165550103",
      reasonChip: "Prescription renewal",
      reasonNotes: null,
      status: BookingStatus.PENDING,
      adminNotes: null,
    },
    {
      slot: slotsForPatel[0],
      patientName: "Linda Okafor",
      patientDob: "1965-01-30",
      patientPhone: "4165550104",
      reasonChip: "New concern",
      reasonNotes: "Experiencing fatigue and shortness of breath for 2 weeks.",
      status: BookingStatus.CONFIRMED,
      adminNotes: "Order bloodwork before appointment.",
    },
    {
      slot: slotsForPatel[1],
      patientName: "Tom Bergmann",
      patientDob: "1990-09-18",
      patientPhone: "4165550105",
      reasonChip: "Test results",
      reasonNotes: null,
      status: BookingStatus.PENDING,
      adminNotes: null,
    },
    {
      slot: slotsForPatel[2],
      patientName: "Chloe Martin",
      patientDob: "1998-04-02",
      patientPhone: "4165550106",
      reasonChip: "Routine checkup",
      reasonNotes: null,
      status: BookingStatus.CANCELLED,
      adminNotes: "Patient cancelled — rescheduling next week.",
    },
    {
      slot: slotsForBrooks[0],
      patientName: "Aisha Diallo",
      patientDob: "2018-06-15",
      patientPhone: "4165550107",
      reasonChip: "Routine checkup",
      reasonNotes: "Annual wellness visit.",
      status: BookingStatus.CONFIRMED,
      adminNotes: null,
    },
    {
      slot: slotsForBrooks[1],
      patientName: "Noah Kim",
      patientDob: "2020-02-28",
      patientPhone: "4165550108",
      reasonChip: "New concern",
      reasonNotes: "Persistent cough for 5 days.",
      status: BookingStatus.PENDING,
      adminNotes: null,
    },
  ];

  for (const b of seedBookings) {
    await prisma.booking.create({
      data: {
        slotId: b.slot.id,
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
      where: { id: b.slot.id },
      data: { isAvailable: false },
    });
  }

  console.log("Seed complete.");
  console.log(`  ${physicians.length} physicians`);
  console.log(`  ${allSlots.length} slots`);
  console.log(`  ${seedBookings.length} bookings`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
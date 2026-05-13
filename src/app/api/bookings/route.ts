import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const createSchema = z.object({
  slotId: z.string().min(1),
  patientName: z.string().min(1, "Name is required"),
  patientDob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  patientPhone: z.string().min(7, "Phone is required"),
  reasonChip: z.string().min(1, "Reason is required"),
  reasonNotes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const physicianId = searchParams.get("physicianId");
    const search = searchParams.get("search");
    const date = searchParams.get("date");
    const period = searchParams.get("period");
    const sort = searchParams.get("sort");
    const rangeFromParam = searchParams.get("rangeFrom");
    const rangeToParam = searchParams.get("rangeTo");

    const where: Record<string, unknown> = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.patientName = {
        contains: search,
        mode: "insensitive",
      };
    }

    const slotWhere: Record<string, unknown> = {};
    if (physicianId) {
      slotWhere.physicianId = physicianId;
    }

    // Inbox queries sort by creation date and skip all slot-date filters
    if (sort === "created") {
      if (Object.keys(slotWhere).length > 0) where.slot = slotWhere;
      const bookings = await prisma.booking.findMany({
        where,
        include: { slot: { include: { physician: true } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(bookings);
    }

    // Calendar queries pass an explicit date range; skip period/today filters to avoid conflict
    let useRange = false;
    if (rangeFromParam && rangeToParam) {
      const from = new Date(rangeFromParam);
      const to = new Date(rangeToParam);
      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
        slotWhere.startsAt = { gte: from, lte: to };
        useRange = true;
      }
    }

    if (!useRange && date === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      slotWhere.startsAt = { gte: start, lte: end };
    }

    if (!useRange && date !== "today") {
      if (period === "upcoming") {
        slotWhere.startsAt = { gt: new Date() };
      } else if (period === "past") {
        slotWhere.startsAt = { lt: new Date() };
      }
    }

    if (Object.keys(slotWhere).length > 0) {
      where.slot = slotWhere;
    }

    // Past bookings show newest first; all other queries show soonest first
    const orderDir = !useRange && period === "past" ? "desc" : "asc";

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        slot: {
          include: {
            physician: true,
          },
        },
      },
      orderBy: { slot: { startsAt: orderDir } },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { slotId, patientName, patientDob, patientPhone, reasonChip, reasonNotes } =
      parsed.data;

    // Transaction prevents double-booking if two requests check the slot simultaneously
    const booking = await prisma.$transaction(async (tx) => {
      const slot = await tx.appointmentSlot.findUnique({
        where: { id: slotId },
      });

      if (!slot) {
        throw new Error("SLOT_NOT_FOUND");
      }

      if (!slot.isAvailable) {
        throw new Error("SLOT_UNAVAILABLE");
      }

      const activeBooking = await tx.booking.findFirst({
        where: { slotId, status: { not: "CANCELLED" } },
      });
      if (activeBooking) {
        throw new Error("SLOT_UNAVAILABLE");
      }

      await tx.appointmentSlot.update({
        where: { id: slotId },
        data: { isAvailable: false },
      });

      return tx.booking.create({
        data: {
          slotId,
          patientName,
          patientDob,
          patientPhone: patientPhone.replace(/\D/g, ""),
          reasonChip,
          reasonNotes,
          status: "PENDING",
        },
        include: {
          slot: {
            include: { physician: true },
          },
        },
      });
    });

    return NextResponse.json(
      { bookingId: booking.id, status: booking.status },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SLOT_UNAVAILABLE") {
        return NextResponse.json(
          { error: "This slot was just taken. Please choose another time." },
          { status: 409 }
        );
      }
      if (error.message === "SLOT_NOT_FOUND") {
        return NextResponse.json(
          { error: "Slot not found." },
          { status: 404 }
        );
      }
    }
    // Unique constraint fallback in case the transaction race check was bypassed at the DB level
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This slot was just taken. Please choose another time." },
        { status: 409 }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
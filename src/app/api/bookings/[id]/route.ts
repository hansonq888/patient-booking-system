import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";

const updateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
  adminNotes: z.string().optional(),
});

const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CANCELLED"],
  CANCELLED: [],
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        slot: {
          include: { physician: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status: newStatus, adminNotes } = parsed.data;

    const existing = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (newStatus && newStatus !== existing.status) {
      const allowed = VALID_TRANSITIONS[existing.status];
      if (!allowed.includes(newStatus)) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${existing.status} to ${newStatus}`,
          },
          { status: 400 }
        );
      }
    }

    const booking = await prisma.$transaction(async (tx) => {
      if (newStatus === "CANCELLED" && existing.status !== "CANCELLED") {
        await tx.appointmentSlot.update({
          where: { id: existing.slotId },
          data: { isAvailable: true },
        });
      }

      return tx.booking.update({
        where: { id },
        data: {
          ...(newStatus && { status: newStatus }),
          ...(adminNotes !== undefined && { adminNotes }),
        },
        include: {
          slot: {
            include: { physician: true },
          },
        },
      });
    });

    return NextResponse.json(booking);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
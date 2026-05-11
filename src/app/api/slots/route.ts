import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const querySchema = z.object({
  physicianId: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      physicianId: searchParams.get("physicianId"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "physicianId is required" },
        { status: 400 }
      );
    }

    const slots = await prisma.appointmentSlot.findMany({
      where: {
        physicianId: parsed.data.physicianId,
        isAvailable: true,
        startsAt: { gt: new Date() },
      },
      orderBy: { startsAt: "asc" },
    });

    return NextResponse.json(slots);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch slots" },
      { status: 500 }
    );
  }
}
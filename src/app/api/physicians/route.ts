import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const physicians = await prisma.physician.findMany({
      orderBy: { name: "asc" },
      include: {
        slots: {
          where: {
            isAvailable: true,
            startsAt: { gt: new Date() },
          },
          orderBy: { startsAt: "asc" },
          take: 1,
        },
      },
    });

    const result = physicians.map((p) => ({
      id: p.id,
      name: p.name,
      specialty: p.specialty,
      bio: p.bio,
      initials: p.initials,
      color: p.color,
      acceptingNew: p.acceptingNew,
      nextAvailable: p.slots[0]?.startsAt ?? null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch physicians" },
      { status: 500 }
    );
  }
}
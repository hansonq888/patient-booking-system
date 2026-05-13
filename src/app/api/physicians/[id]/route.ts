import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  if (typeof body.acceptingNew !== "boolean") {
    return NextResponse.json({ error: "acceptingNew must be a boolean" }, { status: 400 });
  }

  try {
    const physician = await prisma.physician.update({
      where: { id },
      data: { acceptingNew: body.acceptingNew },
    });
    return NextResponse.json({ acceptingNew: physician.acceptingNew });
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

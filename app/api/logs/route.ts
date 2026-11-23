import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorized,
  serverError,
  toStr,
  toInt,
} from "@/lib/api";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const { searchParams } = req.nextUrl;
    const entity = toStr(searchParams.get("entity"));
    const action = toStr(searchParams.get("action"));
    const limit = Math.min(
      Math.max(toInt(searchParams.get("limit"), 100) ?? 100, 1),
      500
    );

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(entity ? { entity } : {}),
        ...(action ? { action } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(logs);
  } catch (error) {
    return serverError(error);
  }
}

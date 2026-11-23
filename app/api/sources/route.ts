import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorized,
  badRequest,
  serverError,
  readJson,
  toStr,
  toInt,
} from "@/lib/api";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const sources = await prisma.contentSource.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { facts: true } } },
    });
    return NextResponse.json(sources);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await readJson(req);
    const name = toStr(body.name);
    if (!name) return badRequest("Informe o nome da fonte.");

    const source = await prisma.contentSource.create({
      data: {
        name,
        type: toStr(body.type, "official") as string,
        url: toStr(body.url),
        platform: toStr(body.platform),
        reliability: toInt(body.reliability, 0) ?? 0,
        active: body.active === undefined ? true : Boolean(body.active),
      },
    });

    await logAudit({
      userId: user.id,
      action: "create",
      entity: "ContentSource",
      entityId: source.id,
      details: name,
    });

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}

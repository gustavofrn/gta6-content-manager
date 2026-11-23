import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorized,
  badRequest,
  serverError,
  readJson,
  toStr,
} from "@/lib/api";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const creators = await prisma.creator.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { mediaAssets: true } } },
    });
    return NextResponse.json(creators);
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
    const platform = toStr(body.platform);
    const handle = toStr(body.handle);
    if (!name) return badRequest("Informe o nome do criador.");
    if (!platform) return badRequest("Informe a plataforma.");
    if (!handle) return badRequest("Informe o @handle.");

    const creator = await prisma.creator.create({
      data: {
        name,
        platform,
        handle,
        url: toStr(body.url),
        canReuse: Boolean(body.canReuse),
        permissionNotes: toStr(body.permissionNotes),
      },
    });

    await logAudit({
      userId: user.id,
      action: "create",
      entity: "Creator",
      entityId: creator.id,
      details: `${name} (${handle})`,
    });

    return NextResponse.json(creator, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
  readJson,
} from "@/lib/api";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return notFound("Notificação não encontrada.");
    }

    const body = await readJson(req);
    const read = body.read === undefined ? true : Boolean(body.read);

    const notification = await prisma.notification.update({
      where: { id },
      data: { read },
    });

    await logAudit({
      userId: user.id,
      action: read ? "read" : "unread",
      entity: "Notification",
      entityId: id,
      details: existing.title,
    });

    return NextResponse.json(notification);
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}

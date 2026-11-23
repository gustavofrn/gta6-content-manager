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

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const unread = req.nextUrl.searchParams.get("unread");
    const onlyUnread = unread === "1" || unread === "true";

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(onlyUnread ? { read: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(notifications);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await readJson(req);
    const title = toStr(body.title);
    const message = toStr(body.message);
    if (!title || !message) {
      return badRequest("Informe título e mensagem da notificação.");
    }

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: toStr(body.type, "info") as string,
        title,
        message,
      },
    });

    await logAudit({
      userId: user.id,
      action: "create",
      entity: "Notification",
      entityId: notification.id,
      details: title,
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}

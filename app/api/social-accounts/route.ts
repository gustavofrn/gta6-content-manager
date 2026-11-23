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
    const accounts = await prisma.socialAccount.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { scheduledPosts: true } } },
    });
    return NextResponse.json(accounts);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await readJson(req);
    const platform = toStr(body.platform);
    const handle = toStr(body.handle);
    const name = toStr(body.name);
    if (!platform) return badRequest("Informe a plataforma.");
    if (!handle) return badRequest("Informe o @handle da conta.");
    if (!name) return badRequest("Informe o nome da conta.");

    const connected =
      body.connected === undefined ? false : Boolean(body.connected);

    const account = await prisma.socialAccount.create({
      data: { platform, handle, name, connected, userId: user.id },
    });

    if (connected) {
      await prisma.socialConnection.create({
        data: {
          socialAccountId: account.id,
          provider: platform,
          connectedAt: new Date(),
        },
      });
    }

    await logAudit({
      userId: user.id,
      action: "create",
      entity: "SocialAccount",
      entityId: account.id,
      details: `${platform} ${handle}`,
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}

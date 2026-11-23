import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
  readJson,
  toStr,
} from "@/lib/api";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.socialAccount.findUnique({ where: { id } });
    if (!existing) return notFound("Conta não encontrada.");

    const body = await readJson(req);
    const platform = toStr(body.platform, existing.platform) as string;
    const connected =
      body.connected === undefined ? existing.connected : Boolean(body.connected);

    const account = await prisma.socialAccount.update({
      where: { id },
      data: {
        platform,
        handle: toStr(body.handle, existing.handle) as string,
        name: toStr(body.name, existing.name) as string,
        connected,
      },
    });

    // Ao marcar como conectada, cria/atualiza o registro de conexão.
    if (connected) {
      const connection = await prisma.socialConnection.findFirst({
        where: { socialAccountId: id },
      });
      if (connection) {
        await prisma.socialConnection.update({
          where: { id: connection.id },
          data: { provider: platform, connectedAt: new Date() },
        });
      } else {
        await prisma.socialConnection.create({
          data: {
            socialAccountId: id,
            provider: platform,
            connectedAt: new Date(),
          },
        });
      }
    }

    await logAudit({
      userId: user.id,
      action: "update",
      entity: "SocialAccount",
      entityId: id,
      details: `${account.platform} ${account.handle}`,
    });

    return NextResponse.json(account);
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.socialAccount.findUnique({
      where: { id },
      include: { _count: { select: { scheduledPosts: true } } },
    });
    if (!existing) return notFound("Conta não encontrada.");
    if (existing._count.scheduledPosts > 0) {
      return badRequest(
        "Não é possível excluir: existem publicações agendadas para esta conta."
      );
    }

    await prisma.$transaction([
      prisma.socialConnection.deleteMany({ where: { socialAccountId: id } }),
      prisma.socialAccount.delete({ where: { id } }),
    ]);

    await logAudit({
      userId: user.id,
      action: "delete",
      entity: "SocialAccount",
      entityId: id,
      details: `${existing.platform} ${existing.handle}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}

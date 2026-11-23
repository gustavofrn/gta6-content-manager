import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from "@/lib/api";
import { logAudit, notify } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;

  try {
    const job = await prisma.automationJob.findUnique({ where: { id } });
    if (!job) return notFound("Automação não encontrada.");

    if (job.type !== "approval_reminder") {
      const reason =
        "Este tipo de automação exige integração externa e não pode ser executado manualmente aqui.";
      await prisma.automationJob.update({
        where: { id },
        data: {
          lastRunAt: new Date(),
          lastStatus: "failed",
          lastError: reason,
        },
      });
      await logAudit({
        userId: user.id,
        action: "run",
        entity: "AutomationJob",
        entityId: id,
        details: `Falha: ${reason}`,
      });
      return badRequest(`"${job.name}": ${reason}`);
    }

    const drafts = await prisma.contentDraft.findMany({
      where: { status: "pending_approval" },
      orderBy: { createdAt: "desc" },
      select: { title: true },
    });

    const count = drafts.length;
    const titles = drafts
      .slice(0, 5)
      .map((d) => d.title)
      .join(", ");
    const title =
      count === 0
        ? "Nenhum conteúdo aguardando aprovação"
        : `${count} conteúdo(s) aguardando aprovação`;
    const message =
      count === 0
        ? "Não há rascunhos com status de aprovação pendente no momento."
        : `Rascunhos pendentes: ${titles}${count > 5 ? "…" : ""}`;

    await notify({
      userId: user.id,
      type: "approval_reminder",
      title,
      message,
    });

    const updated = await prisma.automationJob.update({
      where: { id },
      data: { lastRunAt: new Date(), lastStatus: "success", lastError: null },
    });

    await logAudit({
      userId: user.id,
      action: "run",
      entity: "AutomationJob",
      entityId: id,
      details: `${job.name}: ${title}`,
    });

    return NextResponse.json({ job: updated, count });
  } catch (error) {
    await prisma.automationJob
      .update({
        where: { id },
        data: {
          lastRunAt: new Date(),
          lastStatus: "failed",
          lastError:
            error instanceof Error ? error.message : "Erro desconhecido",
        },
      })
      .catch(() => undefined);
    await logAudit({
      userId: user.id,
      action: "run",
      entity: "AutomationJob",
      entityId: id,
      details: "Erro ao executar automação",
    });
    return serverError(error);
  }
}

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
import { logAudit, notify } from "@/lib/audit";

const DECISIONS: Record<string, string> = {
  approved: "approved",
  rejected: "rejected",
  change_requested: "draft",
};

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const draftId = req.nextUrl.searchParams.get("draftId");
    const approvals = await prisma.approval.findMany({
      where: draftId ? { draftId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        draft: { select: { id: true, title: true, status: true } },
      },
    });
    return NextResponse.json(approvals);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await readJson(req);
    const draftId = toStr(body.draftId);
    const decision = toStr(body.decision);
    if (!draftId) return badRequest("Informe a publicação.");
    if (!decision || !(decision in DECISIONS)) {
      return badRequest("Decisão inválida.");
    }

    const draft = await prisma.contentDraft.findUnique({ where: { id: draftId } });
    if (!draft) return notFound("Publicação não encontrada.");

    const comment = toStr(body.comment);

    const approval = await prisma.approval.create({
      data: { draftId, userId: user.id, decision, comment },
    });

    const newStatus = DECISIONS[decision];
    await prisma.contentDraft.update({
      where: { id: draftId },
      data: { status: newStatus },
    });

    const decisionLabel =
      decision === "approved"
        ? "aprovada"
        : decision === "rejected"
          ? "rejeitada"
          : "devolvida com pedido de alteração";

    await notify({
      userId: draft.userId,
      type: "approval",
      title: `Publicação ${decisionLabel}`,
      message: comment
        ? `"${draft.title}": ${comment}`
        : `"${draft.title}" foi ${decisionLabel}.`,
    });

    await logAudit({
      userId: user.id,
      action: "decide",
      entity: "Approval",
      entityId: approval.id,
      details: `${draft.title} → ${decision}`,
    });

    return NextResponse.json(approval, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}

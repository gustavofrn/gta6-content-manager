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

const PILLARS = [
  "news",
  "tips",
  "gameplay",
  "nostalgia",
  "spotlight",
  "countdown",
  "question",
];

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const status = req.nextUrl.searchParams.get("status");
    const drafts = await prisma.contentDraft.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        fact: { select: { id: true, title: true } },
        mediaAsset: { select: { id: true, url: true, type: true } },
        scheduledPost: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            socialAccount: { select: { id: true, platform: true, handle: true } },
          },
        },
      },
    });
    return NextResponse.json(drafts);
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
    const pillar = toStr(body.pillar, "news") as string;
    if (!title) return badRequest("Informe o título da publicação.");
    if (!PILLARS.includes(pillar)) return badRequest("Pilar inválido.");

    const draft = await prisma.contentDraft.create({
      data: {
        title,
        caption: toStr(body.caption),
        pillar,
        hook: toStr(body.hook),
        factId: toStr(body.factId),
        mediaAssetId: toStr(body.mediaAssetId),
        userId: user.id,
        status: "draft",
      },
      include: {
        fact: { select: { id: true, title: true } },
        mediaAsset: { select: { id: true, url: true, type: true } },
      },
    });

    await logAudit({
      userId: user.id,
      action: "create",
      entity: "ContentDraft",
      entityId: draft.id,
      details: title,
    });

    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
      return badRequest(error.message);
    }
    return serverError(error);
  }
}

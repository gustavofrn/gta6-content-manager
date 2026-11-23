import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EngajamentoClient, {
  type EngajamentoPost,
  type EngajamentoRecordRow,
  type EngajamentoSummary,
} from "./EngajamentoClient";

export const dynamic = "force-dynamic";

export default async function EngajamentoPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [posts, engagements] = await Promise.all([
    prisma.publishedPost.findMany({
      orderBy: { publishedAt: "desc" },
      include: {
        scheduledPost: {
          select: {
            socialAccount: { select: { platform: true, handle: true } },
            draft: { select: { title: true } },
          },
        },
      },
    }),
    prisma.engagementRecord.findMany({
      orderBy: { recordedAt: "desc" },
    }),
  ]);

  const sumField = (
    records: typeof engagements,
    key: "likes" | "comments" | "shares" | "saves" | "views"
  ) => records.reduce((acc, r) => acc + r[key], 0);

  const postsData: EngajamentoPost[] = posts.map((p) => {
    const recs = engagements.filter((r) => r.publishedPostId === p.id);
    return {
      id: p.id,
      title: p.scheduledPost?.draft?.title ?? "Sem título",
      url: p.url,
      platform: p.scheduledPost?.socialAccount?.platform ?? null,
      handle: p.scheduledPost?.socialAccount?.handle ?? "",
      publishedAt: p.publishedAt,
      likes: sumField(recs, "likes"),
      comments: sumField(recs, "comments"),
      shares: sumField(recs, "shares"),
      saves: sumField(recs, "saves"),
      views: sumField(recs, "views"),
    };
  });

  const postTitleById = new Map(postsData.map((p) => [p.id, p]));

  const engagementsData: EngajamentoRecordRow[] = engagements.slice(0, 20).map((r) => {
    const post = postTitleById.get(r.publishedPostId);
    return {
      id: r.id,
      likes: r.likes,
      comments: r.comments,
      shares: r.shares,
      saves: r.saves,
      views: r.views,
      recordedAt: r.recordedAt,
      postTitle: post?.title ?? "Publicação",
      platform: post?.platform ?? null,
    };
  });

  const likes = sumField(engagements, "likes");
  const comments = sumField(engagements, "comments");
  const shares = sumField(engagements, "shares");
  const saves = sumField(engagements, "saves");
  const views = sumField(engagements, "views");

  const summary: EngajamentoSummary = {
    likes,
    comments,
    shares,
    saves,
    views,
    rate: views > 0 ? (((likes + comments + shares) / views) * 100).toFixed(2) : "0.00",
    records: engagements.length,
  };

  return (
    <EngajamentoClient
      posts={postsData}
      engagements={engagementsData}
      summary={summary}
    />
  );
}

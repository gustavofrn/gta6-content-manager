import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import AnalyticsClient, {
  type AnalyticsDay,
  type AnalyticsPostOption,
  type AnalyticsSnapshotRow,
  type AnalyticsSummary,
  type AnalyticsTopPost,
} from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [posts, engagements, snapshots, experiments] = await Promise.all([
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
    prisma.engagementRecord.findMany({ orderBy: { recordedAt: "desc" } }),
    prisma.metricSnapshot.findMany({
      orderBy: { recordedAt: "desc" },
      include: {
        publishedPost: {
          select: {
            id: true,
            scheduledPost: { select: { draft: { select: { title: true } } } },
          },
        },
        experiment: { select: { id: true, name: true } },
      },
    }),
    prisma.experiment.findMany({
      orderBy: { startedAt: "desc" },
      select: { id: true, name: true },
    }),
  ]);

  const postLabel = (p: (typeof posts)[number]) =>
    p.scheduledPost?.draft?.title ?? "Sem título";

  const labelById = new Map(posts.map((p) => [p.id, postLabel(p)]));

  const sum = (key: "likes" | "comments" | "shares" | "views") =>
    engagements.reduce((acc, r) => acc + r[key], 0);

  const likes = sum("likes");
  const comments = sum("comments");
  const shares = sum("shares");
  const views = sum("views");

  const followerValues = snapshots
    .map((s) => s.followersAtRead)
    .filter((n): n is number => n !== null);
  const followerGrowth =
    followerValues.length >= 2
      ? Math.max(...followerValues) - Math.min(...followerValues)
      : 0;

  const summary: AnalyticsSummary = {
    views,
    likes,
    comments,
    shares,
    rate: views > 0 ? (((likes + comments + shares) / views) * 100).toFixed(2) : "0.00",
    followerGrowth,
  };

  // Top 5 publicações por visualizações
  const viewsByPost = new Map<string, number>();
  for (const r of engagements) {
    viewsByPost.set(r.publishedPostId, (viewsByPost.get(r.publishedPostId) ?? 0) + r.views);
  }
  const topPosts: AnalyticsTopPost[] = [...viewsByPost.entries()]
    .map(([id, v]) => ({ id, label: labelById.get(id) ?? "Publicação", views: v }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  // Engajamento por dia (likes + comentários + compartilhamentos)
  const byDay = new Map<string, AnalyticsDay>();
  for (const r of engagements) {
    const d = new Date(r.recordedAt);
    const key = d.toISOString().slice(0, 10);
    const cur =
      byDay.get(key) ??
      ({ key, label: formatDate(d), likes: 0, comments: 0, shares: 0, total: 0 } as AnalyticsDay);
    cur.likes += r.likes;
    cur.comments += r.comments;
    cur.shares += r.shares;
    cur.total += r.likes + r.comments + r.shares;
    byDay.set(key, cur);
  }
  const engagementByDay = [...byDay.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-14);

  const postOptions: AnalyticsPostOption[] = posts.map((p) => ({
    id: p.id,
    label: postLabel(p),
  }));

  const snapshotRows: AnalyticsSnapshotRow[] = snapshots.map((s) => ({
    id: s.id,
    postTitle:
      s.publishedPost?.scheduledPost?.draft?.title ?? "Publicação",
    views12h: s.views12h,
    views24h: s.views24h,
    views72h: s.views72h,
    followersAtRead: s.followersAtRead,
    experimentName: s.experiment?.name ?? null,
    notes: s.notes,
    recordedAt: s.recordedAt,
  }));

  return (
    <AnalyticsClient
      hasPosts={posts.length > 0}
      summary={summary}
      topPosts={topPosts}
      engagementByDay={engagementByDay}
      snapshots={snapshotRows}
      postOptions={postOptions}
      experiments={experiments}
    />
  );
}

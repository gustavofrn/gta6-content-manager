import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AprendizadoClient, {
  type LearningRow,
  type ExperimentRow,
} from "./AprendizadoClient";

export const dynamic = "force-dynamic";

export default async function AprendizadoPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [experiments, learnings] = await Promise.all([
    prisma.experiment.findMany({
      orderBy: { startedAt: "desc" },
      include: {
        metrics: { select: { views72h: true } },
        learning: true,
      },
    }),
    prisma.learningRecord.findMany({
      orderBy: { createdAt: "desc" },
      include: { experiment: { select: { id: true, name: true } } },
    }),
  ]);

  const experimentsData: ExperimentRow[] = experiments.map((e) => ({
    id: e.id,
    name: e.name,
    variable: e.variable,
    hypothesis: e.hypothesis,
    status: e.status,
    startedAt: e.startedAt,
    endedAt: e.endedAt,
    metricsCount: e.metrics.length,
    views72hTotal: e.metrics.reduce((acc, m) => acc + (m.views72h ?? 0), 0),
    learning: e.learning
      ? { id: e.learning.id, type: e.learning.type, title: e.learning.title }
      : null,
  }));

  const learningsData: LearningRow[] = learnings.map((l) => ({
    id: l.id,
    type: l.type,
    title: l.title,
    description: l.description,
    createdAt: l.createdAt,
    experimentId: l.experimentId,
    experimentName: l.experiment?.name ?? null,
  }));

  const experimentOptions = experiments.map((e) => ({
    id: e.id,
    name: e.name,
    hasLearning: e.learning !== null,
  }));

  return (
    <AprendizadoClient
      experiments={experimentsData}
      learnings={learningsData}
      experimentOptions={experimentOptions}
    />
  );
}

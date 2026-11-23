"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import Field from "@/components/ui/Field";
import Button, { IconButton } from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { Table, Tr, Td } from "@/components/ui/Table";
import EmptyState from "@/components/ui/EmptyState";
import { apiFetch } from "@/lib/client";
import { formatDate, formatDateTime, formatNumber, truncate } from "@/lib/format";

export type ExperimentRow = {
  id: string;
  name: string;
  variable: string;
  hypothesis: string | null;
  status: string;
  startedAt: string | Date;
  endedAt: string | Date | null;
  metricsCount: number;
  views72hTotal: number;
  learning: { id: string; type: string; title: string } | null;
};

export type LearningRow = {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string | Date;
  experimentId: string | null;
  experimentName: string | null;
};

export type ExperimentOption = {
  id: string;
  name: string;
  hasLearning: boolean;
};

type Props = {
  experiments: ExperimentRow[];
  learnings: LearningRow[];
  experimentOptions: ExperimentOption[];
};

const VAR_OPTIONS = [
  { value: "hook", label: "Gancho (hook)" },
  { value: "duration", label: "Duração" },
  { value: "time", label: "Horário de publicação" },
  { value: "caption_style", label: "Estilo da legenda" },
  { value: "video_type", label: "Tipo de vídeo" },
];

const LEARNING_TYPES = [
  { value: "win", label: "Vitória" },
  { value: "loss", label: "Derrota" },
  { value: "rule", label: "Regra" },
  { value: "change", label: "Mudança" },
];

const LEARNING_BADGE: Record<string, string> = {
  win: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  loss: "bg-brand-red/15 text-brand-red-soft border-brand-red/30",
  rule: "bg-brand-purple/15 text-brand-purple-soft border-brand-purple/30",
  change: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

const VAR_LABEL: Record<string, string> = Object.fromEntries(
  VAR_OPTIONS.map((v) => [v.value, v.label])
);

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  LEARNING_TYPES.map((t) => [t.value, t.label])
);

function LearningBadge({ type }: { type: string }) {
  const cls = LEARNING_BADGE[type] ?? "bg-bg-hover text-text-soft border-border";
  return <span className={`badge border ${cls}`}>{TYPE_LABEL[type] ?? type}</span>;
}

const EMPTY_EXP = { name: "", variable: "hook", hypothesis: "", status: "running" };
const EMPTY_LEARN = {
  type: "win",
  title: "",
  description: "",
  experimentId: "",
};

export default function AprendizadoClient({
  experiments,
  learnings,
  experimentOptions,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"experiments" | "learning">("experiments");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Experimento
  const [expModal, setExpModal] = useState(false);
  const [editingExp, setEditingExp] = useState<ExperimentRow | null>(null);
  const [expForm, setExpForm] = useState(EMPTY_EXP);

  // Aprendizado
  const [learnModal, setLearnModal] = useState(false);
  const [editingLearn, setEditingLearn] = useState<LearningRow | null>(null);
  const [learnForm, setLearnForm] = useState(EMPTY_LEARN);

  const rules = learnings.filter((l) => l.type === "rule");

  function openExperiment(exp?: ExperimentRow) {
    setError("");
    if (exp) {
      setEditingExp(exp);
      setExpForm({
        name: exp.name,
        variable: exp.variable,
        hypothesis: exp.hypothesis ?? "",
        status: exp.status,
      });
    } else {
      setEditingExp(null);
      setExpForm(EMPTY_EXP);
    }
    setExpModal(true);
  }

  function openLearning(learn?: LearningRow) {
    setError("");
    if (learn) {
      setEditingLearn(learn);
      setLearnForm({
        type: learn.type,
        title: learn.title,
        description: learn.description,
        experimentId: learn.experimentId ?? "",
      });
    } else {
      setEditingLearn(null);
      setLearnForm(EMPTY_LEARN);
    }
    setLearnModal(true);
  }

  async function saveExperiment() {
    setBusy(true);
    setError("");
    try {
      if (editingExp) {
        await apiFetch(`/api/experiments/${editingExp.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: expForm.name,
            hypothesis: expForm.hypothesis,
            status: expForm.status,
          }),
        });
      } else {
        await apiFetch("/api/experiments", {
          method: "POST",
          body: JSON.stringify({
            name: expForm.name,
            variable: expForm.variable,
            hypothesis: expForm.hypothesis,
          }),
        });
      }
      setExpModal(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function saveLearning() {
    setBusy(true);
    setError("");
    try {
      const payload = {
        type: learnForm.type,
        title: learnForm.title,
        description: learnForm.description,
        experimentId: learnForm.experimentId || null,
      };
      if (editingLearn) {
        await apiFetch(`/api/learning/${editingLearn.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/learning", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setLearnModal(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function setExperimentStatus(id: string, status: string) {
    try {
      await apiFetch(`/api/experiments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao atualizar.");
    }
  }

  async function removeExperiment(id: string) {
    if (!confirm("Excluir este experimento?")) return;
    try {
      await apiFetch(`/api/experiments/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  async function removeLearning(id: string) {
    if (!confirm("Excluir este aprendizado?")) return;
    try {
      await apiFetch(`/api/learning/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  const learningExperimentOptions = experimentOptions.filter(
    (o) => !o.hasLearning || o.id === editingLearn?.experimentId
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aprendizado"
        description="Registre experimentos, vitórias, derrotas, mudanças e as regras operacionais que orientam a estratégia."
        action={
          tab === "experiments" ? (
            <Button onClick={() => openExperiment()}>Novo experimento</Button>
          ) : (
            <Button onClick={() => openLearning()}>Novo aprendizado</Button>
          )
        }
      />

      <div className="flex gap-1 border-b border-border">
        {[
          { key: "experiments" as const, label: `Experimentos (${experiments.length})` },
          { key: "learning" as const, label: `Aprendizados (${learnings.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setError("");
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-brand-purple text-text"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "experiments" ? (
        experiments.length === 0 ? (
          <EmptyState
            title="Nenhum experimento registrado"
            description="Teste variáveis como gancho, duração e horário para descobrir o que funciona melhor."
            action={<Button onClick={() => openExperiment()}>Novo experimento</Button>}
          />
        ) : (
          <Table
            head={[
              "Experimento",
              "Variável",
              "Status",
              "Período",
              "Métricas",
              "Aprendizado",
              "Ações",
            ]}
          >
            {experiments.map((exp) => (
              <Tr key={exp.id}>
                <Td>
                  <p className="font-medium text-text">{exp.name}</p>
                  {exp.hypothesis && (
                    <p className="text-xs text-text-muted max-w-sm">
                      {truncate(exp.hypothesis, 100)}
                    </p>
                  )}
                </Td>
                <Td className="text-text-soft">
                  {VAR_LABEL[exp.variable] ?? exp.variable}
                </Td>
                <Td>
                  <StatusBadge status={exp.status} />
                </Td>
                <Td className="text-text-soft whitespace-nowrap">
                  <span className="block">{formatDate(exp.startedAt)}</span>
                  {exp.endedAt && (
                    <span className="block text-xs text-text-muted">
                      até {formatDate(exp.endedAt)}
                    </span>
                  )}
                </Td>
                <Td className="text-text-soft">
                  <span className="block">{exp.metricsCount} snapshot(s)</span>
                  {exp.views72hTotal > 0 && (
                    <span className="block text-xs text-text-muted">
                      {formatNumber(exp.views72hTotal)} views (72h)
                    </span>
                  )}
                </Td>
                <Td>
                  {exp.learning ? (
                    <div className="space-y-1">
                      <LearningBadge type={exp.learning.type} />
                      <p className="text-xs text-text-soft max-w-xs">
                        {truncate(exp.learning.title, 60)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    {exp.status !== "completed" && (
                      <button
                        onClick={() => setExperimentStatus(exp.id, "completed")}
                        className="text-xs px-2 py-1 rounded border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        Concluir
                      </button>
                    )}
                    {exp.status !== "cancelled" && (
                      <button
                        onClick={() => setExperimentStatus(exp.id, "cancelled")}
                        className="text-xs px-2 py-1 rounded border border-brand-red/30 text-brand-red-soft hover:bg-brand-red/10"
                      >
                        Cancelar
                      </button>
                    )}
                    <IconButton
                      icon="edit"
                      label="Editar"
                      onClick={() => openExperiment(exp)}
                    />
                    <IconButton
                      icon="logout"
                      label="Excluir"
                      tone="danger"
                      onClick={() => removeExperiment(exp.id)}
                    />
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )
      ) : (
        <div className="space-y-6">
          {rules.length > 0 && (
            <div className="card p-5 border-brand-purple/40">
              <div className="flex items-center gap-2 mb-3">
                <span className="badge border bg-brand-purple/15 text-brand-purple-soft border-brand-purple/30">
                  Regras operacionais
                </span>
                <span className="text-xs text-text-muted">
                  Diretrizes que devem orientar a produção de conteúdo
                </span>
              </div>
              <ul className="space-y-3">
                {rules.map((r) => (
                  <li key={r.id} className="border-l-2 border-brand-purple/50 pl-3">
                    <p className="font-medium text-text">{r.title}</p>
                    <p className="text-sm text-text-soft">{r.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {learnings.length === 0 ? (
            <EmptyState
              title="Nenhum aprendizado registrado"
              description="Documente vitórias, derrotas, mudanças e regras a partir de métricas reais."
              action={<Button onClick={() => openLearning()}>Novo aprendizado</Button>}
            />
          ) : (
            <Table
              head={["Tipo", "Aprendizado", "Experimento", "Criado em", "Ações"]}
            >
              {learnings.map((l) => (
                <Tr key={l.id}>
                  <Td>
                    <LearningBadge type={l.type} />
                  </Td>
                  <Td>
                    <p className="font-medium text-text">{l.title}</p>
                    <p className="text-xs text-text-muted max-w-md">
                      {truncate(l.description, 140)}
                    </p>
                  </Td>
                  <Td className="text-text-soft">{l.experimentName ?? "—"}</Td>
                  <Td className="text-text-soft">{formatDateTime(l.createdAt)}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <IconButton
                        icon="edit"
                        label="Editar"
                        onClick={() => openLearning(l)}
                      />
                      <IconButton
                        icon="logout"
                        label="Excluir"
                        tone="danger"
                        onClick={() => removeLearning(l.id)}
                      />
                    </div>
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
        </div>
      )}

      {/* Modal experimento */}
      <Modal
        open={expModal}
        onClose={() => setExpModal(false)}
        title={editingExp ? "Editar experimento" : "Novo experimento"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setExpModal(false)}>
              Cancelar
            </Button>
            <Button onClick={saveExperiment} disabled={busy}>
              {busy ? "Salvando..." : "Salvar"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <p className="text-sm text-brand-red-soft bg-brand-red/10 border border-brand-red/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <Field label="Nome">
            <input
              className="input w-full"
              value={expForm.name}
              onChange={(e) => setExpForm({ ...expForm, name: e.target.value })}
              placeholder="Ex.: Ganchos curtos vs longos"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Variável testada">
              <select
                className="input w-full"
                value={expForm.variable}
                onChange={(e) =>
                  setExpForm({ ...expForm, variable: e.target.value })
                }
                disabled={!!editingExp}
              >
                {VAR_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </Field>
            {editingExp && (
              <Field label="Status">
                <select
                  className="input w-full"
                  value={expForm.status}
                  onChange={(e) =>
                    setExpForm({ ...expForm, status: e.target.value })
                  }
                >
                  <option value="running">Em andamento</option>
                  <option value="completed">Concluído</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </Field>
            )}
          </div>
          <Field label="Hipótese">
            <textarea
              className="input w-full min-h-[80px]"
              value={expForm.hypothesis}
              onChange={(e) =>
                setExpForm({ ...expForm, hypothesis: e.target.value })
              }
              placeholder="O que você espera que aconteça?"
            />
          </Field>
        </div>
      </Modal>

      {/* Modal aprendizado */}
      <Modal
        open={learnModal}
        onClose={() => setLearnModal(false)}
        title={editingLearn ? "Editar aprendizado" : "Novo aprendizado"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLearnModal(false)}>
              Cancelar
            </Button>
            <Button onClick={saveLearning} disabled={busy}>
              {busy ? "Salvando..." : "Salvar"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <p className="text-sm text-brand-red-soft bg-brand-red/10 border border-brand-red/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo">
              <select
                className="input w-full"
                value={learnForm.type}
                onChange={(e) =>
                  setLearnForm({ ...learnForm, type: e.target.value })
                }
              >
                {LEARNING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Experimento (opcional)">
              <select
                className="input w-full"
                value={learnForm.experimentId}
                onChange={(e) =>
                  setLearnForm({ ...learnForm, experimentId: e.target.value })
                }
              >
                <option value="">Nenhum</option>
                {learningExperimentOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Título">
            <input
              className="input w-full"
              value={learnForm.title}
              onChange={(e) =>
                setLearnForm({ ...learnForm, title: e.target.value })
              }
              placeholder="Ex.: Ganchos com pergunta geram mais comentários"
            />
          </Field>
          <Field label="Descrição">
            <textarea
              className="input w-full min-h-[100px]"
              value={learnForm.description}
              onChange={(e) =>
                setLearnForm({ ...learnForm, description: e.target.value })
              }
              placeholder="Explique o resultado e como aplicar."
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

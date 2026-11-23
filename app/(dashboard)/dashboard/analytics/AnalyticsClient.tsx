"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { Table, Tr, Td } from "@/components/ui/Table";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
import { apiFetch } from "@/lib/client";
import { formatDateTime, formatNumber } from "@/lib/format";

export type AnalyticsSummary = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  rate: string;
  followerGrowth: number;
};

export type AnalyticsTopPost = {
  id: string;
  label: string;
  views: number;
};

export type AnalyticsDay = {
  key: string;
  label: string;
  likes: number;
  comments: number;
  shares: number;
  total: number;
};

export type AnalyticsSnapshotRow = {
  id: string;
  postTitle: string;
  views12h: number | null;
  views24h: number | null;
  views72h: number | null;
  followersAtRead: number | null;
  experimentName: string | null;
  notes: string | null;
  recordedAt: string | Date;
};

export type AnalyticsPostOption = { id: string; label: string };

type Props = {
  hasPosts: boolean;
  summary: AnalyticsSummary;
  topPosts: AnalyticsTopPost[];
  engagementByDay: AnalyticsDay[];
  snapshots: AnalyticsSnapshotRow[];
  postOptions: AnalyticsPostOption[];
  experiments: { id: string; name: string }[];
};

const EMPTY_SNAPSHOT = {
  postId: "",
  views12h: "",
  views24h: "",
  views72h: "",
  followersAtRead: "",
  experimentId: "",
  notes: "",
};

export default function AnalyticsClient({
  hasPosts,
  summary,
  topPosts,
  engagementByDay,
  snapshots,
  postOptions,
  experiments,
}: Props) {
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY_SNAPSHOT);

  const maxTopViews = Math.max(1, ...topPosts.map((p) => p.views));
  const maxDayTotal = Math.max(1, ...engagementByDay.map((d) => d.total));

  function openModal() {
    setError("");
    setForm({ ...EMPTY_SNAPSHOT, postId: postOptions[0]?.id ?? "" });
    setModal(true);
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      if (!form.postId) {
        setError("Selecione a publicação.");
        setBusy(false);
        return;
      }
      await apiFetch("/api/metrics", {
        method: "POST",
        body: JSON.stringify({
          publishedPostId: form.postId,
          views12h: form.views12h === "" ? null : Number(form.views12h),
          views24h: form.views24h === "" ? null : Number(form.views24h),
          views72h: form.views72h === "" ? null : Number(form.views72h),
          followersAtRead:
            form.followersAtRead === "" ? null : Number(form.followersAtRead),
          experimentId: form.experimentId || null,
          notes: form.notes,
        }),
      });
      setModal(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  if (!hasPosts) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Analytics"
          description="Métricas detalhadas: alcance, visualizações, seguidores e taxa de engajamento."
        />
        <EmptyState
          title="Sem dados para analisar"
          description="Publique conteúdo na seção “Criador de publicações” primeiro para gerar métricas e visualizações."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Métricas agregadas de visualizações, engajamento e crescimento de seguidores."
        action={<Button onClick={openModal}>Registrar snapshot</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Visualizações" value={formatNumber(summary.views)} accent="purple" />
        <StatCard label="Curtidas" value={formatNumber(summary.likes)} accent="red" />
        <StatCard label="Comentários" value={formatNumber(summary.comments)} />
        <StatCard label="Compartilhamentos" value={formatNumber(summary.shares)} />
        <StatCard
          label="Taxa de engajamento"
          value={`${summary.rate}%`}
          accent="red"
          sublabel="(curtidas + coment. + compart.) / views"
        />
        <StatCard
          label="Crescimento de seguidores"
          value={`+${formatNumber(summary.followerGrowth)}`}
          accent="purple"
          sublabel="variação nos snapshots"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-text mb-4">
            Top 5 publicações por visualizações
          </h2>
          {topPosts.length === 0 ? (
            <p className="text-sm text-text-muted">Sem visualizações registradas.</p>
          ) : (
            <div className="space-y-3">
              {topPosts.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="w-36 text-xs text-text-soft truncate" title={p.label}>
                    {p.label}
                  </span>
                  <div className="flex-1 bg-bg-hover rounded h-5 overflow-hidden">
                    <div
                      className="h-full bg-brand-purple rounded"
                      style={{ width: `${Math.max(2, (p.views / maxTopViews) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-xs text-text-soft text-right">
                    {formatNumber(p.views)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold text-text mb-4">
            Engajamento por dia
          </h2>
          {engagementByDay.length === 0 ? (
            <p className="text-sm text-text-muted">Sem engajamento registrado.</p>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {engagementByDay.map((d) => (
                <div
                  key={d.key}
                  className="flex-1 h-full flex flex-col items-center justify-end gap-1"
                  title={`${d.label}: ${formatNumber(d.total)} interações`}
                >
                  <span className="text-[10px] text-text-muted">
                    {formatNumber(d.total)}
                  </span>
                  <div
                    className="w-full bg-brand-red/70 rounded-t"
                    style={{ height: `${Math.max(2, (d.total / maxDayTotal) * 100)}%` }}
                  />
                  <span className="text-[10px] text-text-muted whitespace-nowrap">
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-text mb-3">
          Snapshots de métricas
        </h2>
        {snapshots.length === 0 ? (
          <EmptyState
            title="Nenhum snapshot registrado"
            description="Registre janelas de visualização (12h, 24h, 72h) e o número de seguidores para acompanhar a evolução."
            action={<Button onClick={openModal}>Registrar snapshot</Button>}
          />
        ) : (
          <Table
            head={[
              "Publicação",
              "12h",
              "24h",
              "72h",
              "Seguidores",
              "Experimento",
              "Notas",
              "Registrado em",
            ]}
          >
            {snapshots.map((s) => (
              <Tr key={s.id}>
                <Td className="text-text">{s.postTitle}</Td>
                <Td className="text-text-soft">
                  {s.views12h === null ? "—" : formatNumber(s.views12h)}
                </Td>
                <Td className="text-text-soft">
                  {s.views24h === null ? "—" : formatNumber(s.views24h)}
                </Td>
                <Td className="text-text-soft">
                  {s.views72h === null ? "—" : formatNumber(s.views72h)}
                </Td>
                <Td className="text-text-soft">
                  {s.followersAtRead === null ? "—" : formatNumber(s.followersAtRead)}
                </Td>
                <Td className="text-text-soft">{s.experimentName ?? "—"}</Td>
                <Td className="text-text-soft max-w-xs">{s.notes ?? "—"}</Td>
                <Td className="text-text-soft">{formatDateTime(s.recordedAt)}</Td>
              </Tr>
            ))}
          </Table>
        )}
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Registrar snapshot"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={busy}>
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
          <Field label="Publicação">
            <select
              className="input w-full"
              value={form.postId}
              onChange={(e) => setForm({ ...form, postId: e.target.value })}
            >
              {postOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Views 12h">
              <input
                type="number"
                min={0}
                className="input w-full"
                value={form.views12h}
                onChange={(e) => setForm({ ...form, views12h: e.target.value })}
              />
            </Field>
            <Field label="Views 24h">
              <input
                type="number"
                min={0}
                className="input w-full"
                value={form.views24h}
                onChange={(e) => setForm({ ...form, views24h: e.target.value })}
              />
            </Field>
            <Field label="Views 72h">
              <input
                type="number"
                min={0}
                className="input w-full"
                value={form.views72h}
                onChange={(e) => setForm({ ...form, views72h: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Seguidores na leitura">
              <input
                type="number"
                min={0}
                className="input w-full"
                value={form.followersAtRead}
                onChange={(e) =>
                  setForm({ ...form, followersAtRead: e.target.value })
                }
              />
            </Field>
            <Field label="Experimento (opcional)">
              <select
                className="input w-full"
                value={form.experimentId}
                onChange={(e) => setForm({ ...form, experimentId: e.target.value })}
              >
                <option value="">Nenhum</option>
                {experiments.map((exp) => (
                  <option key={exp.id} value={exp.id}>
                    {exp.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Notas">
            <textarea
              className="input w-full min-h-[80px]"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Observações, contexto da leitura..."
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

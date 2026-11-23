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

export type EngajamentoPost = {
  id: string;
  title: string;
  url: string | null;
  platform: string | null;
  handle: string;
  publishedAt: string | Date;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
};

export type EngajamentoRecordRow = {
  id: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  recordedAt: string | Date;
  postTitle: string;
  platform: string | null;
};

export type EngajamentoSummary = {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  rate: string;
  records: number;
};

type Props = {
  posts: EngajamentoPost[];
  engagements: EngajamentoRecordRow[];
  summary: EngajamentoSummary;
};

const EMPTY_FORM = {
  likes: "0",
  comments: "0",
  shares: "0",
  saves: "0",
  views: "0",
};

export default function EngajamentoClient({
  posts,
  engagements,
  summary,
}: Props) {
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [postId, setPostId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  function openModal(selected?: string) {
    setError("");
    setPostId(selected ?? posts[0]?.id ?? "");
    setForm(EMPTY_FORM);
    setModal(true);
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      if (!postId) {
        setError("Selecione a publicação.");
        setBusy(false);
        return;
      }
      await apiFetch("/api/engagement", {
        method: "POST",
        body: JSON.stringify({
          publishedPostId: postId,
          likes: Number(form.likes) || 0,
          comments: Number(form.comments) || 0,
          shares: Number(form.shares) || 0,
          saves: Number(form.saves) || 0,
          views: Number(form.views) || 0,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Engajamento"
        description="Registre curtidas, comentários, compartilhamentos, salvamentos e visualizações das publicações."
        action={
          <Button onClick={() => openModal()} disabled={posts.length === 0}>
            Registrar engajamento
          </Button>
        }
      />

      {posts.length === 0 ? (
        <EmptyState
          title="Nenhuma publicação registrada"
          description="Publique conteúdo na seção “Criador de publicações” primeiro para começar a registrar engajamento e métricas."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              label="Visualizações"
              value={formatNumber(summary.views)}
              accent="purple"
            />
            <StatCard
              label="Curtidas"
              value={formatNumber(summary.likes)}
              accent="red"
            />
            <StatCard
              label="Comentários"
              value={formatNumber(summary.comments)}
            />
            <StatCard label="Compart." value={formatNumber(summary.shares)} />
            <StatCard label="Salvos" value={formatNumber(summary.saves)} />
            <StatCard
              label="Taxa de engajamento"
              value={`${summary.rate}%`}
              accent="red"
              sublabel="(curtidas + coment. + compart.) / views"
            />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text mb-3">
              Publicações
            </h2>
            <Table
              head={[
                "Publicação",
                "Plataforma",
                "Publicado",
                "Views",
                "Curtidas",
                "Coment.",
                "Compart.",
                "Salvos",
                "Ações",
              ]}
            >
              {posts.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <p className="font-medium text-text">{p.title}</p>
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand-purple-soft hover:underline"
                      >
                        Abrir publicação
                      </a>
                    )}
                  </Td>
                  <Td className="text-text-soft">
                    {p.platform ? `${p.platform}` : "—"}
                    {p.handle && (
                      <span className="block text-xs text-text-muted">
                        @{p.handle}
                      </span>
                    )}
                  </Td>
                  <Td className="text-text-soft">{formatDateTime(p.publishedAt)}</Td>
                  <Td className="text-text-soft">{formatNumber(p.views)}</Td>
                  <Td className="text-text-soft">{formatNumber(p.likes)}</Td>
                  <Td className="text-text-soft">{formatNumber(p.comments)}</Td>
                  <Td className="text-text-soft">{formatNumber(p.shares)}</Td>
                  <Td className="text-text-soft">{formatNumber(p.saves)}</Td>
                  <Td>
                    <button
                      onClick={() => openModal(p.id)}
                      className="text-xs px-2 py-1 rounded border border-brand-purple/40 text-brand-purple-soft hover:bg-brand-purple/10 whitespace-nowrap"
                    >
                      Registrar
                    </button>
                  </Td>
                </Tr>
              ))}
            </Table>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text mb-3">
              Últimos registros de engajamento
            </h2>
            {engagements.length === 0 ? (
              <EmptyState
                title="Nenhum registro ainda"
                description="Use “Registrar engajamento” para adicionar as primeiras métricas."
              />
            ) : (
              <Table
                head={[
                  "Publicação",
                  "Plataforma",
                  "Views",
                  "Curtidas",
                  "Coment.",
                  "Compart.",
                  "Salvos",
                  "Registrado em",
                ]}
              >
                {engagements.map((r) => (
                  <Tr key={r.id}>
                    <Td className="text-text">{r.postTitle}</Td>
                    <Td className="text-text-soft">{r.platform ?? "—"}</Td>
                    <Td className="text-text-soft">{formatNumber(r.views)}</Td>
                    <Td className="text-text-soft">{formatNumber(r.likes)}</Td>
                    <Td className="text-text-soft">{formatNumber(r.comments)}</Td>
                    <Td className="text-text-soft">{formatNumber(r.shares)}</Td>
                    <Td className="text-text-soft">{formatNumber(r.saves)}</Td>
                    <Td className="text-text-soft">
                      {formatDateTime(r.recordedAt)}
                    </Td>
                  </Tr>
                ))}
              </Table>
            )}
          </div>
        </>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Registrar engajamento"
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
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
            >
              {posts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                  {p.platform ? ` — ${p.platform}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Visualizações">
              <input
                type="number"
                min={0}
                className="input w-full"
                value={form.views}
                onChange={(e) => setForm({ ...form, views: e.target.value })}
              />
            </Field>
            <Field label="Curtidas">
              <input
                type="number"
                min={0}
                className="input w-full"
                value={form.likes}
                onChange={(e) => setForm({ ...form, likes: e.target.value })}
              />
            </Field>
            <Field label="Comentários">
              <input
                type="number"
                min={0}
                className="input w-full"
                value={form.comments}
                onChange={(e) => setForm({ ...form, comments: e.target.value })}
              />
            </Field>
            <Field label="Compartilhamentos">
              <input
                type="number"
                min={0}
                className="input w-full"
                value={form.shares}
                onChange={(e) => setForm({ ...form, shares: e.target.value })}
              />
            </Field>
            <Field label="Salvamentos">
              <input
                type="number"
                min={0}
                className="input w-full"
                value={form.saves}
                onChange={(e) => setForm({ ...form, saves: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}

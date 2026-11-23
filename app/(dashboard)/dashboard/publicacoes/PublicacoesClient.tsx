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
import { formatDateTime, truncate } from "@/lib/format";

export type Draft = {
  id: string;
  title: string;
  caption: string | null;
  pillar: string;
  hook: string | null;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  fact: { id: string; title: string } | null;
  mediaAsset: { id: string; url: string; type: string } | null;
  scheduledPost: {
    id: string;
    scheduledAt: string | Date;
    status: string;
    socialAccount: { id: string; platform: string; handle: string };
  } | null;
};

export type FactOption = { id: string; title: string };
export type AssetOption = { id: string; url: string; type: string };
export type AccountOption = {
  id: string;
  platform: string;
  handle: string;
  name: string;
};

const PILLARS = [
  { value: "news", label: "Notícia" },
  { value: "tips", label: "Dica/Tutorial" },
  { value: "gameplay", label: "Gameplay" },
  { value: "nostalgia", label: "Nostalgia" },
  { value: "spotlight", label: "Destaque" },
  { value: "countdown", label: "Contagem regressiva" },
  { value: "question", label: "Pergunta" },
];

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "draft", label: "Rascunho" },
  { value: "pending_approval", label: "Aguardando" },
  { value: "approved", label: "Aprovado" },
  { value: "rejected", label: "Rejeitado" },
  { value: "scheduled", label: "Agendado" },
  { value: "published", label: "Publicado" },
];

function pillarLabel(value: string) {
  return PILLARS.find((p) => p.value === value)?.label ?? value;
}

type Props = {
  drafts: Draft[];
  facts: FactOption[];
  assets: AssetOption[];
  accounts: AccountOption[];
};

export default function PublicacoesClient({
  drafts,
  facts,
  assets,
  accounts,
}: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Modal criar/editar
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [form, setForm] = useState({
    title: "",
    pillar: "news",
    caption: "",
    hook: "",
    factId: "",
    mediaAssetId: "",
  });

  // Modal agendar
  const [scheduleModal, setScheduleModal] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState<Draft | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    socialAccountId: "",
    scheduledAt: "",
  });

  const visible = filter ? drafts.filter((d) => d.status === filter) : drafts;

  function open(draft?: Draft) {
    setError("");
    if (draft) {
      setEditing(draft);
      setForm({
        title: draft.title,
        pillar: draft.pillar,
        caption: draft.caption ?? "",
        hook: draft.hook ?? "",
        factId: draft.fact?.id ?? "",
        mediaAssetId: draft.mediaAsset?.id ?? "",
      });
    } else {
      setEditing(null);
      setForm({
        title: "",
        pillar: "news",
        caption: "",
        hook: "",
        factId: "",
        mediaAssetId: "",
      });
    }
    setModal(true);
  }

  function openSchedule(draft: Draft) {
    setError("");
    if (draft.status !== "approved") {
      alert("Somente publicações aprovadas podem ser agendadas.");
      return;
    }
    setScheduleDraft(draft);
    setScheduleForm({
      socialAccountId: accounts[0]?.id ?? "",
      scheduledAt: "",
    });
    setScheduleModal(true);
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...form,
        factId: form.factId || null,
        mediaAssetId: form.mediaAssetId || null,
      };
      if (editing) {
        await apiFetch(`/api/drafts/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/drafts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setModal(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(id: string) {
    try {
      await apiFetch(`/api/drafts/${id}/submit`, { method: "POST" });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao enviar para aprovação.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta publicação?")) return;
    try {
      await apiFetch(`/api/drafts/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  async function schedule() {
    if (!scheduleDraft) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/scheduled-posts", {
        method: "POST",
        body: JSON.stringify({
          draftId: scheduleDraft.id,
          socialAccountId: scheduleForm.socialAccountId,
          scheduledAt: scheduleForm.scheduledAt,
        }),
      });
      setScheduleModal(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao agendar.");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = (d: Draft) =>
    ["draft", "rejected", "change_requested"].includes(d.status);
  const canDelete = (d: Draft) =>
    d.status !== "scheduled" && d.status !== "published";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Criador de publicações"
        description="Crie rascunhos, vincule fatos e mídias, envie para aprovação e agende."
        action={<Button onClick={() => open()}>Nova publicação</Button>}
      />

      <div className="flex flex-wrap gap-1 border-b border-border">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filter === s.value
                ? "border-brand-purple text-text"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && !modal && !scheduleModal && (
        <p className="text-sm text-brand-red-soft">{error}</p>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title="Nenhuma publicação"
          description="Crie um rascunho, vincule um fato verificado e envie para aprovação."
          action={<Button onClick={() => open()}>Nova publicação</Button>}
        />
      ) : (
        <Table
          head={["Título", "Pilar", "Fato", "Mídia", "Status", "Ações"]}
        >
          {visible.map((d) => (
            <Tr key={d.id}>
              <Td>
                <p className="font-medium text-text">{d.title}</p>
                {d.caption && (
                  <p className="text-xs text-text-muted max-w-md">
                    {truncate(d.caption, 120)}
                  </p>
                )}
                {d.scheduledPost && (
                  <p className="text-xs text-brand-purple-soft mt-1">
                    {d.scheduledPost.socialAccount.platform} ·{" "}
                    {formatDateTime(d.scheduledPost.scheduledAt)}
                  </p>
                )}
              </Td>
              <Td className="text-text-soft">{pillarLabel(d.pillar)}</Td>
              <Td className="text-text-soft">{d.fact?.title ?? "—"}</Td>
              <Td className="text-text-soft">{d.mediaAsset ? "Vinculada" : "—"}</Td>
              <Td>
                <StatusBadge status={d.status} />
              </Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  {d.status === "approved" && !d.scheduledPost && (
                    <button
                      onClick={() => openSchedule(d)}
                      className="text-xs px-2 py-1 rounded border border-brand-purple/40 text-brand-purple-soft hover:bg-brand-purple/10"
                    >
                      Agendar
                    </button>
                  )}
                  {canSubmit(d) && (
                    <button
                      onClick={() => submit(d.id)}
                      className="text-xs px-2 py-1 rounded border border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                    >
                      Enviar para aprovação
                    </button>
                  )}
                  <IconButton
                    icon="edit"
                    label="Editar"
                    onClick={() => open(d)}
                  />
                  {canDelete(d) && (
                    <IconButton
                      icon="logout"
                      label="Excluir"
                      tone="danger"
                      onClick={() => remove(d.id)}
                    />
                  )}
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
      )}

      {/* Modal criar/editar */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Editar publicação" : "Nova publicação"}
        maxWidth="max-w-2xl"
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
          <Field label="Título">
            <input
              className="input w-full"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="GTA 6 | Novo trailer confirmado"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pilar">
              <select
                className="input w-full"
                value={form.pillar}
                onChange={(e) => setForm({ ...form, pillar: e.target.value })}
              >
                {PILLARS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hook">
              <input
                className="input w-full"
                value={form.hook}
                onChange={(e) => setForm({ ...form, hook: e.target.value })}
                placeholder="Frase de abertura"
              />
            </Field>
          </div>
          <Field label="Legenda">
            <textarea
              className="input w-full min-h-[120px]"
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fato verificado (opcional)">
              <select
                className="input w-full"
                value={form.factId}
                onChange={(e) => setForm({ ...form, factId: e.target.value })}
              >
                <option value="">Nenhum</option>
                {facts.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mídia (opcional)">
              <select
                className="input w-full"
                value={form.mediaAssetId}
                onChange={(e) =>
                  setForm({ ...form, mediaAssetId: e.target.value })
                }
              >
                <option value="">Nenhuma</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {truncate(a.url, 50)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </Modal>

      {/* Modal agendar */}
      <Modal
        open={scheduleModal}
        onClose={() => setScheduleModal(false)}
        title="Agendar publicação"
        footer={
          <>
            <Button variant="secondary" onClick={() => setScheduleModal(false)}>
              Cancelar
            </Button>
            <Button onClick={schedule} disabled={busy}>
              {busy ? "Agendando..." : "Agendar"}
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
          {scheduleDraft && (
            <p className="text-sm text-text-soft">
              Publicação:{" "}
              <span className="text-text font-medium">
                {scheduleDraft.title}
              </span>
            </p>
          )}
          <Field label="Conta social">
            <select
              className="input w-full"
              value={scheduleForm.socialAccountId}
              onChange={(e) =>
                setScheduleForm({
                  ...scheduleForm,
                  socialAccountId: e.target.value,
                })
              }
            >
              {accounts.length === 0 && <option value="">Nenhuma conta</option>}
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.platform} · {a.handle}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Data e hora"
            hint="Horário em America/Sao_Paulo."
          >
            <input
              type="datetime-local"
              className="input w-full"
              value={scheduleForm.scheduledAt}
              onChange={(e) =>
                setScheduleForm({
                  ...scheduleForm,
                  scheduledAt: e.target.value,
                })
              }
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

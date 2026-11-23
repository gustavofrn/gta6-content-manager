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
import { formatDate, truncate } from "@/lib/format";

export type Source = {
  id: string;
  name: string;
  type: string;
  url: string | null;
  platform: string | null;
  reliability: number;
  active: boolean;
  createdAt: string | Date;
  _count: { facts: number };
};

export type Fact = {
  id: string;
  title: string;
  content: string;
  url: string | null;
  publishedAt: string | Date | null;
  reliability: number;
  approvalStatus: string;
  createdAt: string | Date;
  source: { id: string; name: string };
};

const SOURCE_TYPES = [
  { value: "official", label: "Oficial" },
  { value: "creator", label: "Criador" },
  { value: "discovery", label: "Descoberta" },
];

const FACT_STATUS = [
  { value: "pending", label: "Pendente" },
  { value: "approved", label: "Aprovado" },
  { value: "rejected", label: "Rejeitado" },
];

type Props = { sources: Source[]; facts: Fact[] };

export default function FontesClient({ sources, facts }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"sources" | "facts">("sources");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Fonte
  const [sourceModal, setSourceModal] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [sourceForm, setSourceForm] = useState({
    name: "",
    type: "official",
    platform: "",
    url: "",
    reliability: "80",
    active: true,
  });

  // Fato
  const [factModal, setFactModal] = useState(false);
  const [editingFact, setEditingFact] = useState<Fact | null>(null);
  const [factForm, setFactForm] = useState({
    title: "",
    content: "",
    sourceId: "",
    url: "",
    publishedAt: "",
    reliability: "80",
    approvalStatus: "pending",
  });

  function resetError() {
    setError("");
  }

  function openSource(source?: Source) {
    resetError();
    if (source) {
      setEditingSource(source);
      setSourceForm({
        name: source.name,
        type: source.type,
        platform: source.platform ?? "",
        url: source.url ?? "",
        reliability: String(source.reliability),
        active: source.active,
      });
    } else {
      setEditingSource(null);
      setSourceForm({
        name: "",
        type: "official",
        platform: "",
        url: "",
        reliability: "80",
        active: true,
      });
    }
    setSourceModal(true);
  }

  function openFact(fact?: Fact) {
    resetError();
    if (fact) {
      setEditingFact(fact);
      setFactForm({
        title: fact.title,
        content: fact.content,
        sourceId: fact.source.id,
        url: fact.url ?? "",
        publishedAt: fact.publishedAt
          ? new Date(fact.publishedAt).toISOString().slice(0, 10)
          : "",
        reliability: String(fact.reliability),
        approvalStatus: fact.approvalStatus,
      });
    } else {
      setEditingFact(null);
      setFactForm({
        title: "",
        content: "",
        sourceId: sources[0]?.id ?? "",
        url: "",
        publishedAt: "",
        reliability: "80",
        approvalStatus: "pending",
      });
    }
    setFactModal(true);
  }

  async function saveSource() {
    setBusy(true);
    resetError();
    try {
      const payload = {
        ...sourceForm,
        reliability: Number(sourceForm.reliability),
      };
      if (editingSource) {
        await apiFetch(`/api/sources/${editingSource.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/sources", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setSourceModal(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function saveFact() {
    setBusy(true);
    resetError();
    try {
      const payload = {
        ...factForm,
        reliability: Number(factForm.reliability),
        publishedAt: factForm.publishedAt || null,
      };
      if (editingFact) {
        await apiFetch(`/api/facts/${editingFact.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/facts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setFactModal(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSource(id: string) {
    if (!confirm("Excluir esta fonte?")) return;
    try {
      await apiFetch(`/api/sources/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  async function removeFact(id: string) {
    if (!confirm("Excluir este fato?")) return;
    try {
      await apiFetch(`/api/facts/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  async function setFactStatus(id: string, approvalStatus: string) {
    try {
      await apiFetch(`/api/facts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ approvalStatus }),
      });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao atualizar.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fontes e fatos"
        description="Cadastre fontes confiáveis e registre fatos verificados com nível de confiabilidade."
        action={
          tab === "sources" ? (
            <Button onClick={() => openSource()}>Nova fonte</Button>
          ) : (
            <Button
              onClick={() => openFact()}
              disabled={sources.length === 0}
            >
              Novo fato
            </Button>
          )
        }
      />

      <div className="flex gap-1 border-b border-border">
        {[
          { key: "sources" as const, label: `Fontes (${sources.length})` },
          { key: "facts" as const, label: `Fatos (${facts.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              resetError();
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

      {error && !sourceModal && !factModal && (
        <p className="text-sm text-brand-red-soft">{error}</p>
      )}

      {tab === "sources" ? (
        sources.length === 0 ? (
          <EmptyState
            title="Nenhuma fonte cadastrada"
            description="Fontes oficiais (Rockstar, PlayStation, Xbox) devem ser priorizadas."
            action={<Button onClick={() => openSource()}>Nova fonte</Button>}
          />
        ) : (
          <Table
            head={["Nome", "Tipo", "Plataforma", "Confiabilidade", "Fatos", "Status", "Ações"]}
          >
            {sources.map((s) => (
              <Tr key={s.id}>
                <Td>
                  <p className="font-medium text-text">{s.name}</p>
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-brand-purple-soft hover:underline"
                    >
                      {truncate(s.url, 40)}
                    </a>
                  )}
                </Td>
                <Td className="text-text-soft">
                  {SOURCE_TYPES.find((t) => t.value === s.type)?.label ?? s.type}
                </Td>
                <Td className="text-text-soft">{s.platform ?? "—"}</Td>
                <Td className="text-text-soft">{s.reliability}%</Td>
                <Td className="text-text-soft">{s._count.facts}</Td>
                <Td>
                  <StatusBadge status={s.active ? "active" : "inactive"} />
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <IconButton
                      icon="edit"
                      label="Editar"
                      onClick={() => openSource(s)}
                    />
                    <IconButton
                      icon="logout"
                      label="Excluir"
                      tone="danger"
                      onClick={() => removeSource(s.id)}
                    />
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )
      ) : facts.length === 0 ? (
        <EmptyState
          title="Nenhum fato verificado"
          description="Registre fatos com fonte, URL e data antes de criar publicações."
          action={
            <Button onClick={() => openFact()} disabled={sources.length === 0}>
              Novo fato
            </Button>
          }
        />
      ) : (
        <Table
          head={["Título", "Fonte", "Publicado", "Confiança", "Status", "Ações"]}
        >
          {facts.map((f) => (
            <Tr key={f.id}>
              <Td>
                <p className="font-medium text-text">{f.title}</p>
                <p className="text-xs text-text-muted max-w-md">
                  {truncate(f.content, 120)}
                </p>
              </Td>
              <Td className="text-text-soft">{f.source.name}</Td>
              <Td className="text-text-soft">{formatDate(f.publishedAt)}</Td>
              <Td className="text-text-soft">{f.reliability}%</Td>
              <Td>
                <StatusBadge status={f.approvalStatus} />
              </Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  {f.approvalStatus !== "approved" && (
                    <button
                      onClick={() => setFactStatus(f.id, "approved")}
                      className="text-xs px-2 py-1 rounded border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    >
                      Aprovar
                    </button>
                  )}
                  {f.approvalStatus !== "rejected" && (
                    <button
                      onClick={() => setFactStatus(f.id, "rejected")}
                      className="text-xs px-2 py-1 rounded border border-brand-red/30 text-brand-red-soft hover:bg-brand-red/10"
                    >
                      Rejeitar
                    </button>
                  )}
                  <IconButton
                    icon="edit"
                    label="Editar"
                    onClick={() => openFact(f)}
                  />
                  <IconButton
                    icon="logout"
                    label="Excluir"
                    tone="danger"
                    onClick={() => removeFact(f.id)}
                  />
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
      )}

      {/* Modal Fonte */}
      <Modal
        open={sourceModal}
        onClose={() => setSourceModal(false)}
        title={editingSource ? "Editar fonte" : "Nova fonte"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSourceModal(false)}>
              Cancelar
            </Button>
            <Button onClick={saveSource} disabled={busy}>
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
              value={sourceForm.name}
              onChange={(e) =>
                setSourceForm({ ...sourceForm, name: e.target.value })
              }
              placeholder="Rockstar Games — Newswire"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo">
              <select
                className="input w-full"
                value={sourceForm.type}
                onChange={(e) =>
                  setSourceForm({ ...sourceForm, type: e.target.value })
                }
              >
                {SOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Plataforma">
              <input
                className="input w-full"
                value={sourceForm.platform}
                onChange={(e) =>
                  setSourceForm({ ...sourceForm, platform: e.target.value })
                }
                placeholder="Web, X, YouTube..."
              />
            </Field>
          </div>
          <Field label="URL">
            <input
              className="input w-full"
              value={sourceForm.url}
              onChange={(e) =>
                setSourceForm({ ...sourceForm, url: e.target.value })
              }
              placeholder="https://"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4 items-end">
            <Field label="Confiabilidade (0-100)">
              <input
                type="number"
                min={0}
                max={100}
                className="input w-full"
                value={sourceForm.reliability}
                onChange={(e) =>
                  setSourceForm({ ...sourceForm, reliability: e.target.value })
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-text-soft pb-2">
              <input
                type="checkbox"
                checked={sourceForm.active}
                onChange={(e) =>
                  setSourceForm({ ...sourceForm, active: e.target.checked })
                }
              />
              Fonte ativa
            </label>
          </div>
        </div>
      </Modal>

      {/* Modal Fato */}
      <Modal
        open={factModal}
        onClose={() => setFactModal(false)}
        title={editingFact ? "Editar fato" : "Novo fato verificado"}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFactModal(false)}>
              Cancelar
            </Button>
            <Button onClick={saveFact} disabled={busy}>
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
              value={factForm.title}
              onChange={(e) =>
                setFactForm({ ...factForm, title: e.target.value })
              }
            />
          </Field>
          <Field label="Conteúdo">
            <textarea
              className="input w-full min-h-[100px]"
              value={factForm.content}
              onChange={(e) =>
                setFactForm({ ...factForm, content: e.target.value })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fonte">
              <select
                className="input w-full"
                value={factForm.sourceId}
                onChange={(e) =>
                  setFactForm({ ...factForm, sourceId: e.target.value })
                }
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                className="input w-full"
                value={factForm.approvalStatus}
                onChange={(e) =>
                  setFactForm({ ...factForm, approvalStatus: e.target.value })
                }
              >
                {FACT_STATUS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="URL" className="col-span-2">
              <input
                className="input w-full"
                value={factForm.url}
                onChange={(e) =>
                  setFactForm({ ...factForm, url: e.target.value })
                }
              />
            </Field>
            <Field label="Publicado em">
              <input
                type="date"
                className="input w-full"
                value={factForm.publishedAt}
                onChange={(e) =>
                  setFactForm({ ...factForm, publishedAt: e.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Confiabilidade (0-100)">
            <input
              type="number"
              min={0}
              max={100}
              className="input w-full"
              value={factForm.reliability}
              onChange={(e) =>
                setFactForm({ ...factForm, reliability: e.target.value })
              }
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

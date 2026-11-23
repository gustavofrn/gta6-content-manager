"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { Table, Tr, Td } from "@/components/ui/Table";
import EmptyState from "@/components/ui/EmptyState";
import { apiFetch } from "@/lib/client";
import { formatDate, truncate } from "@/lib/format";
import { CONTENT_PILLARS, PLATFORMS } from "@/lib/ai";

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

export type SourceOption = { id: string; name: string };

type Props = { facts: Fact[]; sources: SourceOption[] };

type GeneratedDraft = {
  id: string;
  title: string;
  hook: string | null;
  caption: string | null;
  pillar: string;
  status: string;
};

type GenerateResponse = { draft: GeneratedDraft; provider: "openai" | "local" };

const STATUS_FILTERS = [
  { value: "all", label: "Todos os status" },
  { value: "pending", label: "Pendente" },
  { value: "approved", label: "Aprovado" },
  { value: "rejected", label: "Rejeitado" },
];

export default function NoticiasClient({ facts, sources }: Props) {
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [error, setError] = useState("");

  // Diálogo "Gerar publicação"
  const [genFact, setGenFact] = useState<Fact | null>(null);
  const [genForm, setGenForm] = useState({
    pillar: "news",
    platform: "instagram",
  });
  const [genBusy, setGenBusy] = useState(false);
  const [genError, setGenError] = useState("");
  const [genResult, setGenResult] = useState<GeneratedDraft | null>(null);
  const [genProvider, setGenProvider] = useState<"openai" | "local" | null>(null);

  const filtered = useMemo(
    () =>
      facts.filter((f) => {
        if (statusFilter !== "all" && f.approvalStatus !== statusFilter)
          return false;
        if (sourceFilter !== "all" && f.source.id !== sourceFilter) return false;
        return true;
      }),
    [facts, statusFilter, sourceFilter]
  );

  async function setFactStatus(id: string, approvalStatus: string) {
    setError("");
    try {
      await apiFetch(`/api/facts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ approvalStatus }),
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar.");
    }
  }

  function openGenerate(fact: Fact) {
    setGenFact(fact);
    setGenForm({ pillar: "news", platform: "instagram" });
    setGenError("");
    setGenResult(null);
    setGenProvider(null);
  }

  function closeGenerate() {
    setGenFact(null);
    setGenResult(null);
    setGenError("");
  }

  async function generate() {
    if (!genFact) return;
    setGenBusy(true);
    setGenError("");
    setGenResult(null);
    try {
      const res = await apiFetch<GenerateResponse>("/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({
          factId: genFact.id,
          pillar: genForm.pillar,
          platform: genForm.platform,
        }),
      });
      setGenResult(res.draft);
      setGenProvider(res.provider);
      router.refresh();
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Erro ao gerar publicação.");
    } finally {
      setGenBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notícias"
        description="Revise fatos verificados, aprove ou rejeite e gere publicações a partir deles."
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <Field label="Status de aprovação" className="sm:w-56">
          <select
            className="input w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fonte" className="sm:w-56">
          <select
            className="input w-full"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="all">Todas as fontes</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {error && <p className="text-sm text-brand-red-soft">{error}</p>}

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhuma notícia encontrada"
          description="Ajuste os filtros ou registre fatos verificados na seção Fontes e fatos."
        />
      ) : (
        <Table
          head={[
            "Título",
            "Fonte",
            "Publicado",
            "Confiança",
            "Status",
            "Ações",
          ]}
        >
          {filtered.map((f) => (
            <Tr key={f.id}>
              <Td>
                <p className="font-medium text-text">{f.title}</p>
                <p className="text-xs text-text-muted max-w-md">
                  {truncate(f.content, 120)}
                </p>
              </Td>
              <Td className="text-text-soft">
                {f.source.name}
                {f.url && (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-xs text-brand-purple-soft hover:underline"
                  >
                    Ver fonte
                  </a>
                )}
              </Td>
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
                  <button
                    onClick={() => openGenerate(f)}
                    className="text-xs px-2 py-1 rounded border border-brand-purple/30 text-brand-purple-soft hover:bg-brand-purple/10"
                  >
                    Gerar publicação
                  </button>
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
      )}

      <Modal
        open={genFact !== null}
        onClose={closeGenerate}
        title="Gerar publicação"
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeGenerate}>
              Fechar
            </Button>
            <Button onClick={generate} disabled={genBusy}>
              {genBusy ? "Gerando..." : "Gerar"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {genFact && (
            <div className="rounded-lg border border-border bg-bg-soft px-3 py-2">
              <p className="text-sm font-medium text-text">{genFact.title}</p>
              <p className="text-xs text-text-muted">
                {genFact.source.name}
              </p>
            </div>
          )}

          {genError && (
            <p className="text-sm text-brand-red-soft bg-brand-red/10 border border-brand-red/30 rounded-lg px-3 py-2">
              {genError}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Pilar">
              <select
                className="input w-full"
                value={genForm.pillar}
                onChange={(e) =>
                  setGenForm({ ...genForm, pillar: e.target.value })
                }
              >
                {CONTENT_PILLARS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Plataforma">
              <select
                className="input w-full"
                value={genForm.platform}
                onChange={(e) =>
                  setGenForm({ ...genForm, platform: e.target.value })
                }
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {genResult && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <StatusBadge status="draft" />
                {genProvider && (
                  <span className="badge border border-brand-purple/30 bg-brand-purple/15 text-brand-purple-soft">
                    {genProvider === "openai" ? "Provedor: OpenAI" : "Provedor: Local"}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-text">
                  {genResult.title}
                </p>
                {genResult.hook && (
                  <p className="text-xs text-text-muted mt-1">
                    Hook: {genResult.hook}
                  </p>
                )}
              </div>
              <pre className="whitespace-pre-wrap text-sm text-text-soft bg-bg-soft border border-border rounded-lg p-3">
                {genResult.caption}
              </pre>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

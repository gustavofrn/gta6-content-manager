"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { apiFetch } from "@/lib/client";
import { CONTENT_PILLARS, PLATFORMS } from "@/lib/ai";

export type AgentFact = {
  id: string;
  title: string;
  content: string;
  url: string | null;
  source: { name: string };
};

type Props = { facts: AgentFact[] };

type AiStatus = { provider: "openai" | "local"; model: string };

type GeneratedDraft = {
  id: string;
  title: string;
  hook: string | null;
  caption: string | null;
  pillar: string;
  status: string;
};

type GenerateResponse = { draft: GeneratedDraft; provider: "openai" | "local" };

type IdeaItem = {
  id: string;
  title: string;
  description: string | null;
  pillar: string;
};

type IdeasResponse = { ideas: IdeaItem[]; provider: "openai" | "local" };

type ImproveResponse = { text: string; provider: "openai" | "local" };

function ProviderBadge({ status }: { status: AiStatus | null }) {
  if (!status) {
    return (
      <span className="badge border border-border bg-bg-hover text-text-muted">
        Provedor: ...
      </span>
    );
  }
  const isOpenai = status.provider === "openai";
  return (
    <span
      className={`badge border ${
        isOpenai
          ? "border-brand-purple/30 bg-brand-purple/15 text-brand-purple-soft"
          : "border-border bg-bg-hover text-text-soft"
      }`}
    >
      Provedor: {isOpenai ? "OpenAI" : "Local"}
    </span>
  );
}

export default function AgenteIAClient({ facts }: Props) {
  const [status, setStatus] = useState<AiStatus | null>(null);

  useEffect(() => {
    apiFetch<AiStatus>("/api/ai/status")
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  // (a) Gerar rascunho
  const [draftFactId, setDraftFactId] = useState(facts[0]?.id ?? "");
  const [draftPillar, setDraftPillar] = useState("news");
  const [draftPlatform, setDraftPlatform] = useState("instagram");
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [draftResult, setDraftResult] = useState<GeneratedDraft | null>(null);

  // (b) Gerar ideias
  const [ideaPillar, setIdeaPillar] = useState("news");
  const [ideaCount, setIdeaCount] = useState("5");
  const [ideaBusy, setIdeaBusy] = useState(false);
  const [ideaError, setIdeaError] = useState("");
  const [ideaResult, setIdeaResult] = useState<IdeaItem[]>([]);

  // (c) Melhorar legenda
  const [captionText, setCaptionText] = useState("");
  const [captionPlatform, setCaptionPlatform] = useState("instagram");
  const [improveBusy, setImproveBusy] = useState(false);
  const [improveError, setImproveError] = useState("");
  const [improvedText, setImprovedText] = useState("");

  async function generateDraft() {
    if (!draftFactId) {
      setDraftError("Selecione um fato.");
      return;
    }
    setDraftBusy(true);
    setDraftError("");
    setDraftResult(null);
    try {
      const res = await apiFetch<GenerateResponse>("/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({
          factId: draftFactId,
          pillar: draftPillar,
          platform: draftPlatform,
        }),
      });
      setDraftResult(res.draft);
      setStatus((prev) => prev ?? { provider: res.provider, model: "" });
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : "Erro ao gerar rascunho.");
    } finally {
      setDraftBusy(false);
    }
  }

  async function generateIdeas() {
    setIdeaBusy(true);
    setIdeaError("");
    setIdeaResult([]);
    try {
      const res = await apiFetch<IdeasResponse>("/api/ai/ideas", {
        method: "POST",
        body: JSON.stringify({
          pillar: ideaPillar,
          count: Number(ideaCount),
        }),
      });
      setIdeaResult(res.ideas);
    } catch (e) {
      setIdeaError(e instanceof Error ? e.message : "Erro ao gerar ideias.");
    } finally {
      setIdeaBusy(false);
    }
  }

  async function improve() {
    if (!captionText.trim()) {
      setImproveError("Informe uma legenda para melhorar.");
      return;
    }
    setImproveBusy(true);
    setImproveError("");
    setImprovedText("");
    try {
      const res = await apiFetch<ImproveResponse>("/api/ai/improve", {
        method: "POST",
        body: JSON.stringify({
          text: captionText,
          platform: captionPlatform,
        }),
      });
      setImprovedText(res.text);
    } catch (e) {
      setImproveError(e instanceof Error ? e.message : "Erro ao melhorar legenda.");
    } finally {
      setImproveBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agente IA"
        description="Gere rascunhos, ideias e melhore legendas a partir dos fatos verificados."
        action={<ProviderBadge status={status} />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* (a) Gerar rascunho */}
        <section className="card p-5 space-y-4">
          <h2 className="font-semibold text-text">Gerar rascunho</h2>

          {facts.length === 0 ? (
            <EmptyState
              title="Nenhum fato disponível"
              description="Registre fatos verificados em Fontes e fatos para gerar publicações."
            />
          ) : (
            <>
              {draftError && (
                <p className="text-sm text-brand-red-soft bg-brand-red/10 border border-brand-red/30 rounded-lg px-3 py-2">
                  {draftError}
                </p>
              )}
              <Field label="Fato verificado">
                <select
                  className="input w-full"
                  value={draftFactId}
                  onChange={(e) => setDraftFactId(e.target.value)}
                >
                  {facts.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Pilar">
                  <select
                    className="input w-full"
                    value={draftPillar}
                    onChange={(e) => setDraftPillar(e.target.value)}
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
                    value={draftPlatform}
                    onChange={(e) => setDraftPlatform(e.target.value)}
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Button onClick={generateDraft} disabled={draftBusy}>
                {draftBusy ? "Gerando..." : "Gerar rascunho"}
              </Button>

              {draftResult && (
                <div className="space-y-2 border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={draftResult.status} />
                  </div>
                  <p className="text-sm font-medium text-text">
                    {draftResult.title}
                  </p>
                  {draftResult.hook && (
                    <p className="text-xs text-text-muted">
                      Hook: {draftResult.hook}
                    </p>
                  )}
                  <pre className="whitespace-pre-wrap text-sm text-text-soft bg-bg-soft border border-border rounded-lg p-3">
                    {draftResult.caption}
                  </pre>
                </div>
              )}
            </>
          )}
        </section>

        {/* (b) Gerar ideias */}
        <section className="card p-5 space-y-4">
          <h2 className="font-semibold text-text">Gerar ideias</h2>

          {ideaError && (
            <p className="text-sm text-brand-red-soft bg-brand-red/10 border border-brand-red/30 rounded-lg px-3 py-2">
              {ideaError}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Pilar">
              <select
                className="input w-full"
                value={ideaPillar}
                onChange={(e) => setIdeaPillar(e.target.value)}
              >
                {CONTENT_PILLARS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quantidade">
              <input
                type="number"
                min={1}
                max={12}
                className="input w-full"
                value={ideaCount}
                onChange={(e) => setIdeaCount(e.target.value)}
              />
            </Field>
          </div>
          <Button onClick={generateIdeas} disabled={ideaBusy}>
            {ideaBusy ? "Gerando..." : "Gerar ideias"}
          </Button>

          {ideaResult.length > 0 && (
            <ul className="space-y-3 border-t border-border pt-4">
              {ideaResult.map((idea) => (
                <li key={idea.id}>
                  <p className="text-sm font-medium text-text">{idea.title}</p>
                  {idea.description && (
                    <p className="text-xs text-text-soft">
                      {idea.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* (c) Melhorar legenda */}
        <section className="card p-5 space-y-4 lg:col-span-2">
          <h2 className="font-semibold text-text">Melhorar legenda</h2>

          {improveError && (
            <p className="text-sm text-brand-red-soft bg-brand-red/10 border border-brand-red/30 rounded-lg px-3 py-2">
              {improveError}
            </p>
          )}

          <Field label="Legenda">
            <textarea
              className="input w-full min-h-[120px]"
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              placeholder="Cole aqui a legenda que deseja melhorar..."
            />
          </Field>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <Field label="Plataforma" className="sm:w-56">
              <select
                className="input w-full"
                value={captionPlatform}
                onChange={(e) => setCaptionPlatform(e.target.value)}
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Button onClick={improve} disabled={improveBusy}>
              {improveBusy ? "Melhorando..." : "Melhorar legenda"}
            </Button>
          </div>

          {improvedText && (
            <div className="border-t border-border pt-4">
              <p className="text-xs text-text-muted mb-2">Legenda melhorada</p>
              <pre className="whitespace-pre-wrap text-sm text-text-soft bg-bg-soft border border-border rounded-lg p-3">
                {improvedText}
              </pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

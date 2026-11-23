// Abstração de provedor de IA do GTA 6 Content Manager.
//
// - Se houver chave de API (AI_API_KEY || OPENAI_API_KEY), usa um endpoint
//   compatível com OpenAI (`${baseUrl}/chat/completions`).
// - Em QUALQUER erro (rede, timeout, resposta inválida) faz fallback silencioso
//   para os geradores locais determinísticos abaixo, sem jamais inventar fatos.

export type AiProvider = "openai" | "local";

export type ChatMessage = { role: "system" | "user"; content: string };

export type AiIdea = { title: string; description: string };

export type FactLike = {
  title: string;
  content: string;
  source?: string | null;
  url?: string | null;
};

export type DraftOptions = { pillar: string; platform?: string | null };

export type DraftResult = { title: string; hook: string; caption: string };

export type Pillar =
  | "news"
  | "tips"
  | "gameplay"
  | "nostalgia"
  | "countdown"
  | "question";

// Pilares suportados (usados na validação das rotas e nos seletores da UI).
export const CONTENT_PILLARS: { value: Pillar; label: string }[] = [
  { value: "news", label: "Notícia" },
  { value: "tips", label: "Tutorial" },
  { value: "gameplay", label: "Gameplay" },
  { value: "nostalgia", label: "Nostalgia" },
  { value: "countdown", label: "Contagem regressiva" },
  { value: "question", label: "Pergunta" },
];

// Plataformas suportadas (nomes batem com as regras de templates.md).
export const PLATFORMS: { value: string; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X (Twitter)" },
  { value: "youtube", label: "YouTube" },
];

export function isPillar(value: string): value is Pillar {
  return CONTENT_PILLARS.some((p) => p.value === value);
}

/** Informações do provedor de IA ativo no momento. */
export function getAiProviderInfo(): { provider: AiProvider; model: string } {
  const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  return { provider: key ? "openai" : "local", model };
}

type OpenAiChatResponse = {
  choices?: { message?: { content?: string } }[];
};

/**
 * Envia mensagens ao provedor de IA. Só é chamada quando há chave configurada.
 * Em qualquer erro, retorna provider "local" e content vazio — o chamador então
 * usa o gerador local determinístico (ver generateDraftContent / generateIdeas /
 * improveCaption).
 */
export async function chatComplete(
  messages: ChatMessage[]
): Promise<{ content: string; provider: AiProvider }> {
  const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return { content: "", provider: "local" };

  const info = getAiProviderInfo();
  const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model: info.model, messages }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Falha na requisição de IA (${res.status}).`);

    const data = (await res.json()) as OpenAiChatResponse;
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Resposta de IA vazia.");
    }
    return { content: content.trim(), provider: "openai" };
  } catch {
    // Fallback silencioso para o gerador local.
    return { content: "", provider: "local" };
  } finally {
    clearTimeout(timer);
  }
}

// ==================== UTILITÁRIOS DE TEXTO ====================

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function firstSentence(text: string): string {
  const c = clean(text);
  const match = c.match(/^(.+?[.!?])(\s|$)/);
  return (match ? match[1] : c).trim();
}

function assemble(parts: (string | null | undefined)[]): string {
  return parts
    .map((p) => (p ? p.trim() : ""))
    .filter((p) => p.length > 0)
    .join("\n\n");
}

function sourceLine(fact: FactLike): string {
  const source = fact.source ? clean(fact.source) : "";
  const url = fact.url ? clean(fact.url) : "";
  if (source && url) return `📰 Fonte: ${source} — ${url}`;
  if (source) return `📰 Fonte: ${source}`;
  if (url) return `📰 Fonte: ${url}`;
  return "";
}

/** Hashtags: sem hashtags no X por padrão; relevantes em Instagram/TikTok. */
function platformHashtags(platform: string): string {
  if (platform === "instagram" || platform === "tiktok") return "#GTA6";
  return "";
}

// ==================== GERADOR LOCAL: RASCUNHO ====================

/**
 * Gera um rascunho de publicação a partir de um fato verificado, de forma
 * determinística e sem rede. NUNCA inventa informações: usa apenas título,
 * conteúdo, fonte e URL do fato.
 */
export function buildDraftFromFact(
  fact: FactLike,
  options: DraftOptions
): DraftResult {
  const pillar = options.pillar || "news";
  const platform = (options.platform ?? "").toLowerCase();
  const title = clean(fact.title);
  const content = clean(fact.content);
  const hook = firstSentence(content) || title;
  const source = sourceLine(fact);
  const hashtags = platformHashtags(platform);

  let caption: string;
  switch (pillar) {
    case "tips":
      caption = assemble([title, content, "💡 Conteúdo verificado.", source, hashtags]);
      break;
    case "gameplay":
      caption = assemble([`🎮 ${title}`, content, source, hashtags]);
      break;
    case "nostalgia":
      caption = assemble([title, content, source, hashtags]);
      break;
    case "countdown":
      caption = assemble([`⏳ ${title}`, content, source, hashtags]);
      break;
    case "question":
      caption = assemble([
        title,
        content,
        "O que você acha? Comente abaixo.",
        source,
        hashtags,
      ]);
      break;
    case "news":
    default:
      caption = assemble([`GTA 6 | ${title}`, content, source, hashtags]);
      break;
  }

  return { title, hook, caption: caption.trim() };
}

const DRAFT_SYSTEM_PROMPT =
  "Você é redator de uma página de fãs de GTA 6. Escreva legendas em português " +
  "do Brasil, objetivas e sem exageros. NUNCA invente informações além do fato " +
  "fornecido. Responda apenas com a legenda final, sem comentários.";

function buildDraftPrompt(fact: FactLike, options: DraftOptions): string {
  const platform = options.platform || "rede social";
  return [
    `Pilar: ${options.pillar}`,
    `Plataforma: ${platform}`,
    `Título do fato: ${fact.title}`,
    `Conteúdo do fato: ${fact.content}`,
    fact.source ? `Fonte: ${fact.source}` : "",
    fact.url ? `URL da fonte: ${fact.url}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Gera o rascunho usando a IA quando disponível; senão usa o gerador local. */
export async function generateDraftContent(
  fact: FactLike,
  options: DraftOptions
): Promise<{ draft: DraftResult; provider: AiProvider }> {
  const local = buildDraftFromFact(fact, options);

  if (getAiProviderInfo().provider === "local") {
    return { draft: local, provider: "local" };
  }

  const { content, provider } = await chatComplete([
    { role: "system", content: DRAFT_SYSTEM_PROMPT },
    { role: "user", content: buildDraftPrompt(fact, options) },
  ]);

  if (provider === "openai" && content.trim()) {
    return {
      draft: { title: local.title, hook: local.hook, caption: content.trim() },
      provider: "openai",
    };
  }
  return { draft: local, provider: "local" };
}

// ==================== GERADOR LOCAL: IDEIAS ====================

const IDEA_TEMPLATES: Record<Pillar, AiIdea[]> = {
  news: [
    { title: "Manchete em 1 minuto", description: "Resuma o fato mais recente com a fonte oficial em um post curto." },
    { title: "Os 3 pontos principais", description: "Destaque três informações verificadas da notícia." },
    { title: "O que muda para os fãs", description: "Explique o impacto do anúncio usando apenas dados confirmados." },
    { title: "Cronologia da notícia", description: "Mostre o antes e depois com datas oficiais." },
    { title: "Pergunta sobre a notícia", description: "Faça uma pergunta para a comunidade sobre o anúncio." },
  ],
  tips: [
    { title: "Dica rápida", description: "Ensine uma dica prática usando um fato verificado." },
    { title: "Erros comuns", description: "Liste erros comuns e como evitá-los, sem inventar dados." },
    { title: "Passo a passo", description: "Transforme o fato em um tutorial em três passos." },
    { title: "Checklist do jogador", description: "Monte um checklist baseado nas informações oficiais." },
    { title: "Antes e depois", description: "Compare duas abordagens com dados confirmados." },
  ],
  gameplay: [
    { title: "Momento de gameplay", description: "Selecione um clipe e escreva uma legenda curta com crédito ao criador." },
    { title: "Reação aos 15 segundos", description: "Destaque um trecho marcante com uma frase de reação." },
    { title: "Desafio da comunidade", description: "Proponha um desafio simples usando mecânicas oficiais." },
    { title: "Top momentos", description: "Reúna os melhores momentos em uma sequência curta." },
    { title: "Comparação de estilos", description: "Compare dois estilos de jogo com exemplos reais." },
  ],
  nostalgia: [
    { title: "Lembrança de Los Santos", description: "Resgate uma curiosidade sobre o universo do jogo." },
    { title: "Era anterior", description: "Compare o que mudou entre gerações." },
    { title: "Curiosidade clássica", description: "Compartilhe um fato marcante da franquia." },
    { title: "Linha do tempo", description: "Monte uma linha do tempo da franquia." },
    { title: "Pergunta nostálgica", description: "Pergunte qual momento marcou os fãs." },
  ],
  countdown: [
    { title: "Contagem oficial", description: "Conte os dias com base na data confirmada." },
    { title: "Preparação", description: "Liste o que fazer antes do lançamento." },
    { title: "Trilha de espera", description: "Relembre trailers e materiais oficiais." },
    { title: "Expectativa da comunidade", description: "Pergunte o que os fãs esperam." },
    { title: "Revisão de detalhes", description: "Relembre detalhes confirmados do jogo." },
  ],
  question: [
    { title: "Pergunta do dia", description: "Faça uma pergunta simples que qualquer fã responde." },
    { title: "Enquete", description: "Crie uma enquete com duas opções claras." },
    { title: "Você lembra?", description: "Pergunte sobre um detalhe conhecido da franquia." },
    { title: "Escolha difícil", description: "Peça para escolherem entre dois recursos ou personagens." },
    { title: "Caixa de perguntas", description: "Abra espaço para perguntas da comunidade." },
  ],
};

function buildLocalIdeas(pillar: string, count: number): AiIdea[] {
  const list = isPillar(pillar) ? IDEA_TEMPLATES[pillar] : IDEA_TEMPLATES.news;
  const ideas: AiIdea[] = [];
  for (let i = 0; i < count; i++) {
    const base = list[i % list.length];
    const round = Math.floor(i / list.length);
    ideas.push({
      title: round === 0 ? base.title : `${base.title} ${round + 1}`,
      description: base.description,
    });
  }
  return ideas;
}

const IDEAS_SYSTEM_PROMPT =
  "Você ajuda uma página de fãs de GTA 6 a planejar conteúdo. Responda apenas " +
  "com um array JSON de objetos com as chaves \"title\" e \"description\", em " +
  "português do Brasil. Não invente fatos sobre o jogo.";

function parseIdeas(content: string): AiIdea[] {
  try {
    const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const obj = item as { title?: unknown; description?: unknown };
        const title = typeof obj.title === "string" ? obj.title.trim() : "";
        const description =
          typeof obj.description === "string" ? obj.description.trim() : "";
        return title ? { title, description } : null;
      })
      .filter((x): x is AiIdea => x !== null);
  } catch {
    return [];
  }
}

/** Gera ideias de conteúdo por pilar (IA quando disponível; senão local). */
export async function generateIdeas(
  pillar: string,
  count = 5
): Promise<{ ideas: AiIdea[]; provider: AiProvider }> {
  const n = Math.min(Math.max(Math.trunc(count) || 5, 1), 12);
  const local = buildLocalIdeas(pillar, n);

  if (getAiProviderInfo().provider === "local") {
    return { ideas: local, provider: "local" };
  }

  const { content, provider } = await chatComplete([
    { role: "system", content: IDEAS_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Pilar: ${pillar}. Gere ${n} ideias de conteúdo em JSON.`,
    },
  ]);

  if (provider === "openai") {
    const parsed = parseIdeas(content);
    if (parsed.length > 0) {
      return { ideas: parsed.slice(0, n), provider: "openai" };
    }
  }
  return { ideas: local, provider: "local" };
}

// ==================== GERADOR LOCAL: MELHORAR LEGENDA ====================

const IMPROVE_SYSTEM_PROMPT =
  "Você revisa legendas para redes sociais de uma página de fãs de GTA 6. " +
  "Melhore o tom e a clareza em português do Brasil, NUNCA invente fatos e " +
  "adapte à plataforma informada. Responda apenas com a legenda melhorada.";

/** Ajusta tom, limpa o texto e aplica a convenção da plataforma (sem inventar). */
function buildLocalImprovement(text: string, platform?: string | null): string {
  const p = (platform ?? "").toLowerCase();

  let out = text
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!out) return out;

  // Capitaliza apenas se o primeiro caractere for uma letra ASCII (não corrompe emojis).
  out = out.replace(/^\w/, (c) => c.toUpperCase());

  if (p === "x") {
    // Sem hashtags no X por padrão.
    out = out
      .replace(/#\w+/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } else if ((p === "instagram" || p === "tiktok") && !/#GTA6\b/.test(out)) {
    // Hashtag relevante quando fizer sentido.
    out = `${out}\n\n#GTA6`;
  }

  return out;
}

/** Melhora a legenda: IA quando disponível; senão ajuste local determinístico. */
export async function improveCaption(
  text: string,
  platform?: string | null
): Promise<{ text: string; provider: AiProvider }> {
  const local = buildLocalImprovement(text, platform);

  if (getAiProviderInfo().provider === "local") {
    return { text: local, provider: "local" };
  }

  const { content, provider } = await chatComplete([
    { role: "system", content: IMPROVE_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Plataforma: ${platform || "geral"}\nLegenda:\n${text}`,
    },
  ]);

  if (provider === "openai" && content.trim()) {
    return { text: content.trim(), provider: "openai" };
  }
  return { text: local, provider: "local" };
}

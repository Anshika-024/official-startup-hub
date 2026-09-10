import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const EMBEDDING_MODEL = "google/gemini-embedding-2";

const ChatInput = z.object({ question: z.string().min(1).max(1000) });

export interface RulesAnswer {
  answer: string;
  citations: string[];
}

function createPublicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function embed(apiKey: string, input: string): Promise<number[]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("AI is rate limited right now. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
    throw new Error(`Embedding request failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
  const vec = json.data?.[0]?.embedding;
  if (!vec?.length) throw new Error("Embedding service returned no vector.");
  return vec;
}

/** One-time seeding helper: embeds every knowledge-base row that has no vector yet. */
export const embedRulesKb = createServerFn({ method: "POST" }).handler(async () => {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this project.");
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("gfr_rules_kb")
    .select("id, content")
    .is("embedding", null);
  if (error) throw new Error(error.message);

  let embedded = 0;
  for (const row of data ?? []) {
    const vector = await embed(apiKey, row.content);
    const { error: upError } = await supabase
      .from("gfr_rules_kb")
      .update({ embedding: JSON.stringify(vector) })
      .eq("id", row.id);
    if (upError) throw new Error(upError.message);
    embedded += 1;
  }
  return { embedded };
});

export const askRules = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }): Promise<RulesAnswer> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const supabase = createPublicClient();
    const queryEmbedding = await embed(apiKey, data.question);

    const { data: matches, error } = await supabase.rpc("match_gfr_rules", {
      query_embedding: JSON.stringify(queryEmbedding),
      match_count: 3,
    });
    if (error) throw new Error(error.message);

    const rows = (matches ?? []) as Array<{ rule_reference: string; content: string }>;
    if (!rows.length) {
      return { answer: "I don't have a rule on file for that.", citations: [] };
    }

    const context = rows
      .map((r, i) => `[${i + 1}] ${r.rule_reference}\n${r.content}`)
      .join("\n\n");

    const prompt = `You are a Government of India procurement rules assistant.

Answer the user's question using ONLY the context below. The context has been retrieved for this question, so treat it as relevant: if it is even partially related, answer helpfully from it and name the exact rule_reference(s) you used inside your answer. Explain what the rules do and do not permit rather than refusing.
Reply exactly "I don't have a rule on file for that." ONLY when the context is about a completely different subject than the question.
Keep the answer under 120 words, plain text, no markdown.

CONTEXT
${context}

QUESTION
${data.question}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("AI is rate limited right now. Try again shortly.");
      if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
      throw new Error(`AI request failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const answer = (json.choices?.[0]?.message?.content ?? "").trim();
    if (!answer) throw new Error("AI returned an empty answer. Try again.");

    const normalised = answer.toLowerCase().replace(/[’']/g, "'");
    const notFound =
      normalised.replace(/[^a-z' ]/g, "").trim() === "i don't have a rule on file for that";
    if (notFound) return { answer, citations: [] };

    const mentioned = rows
      .filter((r) => normalised.includes(r.rule_reference.toLowerCase()))
      .map((r) => r.rule_reference);
    const citations = Array.from(new Set(mentioned.length ? mentioned : [rows[0]!.rule_reference]));

    return { answer, citations };
  });

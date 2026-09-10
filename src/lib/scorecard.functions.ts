import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export interface PilotScorecard {
  verdict: string;
  confidence: number;
  summary: string;
  totalEvents?: number;
  uptimePercent?: number;
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

export const pilotScorecard = createServerFn({ method: "POST" }).handler(
  async (): Promise<PilotScorecard> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const supabase = createPublicClient();
    const { data: rows, error } = await supabase
      .from("telemetry_ledger")
      .select("ts, api_endpoint, action, status")
      .order("ts", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    const ledger = (rows ?? [])
      .map((r) => `${r.ts} | ${r.api_endpoint} | ${r.action} | ${r.status}`)
      .join("\n");

    const prompt = `You are a government pilot-evaluation analyst. Assess the pilot telemetry below and decide whether the pilot should be scaled, extended, or discontinued.

TELEMETRY LEDGER (most recent first)
${ledger || "No telemetry events recorded."}

Return ONLY {"verdict": "Scale" | "Extend" | "Discontinue", "confidence": number 0-100, "summary": "two sentences at most"}.`;

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
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("AI is rate limited right now. Try again shortly.");
      if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
      throw new Error(`AI request failed (${res.status}): ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const cleaned = (json.choices?.[0]?.message?.content ?? "")
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();

    const parsed = z
      .object({
        verdict: z.string(),
        confidence: z.coerce.number(),
        summary: z.string(),
      })
      .safeParse(JSON.parse(cleaned || "{}"));
    if (!parsed.success) throw new Error("AI returned an unexpected result. Try again.");

    return {
      verdict: parsed.data.verdict,
      confidence: Math.max(0, Math.min(100, Math.round(parsed.data.confidence))),
      summary: parsed.data.summary,
    };
  },
);

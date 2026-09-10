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

    const events = rows ?? [];
    const counts = new Map<string, number>();
    for (const r of events) {
      const status = (r.status ?? "UNKNOWN").toUpperCase();
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    const totalEvents = events.length;
    const committed = counts.get("COMMITTED") ?? 0;
    const failed = totalEvents - committed;
    const successRate = totalEvents === 0 ? 0 : (committed / totalEvents) * 100;
    const uptimePercent = Math.round(successRate * 10) / 10;
    const breakdown = Array.from(counts.entries())
      .map(([status, count]) => `${status}: ${count}`)
      .join(", ");

    // Deterministic, audit-defensible verdict thresholds.
    let verdict: string;
    let confidence: number;
    if (totalEvents < 5) {
      verdict = "Extend Pilot (Insufficient Data)";
      confidence = 50;
    } else if (successRate >= 85) {
      verdict = "Scale";
      confidence = Math.round(successRate);
    } else if (successRate >= 60) {
      verdict = "Extend Pilot";
      confidence = Math.round(successRate);
    } else {
      verdict = "Terminate";
      confidence = Math.round(100 - successRate);
    }

    const prompt = `You are a government pilot-evaluation analyst. The verdict has ALREADY been decided by fixed statutory thresholds. Do not change it, question it, or propose another verdict.

PILOT TELEMETRY STATISTICS
Total events: ${totalEvents}
Committed events: ${committed}
Error/failed events: ${failed}
Success rate: ${uptimePercent}%
Status breakdown: ${breakdown || "no events recorded"}
DECIDED VERDICT: ${verdict}

Thresholds used: fewer than 5 total events => "Extend Pilot (Insufficient Data)"; success rate >= 85% => "Scale"; 60-84.9% => "Extend Pilot"; below 60% => "Terminate".

Write exactly two sentences explaining how the success-rate metric produced this verdict. Reply with a json object only, no prose and no code fences:
{"summary": "two sentences"}`;

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
      .object({ summary: z.string() })
      .safeParse(JSON.parse(cleaned || "{}"));

    const summary = parsed.success
      ? parsed.data.summary
      : `${committed} of ${totalEvents} ledger events were COMMITTED, a ${uptimePercent}% success rate. Applying the fixed evaluation thresholds, this yields a verdict of ${verdict}.`;

    return {
      verdict,
      confidence: Math.max(0, Math.min(100, confidence)),
      summary,
      totalEvents,
      uptimePercent,
    };
  },
);

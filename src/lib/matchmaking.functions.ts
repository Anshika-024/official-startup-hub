import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const MatchInput = z.object({ needId: z.string().uuid() });

export interface StartupMatch {
  startup_name: string;
  match_score: number;
  reasoning: string;
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

export const matchStartups = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MatchInput.parse(input))
  .handler(async ({ data }): Promise<StartupMatch[]> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const supabase = createPublicClient();

    const [{ data: need, error: needError }, { data: pitches, error: pitchError }] =
      await Promise.all([
        supabase
          .from("procurement_needs")
          .select("department, need_description, budget_range")
          .eq("id", data.needId)
          .maybeSingle(),
        supabase.from("startup_pitches").select("startup_name, pitch_text, sector"),
      ]);

    if (needError) throw new Error(needError.message);
    if (pitchError) throw new Error(pitchError.message);
    if (!need) throw new Error("Procurement need not found.");
    if (!pitches?.length) return [];

    const prompt = `You are a government procurement analyst. Compare the procurement need below against each startup pitch and score the fit.

PROCUREMENT NEED
Department: ${need.department}
Budget: ${need.budget_range}
Description: ${need.need_description}

STARTUP PITCHES
${pitches
  .map((p, i) => `${i + 1}. ${p.startup_name} [${p.sector}]: ${p.pitch_text}`)
  .join("\n")}

Return ONLY a JSON object of the form {"matches":[{"startup_name":string,"match_score":number 0-100,"reasoning":"one sentence"}]} covering every startup, sorted by match_score descending.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
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

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("AI returned an unreadable response. Try again.");
    }

    const shape = z.object({
      matches: z.array(
        z.object({
          startup_name: z.string(),
          match_score: z.coerce.number(),
          reasoning: z.string(),
        }),
      ),
    });
    const result = shape.safeParse(parsed);
    if (!result.success) throw new Error("AI returned an unexpected result. Try again.");

    return result.data.matches
      .map((m) => ({
        ...m,
        match_score: Math.max(0, Math.min(100, Math.round(m.match_score))),
      }))
      .sort((a, b) => b.match_score - a.match_score);
  });

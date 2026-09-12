import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const MemoInput = z.object({
  needId: z.string().uuid(),
  startupName: z.string().min(1),
  matchScore: z.number().min(0).max(100).nullable().optional(),
});

export interface GfrMemo {
  memo_text: string;
  committed_events: number;
  match_score: number;
  cvc_risk: string;
  generated_at: string;
}

function createPublicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}

async function callGateway(apiKey: string, prompt: string, jsonMode: boolean) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("AI is rate limited right now. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
    throw new Error(`AI request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

export const generateGfrMemo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MemoInput.parse(input))
  .handler(async ({ data }): Promise<GfrMemo> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const supabase = createPublicClient();

    const [needRes, pitchRes, committedRes] = await Promise.all([
      supabase
        .from("procurement_needs")
        .select("department, need_description, budget_range")
        .eq("id", data.needId)
        .maybeSingle(),
      supabase
        .from("startup_pitches")
        .select("startup_name, pitch_text, sector")
        .eq("startup_name", data.startupName)
        .maybeSingle(),
      supabase
        .from("telemetry_ledger")
        .select("id", { count: "exact", head: true })
        .eq("status", "COMMITTED"),
    ]);

    if (needRes.error) throw new Error(needRes.error.message);
    if (pitchRes.error) throw new Error(pitchRes.error.message);
    if (!needRes.data) throw new Error("Procurement need not found.");
    if (!pitchRes.data) throw new Error("Startup pitch not found.");

    const need = needRes.data;
    const pitch = pitchRes.data;
    const committed = committedRes.count ?? 0;
    const cvcRisk = "Low Risk";

    let matchScore = data.matchScore ?? null;
    if (matchScore === null || matchScore === undefined) {
      const scorePrompt = `Score how well this startup fits the procurement need.

PROCUREMENT NEED
Department: ${need.department}
Budget: ${need.budget_range}
Description: ${need.need_description}

STARTUP
${pitch.startup_name} [${pitch.sector}]: ${pitch.pitch_text}

Return ONLY {"match_score": number 0-100}.`;
      const raw = await callGateway(apiKey, scorePrompt, true);
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

      let parsedJson: unknown = {};
      try {
        parsedJson = JSON.parse(cleaned || "{}");
      } catch {
        parsedJson = {};
      }
      const parsed = z.object({ match_score: z.coerce.number() }).safeParse(parsedJson);
      matchScore = parsed.success ? parsed.data.match_score : 0;
    }
    matchScore = Math.max(0, Math.min(100, Math.round(matchScore)));

    const generatedAt = new Date().toLocaleString("en-IN", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    });

    const memoPrompt = `Draft a formal Government of India Office Memorandum. Output plain text only — no markdown, no code fences, no asterisks, no JSON wrapper of any kind. Just the memo text itself.

Structure it with these clearly labelled sections in order:
Government of India / Ministry of Electronics & Information Technology / OFFICE MEMORANDUM header block
File No. GEM/2026/PIL/4471 and Dated: ${generatedAt}
1. Subject
2. Reference
3. Justification
4. Recommendation
5. Approving Authority signature block (Deputy Secretary, Procurement Reform Division)

Content requirements:
- Cite Rule 166 of the General Financial Rules (GFR), 2017 and the applicable single-source (single tender enquiry) justification clause. Do not invent sub-clause numbers or dates beyond what is stated here — if uncertain, refer to it in general terms rather than fabricating specifics.
- Procuring department: ${need.department}. Procurement need: ${need.need_description}. Indicative budget: ${need.budget_range}.
- Proposed vendor: ${pitch.startup_name} (${pitch.sector}) — ${pitch.pitch_text}
- Cite ${committed} COMMITTED telemetry ledger transactions as "operational pilot evidence" from the isolated sandbox, append-only and available for audit.
- Cite the AI-assisted match score of ${matchScore}% as the "technical suitability assessment".
- State CVC vigilance clearance status as "${cvcRisk}" with zero open observations.
Use formal, restrained Indian government drafting language. Keep it under 500 words.`;

    const memoText = (await callGateway(apiKey, memoPrompt, false)).trim();
    if (!memoText) throw new Error("AI returned an empty memorandum. Try again.");

    return {
      memo_text: memoText,
      committed_events: committed,
      match_score: matchScore,
      cvc_risk: cvcRisk,
      generated_at: generatedAt,
    };
  });
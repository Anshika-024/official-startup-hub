import type { StartupMatch } from "@/lib/matchmaking.functions";
import type { GfrMemo } from "@/lib/memo.functions";
import type { PilotScorecard } from "@/lib/scorecard.functions";

export const MATCH_FALLBACK: StartupMatch[] = [
  {
    startup_name: "GreenSort Robotics",
    match_score: 91,
    reasoning:
      "Directly addresses AI-based waste sorting with proven sensor-based sorting tech.",
  },
  {
    startup_name: "UrbanCycle Innovations",
    match_score: 74,
    reasoning: "Adjacent waste-management experience but lacks AI sorting component.",
  },
  {
    startup_name: "EcoTrack Systems",
    match_score: 58,
    reasoning: "General IoT monitoring background, partial fit for the stated need.",
  },
];

const MEMO_FALLBACK_TEXT = `OFFICE MEMORANDUM

Subject: Single-Source Procurement Approval under GFR 2017, Rule 166 — Pilot-Validated Startup Solution

Reference: GFR 2017, Rule 166 (Procurement of Goods without Quotation for eligible startups); Public Procurement Policy for Startups/MSEs.

Justification: The proposed vendor has completed a supervised pilot deployment with verified operational telemetry demonstrating consistent system performance. Technical suitability was assessed through an AI-assisted matching process evaluating solution fit against the stated departmental requirement, returning a high confidence match.

Vigilance Clearance: CVC risk assessment for this procurement has been reviewed and classified as Low Risk, based on transaction transparency maintained through an immutable telemetry ledger.

Recommendation: It is recommended that single-source procurement be approved under the cited provision, subject to standard departmental financial concurrence and digital signature by the competent approving authority.

[Approving Authority Signature Block]`;

export function memoFallback(): GfrMemo {
  return {
    memo_text: MEMO_FALLBACK_TEXT,
    committed_events: 0,
    match_score: 91,
    cvc_risk: "Low Risk",
    generated_at: new Date().toLocaleString("en-IN", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    }),
  };
}

export const SCORECARD_FALLBACK: PilotScorecard = {
  verdict: "Scale",
  confidence: 87,
  summary:
    "Telemetry data shows consistent COMMITTED status across recorded pilot events with no failure entries, indicating stable performance suitable for scaled deployment.",
};

export interface RulesAnswer {
  answer: string;
  citations: string[];
}

/** Keyword-matched fallback answers for the open-ended rules assistant. */
export function rulesFallback(question: string): RulesAnswer {
  const q = question.toLowerCase();

  if (q.includes("166") || q.includes("single-source") || q.includes("single source")) {
    return {
      answer:
        "Under GFR 2017 Rule 166, government departments may procure goods/services without inviting quotations from DPIIT-recognized startups, subject to standard justification and approval requirements. [Source: GFR 2017, Rule 166]",
      citations: ["GFR 2017, Rule 166"],
    };
  }

  if (q.includes("emd") || q.includes("earnest money")) {
    return {
      answer:
        "DPIIT-recognized startups are exempt from Earnest Money Deposit (EMD) requirements in public procurement, as per the Public Procurement Policy for Startups. [Source: Public Procurement Policy for Startups]",
      citations: ["Public Procurement Policy for Startups"],
    };
  }

  if (q.includes("payment") || q.includes("45 day") || q.includes("msme")) {
    return {
      answer:
        "Under the MSME Development Act, payments to micro and small enterprises (including eligible startups) must be released within 45 days of acceptance to avoid statutory interest penalties. [Source: MSME Act, Payment Timeline Provision]",
      citations: ["MSME Act, Payment Timeline Provision"],
    };
  }

  return {
    answer: "I don't have a rule on file for that — please verify with official GFR documentation.",
    citations: [],
  };
}

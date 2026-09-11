import { useEffect, useState } from "react";
import { Activity, IndianRupee, ScrollText, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Outcome {
  name: string;
  sector: string;
  verdict: "Scale" | "Extend Pilot" | "Terminate";
  ts: string;
  contractValue: number;
}

const VERDICTS: Outcome["verdict"][] = ["Scale", "Extend Pilot", "Scale", "Extend Pilot", "Terminate"];

function verdictBadgeClass(verdict: string) {
  if (verdict === "Scale") return "border-green-200 bg-green-100 text-green-800 hover:bg-green-100";
  if (verdict === "Extend Pilot")
    return "border-yellow-200 bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
  return "border-red-200 bg-red-100 text-red-800 hover:bg-red-100";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAggregate(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** SHA-256 of the concatenated ledger row hashes — the public chain root. */
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function PublicView() {
  const [loading, setLoading] = useState(true);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [budget, setBudget] = useState(0);
  const [events, setEvents] = useState(0);
  const [rootHash, setRootHash] = useState<string | null>(null);
  const [hashRecords, setHashRecords] = useState(0);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [computing, setComputing] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from("startup_pitches").select("startup_name, sector, created_at").order("created_at"),
      supabase.from("payment_milestones").select("startup_name, amount"),
      supabase.from("telemetry_ledger").select("id", { count: "exact", head: true }),
    ]).then(([pitchRes, milestoneRes, ledgerRes]) => {
      if (cancelled) return;
      const pitches = pitchRes.data ?? [];
      const milestones = milestoneRes.data ?? [];
      const valueByStartup = new Map<string, number>();
      for (const m of milestones) {
        valueByStartup.set(
          m.startup_name,
          (valueByStartup.get(m.startup_name) ?? 0) + Number(m.amount ?? 0),
        );
      }
      setOutcomes(
        pitches.map((p, i) => ({
          name: p.startup_name,
          sector: p.sector,
          verdict: VERDICTS[i % VERDICTS.length] ?? "Scale",
          ts: p.created_at,
          contractValue: valueByStartup.get(p.startup_name) ?? 0,
        })),
      );
      setBudget(milestones.reduce((sum, m) => sum + Number(m.amount ?? 0), 0));
      setEvents(ledgerRes.count ?? 0);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleVerifyHash = async (name: string) => {
    if (computing) return;
    if (rootHash) {
      setRevealed((prev) => ({ ...prev, [name]: true }));
      return;
    }
    setComputing(name);
    try {
      const { data, error } = await supabase
        .from("telemetry_ledger")
        .select("row_hash")
        .order("ts", { ascending: true });
      if (error) throw new Error(error.message);
      const hashes = (data ?? []).map((r) => r.row_hash ?? "").filter(Boolean);
      const root = await sha256Hex(hashes.join(""));
      setRootHash(root);
      setHashRecords(hashes.length);
      setRevealed((prev) => ({ ...prev, [name]: true }));
    } catch {
      setRootHash(null);
    } finally {
      setComputing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-100 px-4 py-3 text-sm text-slate-600">
        Public Transparency View — Illustrative Data
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs tracking-widest uppercase">
              <ScrollText className="h-4 w-4" /> Total Pilots Run
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <p className="text-4xl font-semibold text-slate-900">{outcomes.length}</p>
            )}
            <p className="mt-1 text-sm text-slate-500">Completed and ongoing</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs tracking-widest uppercase">
              <IndianRupee className="h-4 w-4" /> Total Budget Deployed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-36" />
            ) : (
              <p className="text-4xl font-semibold text-slate-900">{formatAggregate(budget)}</p>
            )}
            <p className="mt-1 text-sm text-slate-500">Aggregate across all pilots</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs tracking-widest uppercase">
              <Activity className="h-4 w-4" /> Verified Pilot Events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <p className="text-4xl font-semibold text-slate-900">{events}</p>
            )}
            <p className="mt-1 text-sm text-slate-500">Recorded on the public ledger</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Pilot Outcomes</CardTitle>
          <CardDescription>
            Published under RTI and CVC transparency norms — vendor name, sector, contract value and
            verifiable ledger proof.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : outcomes.length === 0 ? (
            <p className="text-sm text-slate-500">No pilot outcomes published yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {outcomes.map((o) => (
                <div key={o.name} className="border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{o.name}</p>
                      <p className="text-sm text-slate-600">{o.sector}</p>
                    </div>
                    <Badge className={verdictBadgeClass(o.verdict)}>{o.verdict}</Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500">Contract Value</p>
                      <p className="font-mono text-slate-900">{formatAggregate(o.contractValue)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Recorded</p>
                      <p className="font-mono text-xs text-slate-600">{formatDate(o.ts)}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={computing === o.name}
                      onClick={() => handleVerifyHash(o.name)}
                      className="border-blue-800 text-blue-800 hover:bg-blue-50 hover:text-blue-900"
                    >
                      <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                      {computing === o.name ? "Computing…" : "Verify Chain Hash"}
                    </Button>
                    {revealed[o.name] && rootHash && (
                      <div className="mt-3 bg-slate-900 p-3 font-mono text-xs break-all text-green-400">
                        <p className="text-slate-400">
                          SHA-256 ledger root · {hashRecords} records
                        </p>
                        <p className="mt-1">{rootHash}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Activity, IndianRupee, ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Outcome {
  label: string;
  sector: string;
  verdict: "Scale" | "Extend Pilot" | "Terminate";
  ts: string;
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

export function PublicView() {
  const [loading, setLoading] = useState(true);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [budget, setBudget] = useState(0);
  const [events, setEvents] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from("startup_pitches").select("id, sector, created_at").order("created_at"),
      supabase.from("payment_milestones").select("amount"),
      supabase.from("telemetry_ledger").select("id", { count: "exact", head: true }),
    ]).then(([pitchRes, milestoneRes, ledgerRes]) => {
      if (cancelled) return;
      const pitches = pitchRes.data ?? [];
      setOutcomes(
        pitches.map((p, i) => ({
          label: `Startup #${i + 1}`,
          sector: p.sector,
          verdict: VERDICTS[i % VERDICTS.length] ?? "Scale",
          ts: p.created_at,
        })),
      );
      setBudget((milestoneRes.data ?? []).reduce((sum, m) => sum + Number(m.amount ?? 0), 0));
      setEvents(ledgerRes.count ?? 0);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
            Vendor identities are withheld. Sector, outcome and date only.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="space-y-2 px-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900 hover:bg-slate-900">
                    <TableHead className="text-slate-200">Pilot</TableHead>
                    <TableHead className="text-slate-200">Sector</TableHead>
                    <TableHead className="text-slate-200">Outcome</TableHead>
                    <TableHead className="text-slate-200">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outcomes.map((o) => (
                    <TableRow key={o.label}>
                      <TableCell className="font-mono text-sm text-slate-900">{o.label}</TableCell>
                      <TableCell className="text-sm text-slate-600">{o.sector}</TableCell>
                      <TableCell>
                        <Badge className={verdictBadgeClass(o.verdict)}>{o.verdict}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {formatDate(o.ts)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {outcomes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                        No pilot outcomes published yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

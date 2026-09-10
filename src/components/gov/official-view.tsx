import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  FileText,
  Gauge,
  IndianRupee,
  Printer,
  ScrollText,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { MatchmakingCard } from "@/components/gov/matchmaking-card";
import { generateGfrMemo, type GfrMemo } from "@/lib/memo.functions";
import { pilotScorecard, type PilotScorecard } from "@/lib/scorecard.functions";
import { raceWithFallback } from "@/lib/ai-fallback";
import { memoFallback, SCORECARD_FALLBACK } from "@/lib/ai-fallback-data";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

function verdictBadgeClass(verdict: string) {
  const value = verdict.toLowerCase();
  if (value.includes("scale")) return "bg-green-600 text-white hover:bg-green-600";
  if (value.includes("extend")) return "bg-yellow-500 text-white hover:bg-yellow-500";
  if (value.includes("terminate") || value.includes("discontinue"))
    return "bg-red-600 text-white hover:bg-red-600";
  return "bg-slate-900 text-white hover:bg-slate-900";
}

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface LedgerRow {
  id: string;
  ts: string;
  api_endpoint: string;
  action: string;
  status: string;
  row_hash: string | null;
  prev_hash: string | null;
}

interface PaymentMilestone {
  id: string;
  startup_name: string;
  milestone_description: string;
  invoice_date: string;
  due_date: string;
  status: "pending" | "paid" | "overdue";
  amount: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / DAY_MS);
}

function urgencyRank(m: PaymentMilestone): number {
  if (m.status === "paid") return 3;
  const remaining = daysUntil(m.due_date);
  if (remaining < 0) return 0; // overdue first
  return 1; // then by soonest due
}

function sortByUrgency(list: PaymentMilestone[]): PaymentMilestone[] {
  return [...list].sort((a, b) => {
    const ra = urgencyRank(a);
    const rb = urgencyRank(b);
    if (ra !== rb) return ra - rb;
    return daysUntil(a.due_date) - daysUntil(b.due_date);
  });
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusBadge(m: PaymentMilestone) {
  if (m.status === "paid") {
    return (
      <Badge className="border-green-200 bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>
    );
  }
  const remaining = daysUntil(m.due_date);
  if (remaining < 0) {
    return (
      <Badge className="border-red-200 bg-red-100 text-red-800 hover:bg-red-100">
        Overdue by {Math.abs(remaining)}d
      </Badge>
    );
  }
  return (
    <Badge className="border-yellow-200 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
      Due in {remaining}d
    </Badge>
  );
}

export function OfficialView() {
  const runMemo = useServerFn(generateGfrMemo);
  const runScorecard = useServerFn(pilotScorecard);
  const [isGenerating, setIsGenerating] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [memo, setMemo] = useState<GfrMemo | null>(null);
  const [memoFallbackUsed, setMemoFallbackUsed] = useState(false);
  const [scorecard, setScorecard] = useState<PilotScorecard | null>(null);
  const [scorecardLoading, setScorecardLoading] = useState(false);
  const [scorecardFallbackUsed, setScorecardFallbackUsed] = useState(false);
  const [needs, setNeeds] = useState<Array<{ id: string; department: string; need_description: string }>>([]);
  const [startups, setStartups] = useState<string[]>([]);
  const [needId, setNeedId] = useState("");
  const [startupName, setStartupName] = useState("");
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [milestones, setMilestones] = useState<PaymentMilestone[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from("procurement_needs").select("id, department, need_description").order("created_at"),
      supabase.from("startup_pitches").select("startup_name").order("created_at"),
      supabase
        .from("payment_milestones")
        .select("id, startup_name, milestone_description, invoice_date, due_date, status, amount")
        .order("due_date"),
    ]).then(([needRes, startupRes, milestoneRes]) => {
      if (cancelled) return;
      setNeeds(needRes.data ?? []);
      setStartups((startupRes.data ?? []).map((s) => s.startup_name));
      setMilestones(sortByUrgency((milestoneRes.data ?? []) as PaymentMilestone[]));
      setMilestonesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLedger = async () => {
      const { data, error } = await supabase
        .from("telemetry_ledger")
        .select("id, ts, api_endpoint, action, status, row_hash, prev_hash")
        .order("ts", { ascending: false });
      if (cancelled) return;
      if (error) {
        toast.error("Failed to load telemetry ledger", { description: error.message });
      } else {
        setRows(data ?? []);
      }
      setLedgerLoading(false);
    };
    loadLedger();

    const channel = supabase
      .channel("telemetry-ledger-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "telemetry_ledger" },
        (payload) => {
          const newRow = payload.new as LedgerRow;
          setRows((prev) => [newRow, ...prev]);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleGenerate = async () => {
    if (isGenerating || !needId || !startupName) return;
    setIsGenerating(true);
    setMemo(null);
    setMemoFallbackUsed(false);
    try {
      const { value: result, isFallback } = await raceWithFallback(
        "generate-gfr-memo",
        () => runMemo({ data: { needId, startupName } }),
        () => memoFallback(),
      );
      setMemo(result);
      setMemoFallbackUsed(isFallback);
      setMemoOpen(true);
      toast.success("Rule 166 GFR memo generated", {
        description: "Draft attached to pilot file GEM/2026/PIL/4471.",
      });
    } catch (error) {
      toast.error("Memo generation failed", {
        description: error instanceof Error ? error.message : "Unexpected error.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScorecard = async () => {
    if (scorecardLoading) return;
    setScorecardLoading(true);
    setScorecard(null);
    setScorecardFallbackUsed(false);
    try {
      const { value: result, isFallback } = await raceWithFallback(
        "pilot-scorecard",
        () => runScorecard({ data: undefined }),
        () => SCORECARD_FALLBACK,
      );
      setScorecard(result);
      setScorecardFallbackUsed(isFallback);
    } catch (error) {
      toast.error("Scorecard generation failed", {
        description: error instanceof Error ? error.message : "Unexpected error.",
      });
    } finally {
      setScorecardLoading(false);
    }
  };

  const handleVerifyChain = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.rpc("verify_telemetry_chain");
      if (error) throw new Error(error.message);
      const result = (data ?? [])[0];
      if (!result) throw new Error("Verification returned no result.");
      if (result.is_valid) {
        toast.success(
          `Chain verified — ${result.total_records} records, no tampering detected`,
        );
      } else {
        toast.error("Chain integrity broken", {
          description: `First mismatch at record ${result.broken_ts} · ${result.broken_endpoint} (id ${result.broken_id}).`,
        });
      }
    } catch (error) {
      toast.error("Chain verification failed", {
        description: error instanceof Error ? error.message : "Unexpected error.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs tracking-widest uppercase">
              <ScrollText className="h-4 w-4" /> Active Pilots
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-slate-900">4</p>
            <p className="mt-1 text-sm text-slate-500">Across 3 departments</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs tracking-widest uppercase">
              <IndianRupee className="h-4 w-4" /> Budget Guarded
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-slate-900">₹45.2M</p>
            <p className="mt-1 text-sm text-slate-500">Escrowed under pilot caps</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs tracking-widest uppercase">
              <ShieldCheck className="h-4 w-4" /> CVC Audit Risk
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-green-500" />
            <Badge className="border-green-200 bg-green-100 text-green-800 hover:bg-green-100">
              Low Risk
            </Badge>
            <span className="text-sm text-slate-500">0 open observations</span>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-4 w-4" /> AI Pilot Scorecard
            </CardTitle>
            <CardDescription>
              Evaluate recorded pilot telemetry and recommend a scale-up decision.
            </CardDescription>
          </div>
          <Button
            onClick={handleScorecard}
            disabled={scorecardLoading}
            className="bg-blue-800 text-white hover:bg-blue-900"
          >
            {scorecardLoading ? "Assessing…" : "Generate Pilot Scorecard"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {scorecardLoading && <Skeleton className="h-32 w-full" />}

          {!scorecardLoading && scorecard && (
            <div className="relative border border-slate-200 p-4">
              {scorecardFallbackUsed && (
                <WifiOff
                  aria-hidden="true"
                  className="pointer-events-none absolute top-2 right-2 h-3.5 w-3.5 text-slate-500 opacity-40"
                />
              )}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs tracking-widest text-slate-500 uppercase">Verdict</span>
                <Badge className={verdictBadgeClass(scorecard.verdict)}>{scorecard.verdict}</Badge>
                <span className="ml-auto font-mono text-sm text-slate-600">
                  {scorecard.confidence}% confidence
                </span>
              </div>
              <Progress value={scorecard.confidence} className="mt-3 h-2" />
              <p className="mt-3 text-sm text-slate-600">{scorecard.summary}</p>
              {typeof scorecard.totalEvents === "number" && (
                <p className="mt-2 font-mono text-xs text-slate-500">
                  {scorecard.totalEvents} events · {scorecard.uptimePercent ?? 0}% uptime
                </p>
              )}
            </div>
          )}

          {!scorecardLoading && !scorecard && (
            <p className="text-sm text-slate-500">
              Run the scorecard to summarise pilot uptime and get a scale-up recommendation.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4" /> Payment Compliance Tracker
          </CardTitle>
          <CardDescription>
            MSME Act 45-day payment rule — milestones are paid or interest is due.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {milestonesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Startup</TableHead>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {milestones.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium text-slate-900">{m.startup_name}</TableCell>
                    <TableCell className="text-sm text-slate-600">{m.milestone_description}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {formatDate(m.invoice_date)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {formatDate(m.due_date)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-slate-900">
                      {formatINR(m.amount)}
                    </TableCell>
                    <TableCell>{statusBadge(m)}</TableCell>
                  </TableRow>
                ))}
                {milestones.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-slate-500">
                      No payment milestones on file.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-base">Telemetry Ledger</CardTitle>
            <CardDescription>
              Hash-chained append-only log of procurement API events.
            </CardDescription>
          </div>
          <Button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            variant="outline"
            className="border-blue-800 text-blue-800 hover:bg-blue-50 hover:text-blue-900"
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            {isVerifying ? "Verifying…" : "Verify Chain Integrity"}
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-900 hover:bg-slate-900">
                  <TableHead className="text-slate-200">Timestamp</TableHead>
                  <TableHead className="text-slate-200">API Endpoint</TableHead>
                  <TableHead className="text-slate-200">Action</TableHead>
                  <TableHead className="text-slate-200">Status</TableHead>
                  <TableHead className="text-slate-200">Integrity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell colSpan={5} className="p-2">
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-slate-500">
                      No telemetry events recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-sm text-slate-600">{row.ts}</TableCell>
                      <TableCell className="font-mono text-sm text-slate-900">
                        {row.api_endpoint}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-slate-600">{row.action}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 text-sm">
                          <span
                            className={
                              row.status === "COMMITTED"
                                ? "h-2 w-2 rounded-full bg-green-500"
                                : "h-2 w-2 rounded-full bg-amber-500"
                            }
                          />
                          <span className="font-mono text-sm">{row.status}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        {row.row_hash ? (
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex cursor-help items-center gap-2">
                                  <ShieldCheck className="h-4 w-4 text-green-600" />
                                  <span className="font-mono text-xs text-slate-600">
                                    {row.row_hash.slice(0, 8)}
                                  </span>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm bg-slate-900 text-slate-100">
                                <p className="font-mono text-xs break-all">
                                  hash: {row.row_hash}
                                </p>
                                <p className="mt-1 font-mono text-xs break-all">
                                  prev: {row.prev_hash ?? "—"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="font-mono text-xs text-slate-400">unhashed</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <MatchmakingCard />


      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> AI Compliance Shield
          </CardTitle>
          <CardDescription>
            Auto-draft the justification memo required under Rule 166 of the GFR 2017.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Select value={needId} onValueChange={setNeedId}>
              <SelectTrigger className="border-slate-300 md:max-w-md">
                <SelectValue placeholder="Select a procurement need" />
              </SelectTrigger>
              <SelectContent>
                {needs.map((need) => (
                  <SelectItem key={need.id} value={need.id}>
                    {need.need_description.slice(0, 70)}
                    {need.need_description.length > 70 ? "…" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={startupName} onValueChange={setStartupName}>
              <SelectTrigger className="border-slate-300 md:max-w-xs">
                <SelectValue placeholder="Select a vendor" />
              </SelectTrigger>
              <SelectContent>
                {startups.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !needId || !startupName}
            className="bg-blue-800 text-white hover:bg-blue-900"
          >
            {isGenerating ? "Generating…" : "Generate Rule 166 GFR Memo"}
          </Button>

          {isGenerating && <Skeleton className="h-48 w-full" />}

          {!isGenerating && memo && (
            <Button variant="outline" onClick={() => setMemoOpen(true)} className="border-slate-300">
              View Generated Memorandum
            </Button>
          )}

          <Dialog open={memoOpen} onOpenChange={setMemoOpen}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-white">
              <DialogHeader className="no-print">
                <DialogTitle>Office Memorandum — GFR 2017 Rule 166</DialogTitle>
                <DialogDescription>Draft for competent-authority approval.</DialogDescription>
              </DialogHeader>

              <div
                id="gfr-memo"
                className="relative border-2 border-black bg-white p-8 font-serif text-slate-900"
              >
                {memoFallbackUsed && (
                  <WifiOff
                    aria-hidden="true"
                    className="pointer-events-none absolute top-2 right-2 h-3.5 w-3.5 text-slate-500 opacity-40"
                  />
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{memo?.memo_text}</p>
              </div>


              <div className="no-print flex justify-end">
                <Button onClick={handlePrint} className="bg-blue-800 text-white hover:bg-blue-900">
                  <Printer className="mr-2 h-4 w-4" /> Print / Export PDF
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

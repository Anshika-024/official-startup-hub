import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, IndianRupee, Printer, ScrollText, ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { MatchmakingCard } from "@/components/gov/matchmaking-card";
import { generateGfrMemo, type GfrMemo } from "@/lib/memo.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
}

export function OfficialView() {
  const runMemo = useServerFn(generateGfrMemo);
  const [isGenerating, setIsGenerating] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [memo, setMemo] = useState<GfrMemo | null>(null);
  const [needs, setNeeds] = useState<Array<{ id: string; department: string; need_description: string }>>([]);
  const [startups, setStartups] = useState<string[]>([]);
  const [needId, setNeedId] = useState("");
  const [startupName, setStartupName] = useState("");
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from("procurement_needs").select("id, department, need_description").order("created_at"),
      supabase.from("startup_pitches").select("startup_name").order("created_at"),
    ]).then(([needRes, startupRes]) => {
      if (cancelled) return;
      setNeeds(needRes.data ?? []);
      setStartups((startupRes.data ?? []).map((s) => s.startup_name));
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
        .select("id, ts, api_endpoint, action, status")
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
    try {
      const result = await runMemo({ data: { needId, startupName } });
      setMemo(result);
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
        <CardHeader>
          <CardTitle className="text-base">Telemetry Ledger</CardTitle>
          <CardDescription>Immutable append-only log of procurement API events.</CardDescription>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell colSpan={4} className="p-2">
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-slate-500">
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

              <div id="gfr-memo" className="border-2 border-black bg-white p-8 font-serif text-slate-900">
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

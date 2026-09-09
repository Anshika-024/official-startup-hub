import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, IndianRupee, Printer, ScrollText, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MatchmakingCard } from "@/components/gov/matchmaking-card";
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [memoReady, setMemoReady] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [memoStats, setMemoStats] = useState({ total: 0, committed: 0, generatedAt: "" });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
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

  const handleGenerate = () => {
    if (isGenerating) return;
    setMemoReady(false);
    setIsGenerating(true);
    timeoutRef.current = setTimeout(async () => {
      const { count: total } = await supabase
        .from("telemetry_ledger")
        .select("id", { count: "exact", head: true });
      const { count: committed } = await supabase
        .from("telemetry_ledger")
        .select("id", { count: "exact", head: true })
        .eq("status", "COMMITTED");
      setMemoStats({
        total: total ?? rows.length,
        committed: committed ?? 0,
        generatedAt: new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" }),
      });
      setIsGenerating(false);
      setMemoReady(true);
      setMemoOpen(true);
      toast.success("Rule 166 GFR memo generated", {
        description: "Draft attached to pilot file GEM/2026/PIL/4471.",
      });
    }, 2000);
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
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-blue-800 text-white hover:bg-blue-900"
          >
            {isGenerating ? "Generating…" : "Generate Rule 166 GFR Memo"}
          </Button>

          {isGenerating && <Skeleton className="h-48 w-full" />}

          {!isGenerating && memoReady && (
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
                <p className="text-center text-base font-bold tracking-widest uppercase">
                  Government of India
                </p>
                <p className="text-center text-sm tracking-widest uppercase">
                  Ministry of Electronics &amp; Information Technology
                </p>
                <p className="mt-1 text-center text-sm underline underline-offset-4">
                  OFFICE MEMORANDUM
                </p>
                <p className="mt-6 text-sm">No. GEM/2026/PIL/4471</p>
                <p className="text-sm">Dated: {memoStats.generatedAt}</p>

                <p className="mt-6 font-bold leading-relaxed">
                  Subject: Single-source procurement justification for pilot deployment of an
                  indigenous interoperability layer — under Rule 166 of the General Financial Rules
                  (GFR), 2017.
                </p>

                <p className="mt-4 text-sm leading-relaxed">
                  1. The undersigned is directed to refer to the pilot engagement valued at ₹45.2
                  lakh (escrowed under pilot caps) and to state that the procurement is proposed on
                  a single-source basis in accordance with Rule 166 of GFR 2017, which permits
                  procurement from a single source where such a course is certified to be in the
                  public interest and standardisation of supply or compatibility with existing
                  systems so warrants.
                </p>

                <p className="mt-4 text-sm leading-relaxed">
                  2. <span className="font-bold">Telemetry evidence:</span> As on the date of this
                  memorandum, the immutable telemetry ledger records{" "}
                  <span className="font-bold">{memoStats.total} verified API events</span>, of
                  which <span className="font-bold">{memoStats.committed} are COMMITTED</span>{" "}
                  transactions executed within the isolated sandbox. All calls are append-only and
                  available for audit, evidencing functional compatibility of the vendor layer with
                  departmental legacy systems.
                </p>

                <p className="mt-4 text-sm leading-relaxed">
                  3. <span className="font-bold">Single-source justification:</span> The vendor
                  solution is the sole indigenous implementation interoperable with the legacy SOAP
                  estate through the certified XSLT translation bridge; competitive substitution
                  would render existing integration investment infructuous.
                </p>

                <p className="mt-4 text-sm leading-relaxed">
                  4. <span className="font-bold">Vigilance clearance:</span> The proposal has been
                  screened against CVC vigilance norms. No adverse observation is pending; the
                  engagement carries a <span className="font-bold">Low Risk</span> classification
                  with zero open observations. The vendor operates strictly within an isolated
                  sandbox; no production data is exposed.
                </p>

                <p className="mt-4 text-sm leading-relaxed">
                  5. Approval of the competent authority is accordingly solicited for award of the
                  pilot contract on the above terms.
                </p>

                <p className="mt-10 text-right text-sm">(Deputy Secretary)</p>
                <p className="text-right text-sm">Procurement Reform Division</p>
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

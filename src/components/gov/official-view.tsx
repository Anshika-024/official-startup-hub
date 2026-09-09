import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, IndianRupee, ScrollText, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    timeoutRef.current = setTimeout(() => {
      setIsGenerating(false);
      setMemoReady(true);
      toast.success("Rule 166 GFR memo generated", {
        description: "Draft attached to pilot file GEM/2026/PIL/4471.",
      });
    }, 2000);
  };

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
            <div className="border-2 border-black bg-white p-6 font-serif text-slate-900">
              <p className="text-center text-sm tracking-widest uppercase">
                Government of India — Ministry of Electronics &amp; IT
              </p>
              <p className="mt-1 text-center text-sm">Office Memorandum</p>
              <p className="mt-4 text-sm">No. GEM/2026/PIL/4471 — Dated 09 September 2026</p>
              <p className="mt-4 leading-relaxed">
                Subject: Justification for limited-tender pilot procurement of an indigenous
                interoperability layer under Rule 166 of the General Financial Rules, 2017.
              </p>
              <p className="mt-4 leading-relaxed">
                The undersigned is directed to state that the proposed pilot engagement, valued at
                ₹45.2 lakh (escrowed), satisfies the innovation-procurement exemption. The vendor
                operates strictly within an isolated sandbox; no production data is exposed, and all
                calls are recorded in the immutable telemetry ledger for CVC review.
              </p>
              <p className="mt-4 leading-relaxed">
                Approval of the competent authority is accordingly solicited.
              </p>
              <p className="mt-8 text-right">(Deputy Secretary, Procurement Reform)</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { ArrowRight, Copy, KeyRound, Radio, Server } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EligibilityCard } from "@/components/gov/eligibility-card";

const API_KEY = "gem_sk_live_7f3c9a21b8e4d05fa6c1e29b4d77a310";

const sandboxItems = [
  { label: "Database Isolation", detail: "Schema-scoped, read replica only" },
  { label: "Network Tunnels", detail: "2 active mTLS tunnels" },
  { label: "Container Uptime", detail: "17d 04h 22m" },
];

export function StartupView() {
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    const { error } = await supabase.from("telemetry_ledger").insert({
      api_endpoint: "/v1/pilot/telemetry/event",
      action: "AUTONOMOUS_SORT_VERIFIED",
      status: "COMMITTED",
      ts: new Date().toISOString(),
    });
    setIsSimulating(false);
    if (error) {
      toast.error("Telemetry event rejected", { description: error.message });
    } else {
      toast.success("Live telemetry event committed", {
        description: "The event now appears at the top of the official telemetry ledger.",
      });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(API_KEY);
      toast.success("API key copied to clipboard");
    } catch {
      toast.error("Copy failed", {
        description: "Clipboard access is blocked on unsecure contexts. Select and copy manually.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <EligibilityCard />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-slate-200 md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="h-4 w-4" /> Sandbox Status
            </CardTitle>
            <CardDescription>Live isolation guarantees for your pilot workload.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sandboxItems.map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <span className="mt-1.5 h-3 w-3 animate-pulse rounded-full bg-green-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="font-mono text-sm text-slate-500">{item.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Legacy API Gateway</CardTitle>
            <CardDescription>
              Requests are translated before they reach departmental systems.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
              <div className="flex-1 border border-slate-300 bg-white p-4 text-center">
                <p className="text-sm font-semibold text-slate-900">Modern REST API</p>
                <p className="font-mono text-sm text-slate-500">JSON / HTTPS</p>
              </div>
              <ArrowRight className="mx-auto h-5 w-5 rotate-90 text-slate-400 md:rotate-0" />
              <div className="flex-1 border border-blue-800 bg-blue-800 p-4 text-center text-white">
                <p className="text-sm font-semibold">Translation Layer</p>
                <p className="font-mono text-sm text-blue-100">XSLT bridge v2</p>
              </div>
              <ArrowRight className="mx-auto h-5 w-5 rotate-90 text-slate-400 md:rotate-0" />
              <div className="flex-1 border border-slate-300 bg-slate-100 p-4 text-center">
                <p className="text-sm font-semibold text-slate-900">Legacy SOAP</p>
                <p className="font-mono text-sm text-slate-500">WSDL 1.1 / XML</p>
              </div>
            </div>
            <Button
              onClick={handleSimulate}
              disabled={isSimulating}
              variant="outline"
              className="mt-4 w-full border-blue-800 text-blue-800 hover:bg-blue-50 hover:text-blue-900"
            >
              <Radio className="mr-2 h-4 w-4" />
              {isSimulating ? "Transmitting…" : "Simulate Live Pilot Telemetry"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" /> Sandbox API Key
          </CardTitle>
          <CardDescription>Rotates every 30 days. Never commit this to source control.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="block overflow-x-auto bg-slate-900 p-4 font-mono text-sm break-all text-green-400">
            {API_KEY}
          </div>
          <Button onClick={handleCopy} className="bg-blue-800 text-white hover:bg-blue-900">
            <Copy className="mr-2 h-4 w-4" /> Copy API Key
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { BadgeCheck, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type StartupRow = {
  startup_name: string;
  dpiit_number: string | null;
  incorporation_date: string | null;
  verification_status: string;
};

const CRITERIA_LABELS = [
  "Prior Turnover Required",
  "Prior Experience Required",
  "EMD Required",
] as const;

const AGE_LIMIT_STATUS = "Ineligible: Exceeded 10-year limit (DPIIT G.S.R. 127(E))";

/** True when incorporation is more than 10 years before today. */
function exceedsAgeLimit(incorporationDate: string | null | undefined): boolean {
  if (!incorporationDate) return false;
  const inc = new Date(incorporationDate);
  if (Number.isNaN(inc.getTime())) return false;
  const limit = new Date();
  limit.setFullYear(limit.getFullYear() - 10);
  return inc.getTime() < limit.getTime();
}

function statusBadge(status: string) {
  if (status === AGE_LIMIT_STATUS) {
    return <Badge className="bg-red-600 text-white hover:bg-red-600">{AGE_LIMIT_STATUS}</Badge>;
  }
  if (status === "verified") {
    return <Badge className="bg-green-600 text-white hover:bg-green-600">DPIIT Verified</Badge>;
  }
  if (status === "pending") {
    return <Badge className="bg-yellow-500 text-white hover:bg-yellow-500">Pending Verification</Badge>;
  }
  return <Badge className="bg-red-600 text-white hover:bg-red-600">Not Eligible</Badge>;
}

function Mark({ required }: { required: boolean }) {
  return required ? (
    <span className="inline-flex items-center gap-1 text-slate-700">
      <Check className="h-4 w-4" aria-hidden />
      <span className="sr-only">Required</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-green-700">
      <X className="h-4 w-4" aria-hidden />
      <span className="sr-only">Waived</span>
    </span>
  );
}

export function EligibilityCard() {
  const [startup, setStartup] = useState<StartupRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from("startups")
      .select("startup_name, dpiit_number, incorporation_date, verification_status")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setStartup(data as StartupRow | null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const incorporation = startup?.incorporation_date
    ? new Date(startup.incorporation_date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BadgeCheck className="h-4 w-4" /> Eligibility &amp; Recognition
        </CardTitle>
        <CardDescription>
          Startup recognition status and the procurement conditions relaxed for recognised startups.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-6 w-36" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500">DPIIT Registration Number</p>
              <p className="font-mono text-sm text-slate-900">{startup?.dpiit_number ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Incorporation Date</p>
              <p className="text-sm font-medium text-slate-900">{incorporation}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Status</p>
              <div className="mt-1">{statusBadge(startup?.verification_status ?? "not_eligible")}</div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-2 font-semibold">Criteria</th>
                <th className="px-4 py-2 font-semibold">Standard GFR Criteria</th>
                <th className="px-4 py-2 font-semibold">
                  Startup-Relaxed Criteria (Rule 144 / MSE Order)
                </th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((row) => (
                <tr key={row.label} className="border-t border-slate-200">
                  <td className="px-4 py-2 text-slate-900">{row.label}</td>
                  <td className="px-4 py-2">
                    <Mark required={row.standard} />
                  </td>
                  <td className="px-4 py-2">
                    <Mark required={row.relaxed} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

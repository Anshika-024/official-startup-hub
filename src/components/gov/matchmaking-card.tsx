import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { matchStartups, type StartupMatch } from "@/lib/matchmaking.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NeedRow {
  id: string;
  department: string;
  need_description: string;
  budget_range: string;
}

export function MatchmakingCard() {
  const runMatch = useServerFn(matchStartups);
  const [needs, setNeeds] = useState<NeedRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<StartupMatch[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("procurement_needs")
      .select("id, department, need_description, budget_range")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error("Failed to load procurement needs", { description: error.message });
          return;
        }
        setNeeds(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = needs.find((n) => n.id === selectedId);

  const handleMatch = async () => {
    if (!selectedId || loading) return;
    setLoading(true);
    setMatches(null);
    try {
      const result = await runMatch({ data: { needId: selectedId } });
      setMatches(result);
      toast.success("Matching complete", {
        description: `${result.length} startups ranked against the selected need.`,
      });
    } catch (error) {
      toast.error("Matchmaking failed", {
        description: error instanceof Error ? error.message : "Unexpected error.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" /> AI Startup Matchmaking
        </CardTitle>
        <CardDescription>
          Rank registered startup pitches against a departmental procurement need.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="border-slate-300 md:max-w-xl">
              <SelectValue placeholder="Select a procurement need" />
            </SelectTrigger>
            <SelectContent>
              {needs.map((need) => (
                <SelectItem key={need.id} value={need.id}>
                  {need.need_description.slice(0, 80)}
                  {need.need_description.length > 80 ? "…" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleMatch}
            disabled={!selectedId || loading}
            className="bg-blue-800 text-white hover:bg-blue-900"
          >
            {loading ? "Matching…" : "Find Matching Startups"}
          </Button>
        </div>

        {selected && (
          <div className="border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <span className="font-medium text-slate-900">{selected.department}</span> ·{" "}
            <span className="font-mono text-xs">{selected.budget_range}</span>
            <p className="mt-1">{selected.need_description}</p>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={`match-skeleton-${i}`} className="h-16 w-full" />
            ))}
          </div>
        )}

        {!loading && matches && matches.length === 0 && (
          <p className="text-sm text-slate-500">No startup pitches available to match.</p>
        )}

        {!loading && matches && matches.length > 0 && (
          <ol className="space-y-3">
            {matches.map((match, index) => (
              <li key={`${match.startup_name}-${index}`} className="border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs text-slate-500">
                    #{String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-medium text-slate-900">{match.startup_name}</span>
                  <Badge className="ml-auto border-slate-200 bg-slate-900 text-white hover:bg-slate-900">
                    {match.match_score}% match
                  </Badge>
                </div>
                <Progress value={match.match_score} className="mt-3 h-2" />
                <p className="mt-2 text-sm text-slate-600">{match.reasoning}</p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

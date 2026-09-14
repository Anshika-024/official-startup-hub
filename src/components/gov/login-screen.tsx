import { useState } from "react";
import { Landmark, LogIn, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActiveRole } from "@/hooks/use-active-role";

const DEMO_ACCOUNTS = [
  { label: "Department Official", email: "official@gempilot.gov.in" },
  { label: "Startup Vendor", email: "vendor@greensort.in" },
];
const DEMO_PASSWORD = "DemoPass123!";

export function LoginScreen({
  requestedRole,
  onSignIn,
  onViewPublic,
}: {
  requestedRole: ActiveRole;
  onSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  onViewPublic: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const heading =
    requestedRole === "official" ? "Department Official sign-in" : "Startup Vendor sign-in";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await onSignIn(email.trim(), password);
    setSubmitting(false);
    if (result.error) setError(result.error);
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-4 w-4" /> {heading}
          </CardTitle>
          <CardDescription>
            This workspace holds restricted procurement records. Sign in with your government or
            vendor credentials to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="official@gempilot.gov.in"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error ? (
              <p className="flex items-start gap-2 bg-red-50 p-3 text-sm text-red-700">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-800 text-white hover:bg-blue-900"
            >
              <LogIn className="mr-2 h-4 w-4" />
              {submitting ? "Verifying…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 space-y-2 border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
              Demo credentials
            </p>
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(DEMO_PASSWORD);
                  setError(null);
                }}
                className="block w-full border border-slate-200 p-2 text-left font-mono text-xs text-slate-600 hover:bg-slate-50"
              >
                {account.label}: {account.email} / {DEMO_PASSWORD}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onViewPublic}
            className="mt-4 w-full border-slate-300"
          >
            Continue as Public Viewer (no sign-in)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

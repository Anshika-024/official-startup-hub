import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/gov/sidebar-nav";
import { OfficialView } from "@/components/gov/official-view";
import { StartupView } from "@/components/gov/startup-view";
import { PublicView } from "@/components/gov/public-view";
import { RulesAssistant } from "@/components/gov/rules-assistant";
import { LoginScreen } from "@/components/gov/login-screen";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveRole, type ActiveRole } from "@/hooks/use-active-role";
import { useAuth } from "@/hooks/use-auth";

export default function App() {
  const { activeRole, setActiveRole } = useActiveRole();
  const auth = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // The signed-in account's role is authoritative: it decides which dashboard is
  // reachable. The toggle only lets you move between your own role and the
  // always-open Public Viewer.
  useEffect(() => {
    if (auth.loading) return;
    if (auth.role) {
      setActiveRole(auth.role);
    } else if (activeRole !== "public") {
      setActiveRole("public");
    }
    // Only react to identity changes, not to manual toggling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.loading, auth.role]);

  const handleRoleChange = (role: ActiveRole) => {
    setActiveRole(role);
    setMobileOpen(false);
  };

  const handleSignOut = async () => {
    await auth.signOut();
    setActiveRole("public");
    setMobileOpen(false);
  };

  const title =
    activeRole === "official"
      ? "Department Official"
      : activeRole === "startup"
        ? "Startup Vendor"
        : "Public Viewer";
  const subtitle =
    activeRole === "official"
      ? "Pilot oversight, budget guardrails and CVC-ready audit trails."
      : activeRole === "startup"
        ? "Sandbox health, gateway translation and integration credentials."
        : "Read-only transparency summary of pilot activity and outcomes.";

  const authorised = activeRole === "public" || auth.role === activeRole;

  const sidebar = (
    <SidebarNav
      activeRole={activeRole}
      onRoleChange={handleRoleChange}
      accountRole={auth.role}
      displayName={auth.displayName}
      signedIn={Boolean(auth.session)}
      onSignOut={handleSignOut}
    />
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 md:block">{sidebar}</aside>

      <div className="md:pl-72">
        <header className="flex items-center gap-3 bg-slate-900 px-4 py-4 text-white md:px-8">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open navigation"
                className="p-2 hover:bg-slate-800 md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-none bg-slate-900 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebar}
            </SheetContent>
          </Sheet>

          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-sm text-slate-400">{subtitle}</p>
          </div>
        </header>

        <main className="p-4 md:p-8">
          {auth.loading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : !authorised ? (
            <LoginScreen
              requestedRole={activeRole}
              onSignIn={auth.signIn}
              onViewPublic={() => handleRoleChange("public")}
            />
          ) : activeRole === "official" ? (
            <OfficialView />
          ) : activeRole === "startup" ? (
            <StartupView />
          ) : (
            <PublicView />
          )}
        </main>
      </div>

      {authorised && !auth.loading ? <RulesAssistant /> : null}
    </div>
  );
}

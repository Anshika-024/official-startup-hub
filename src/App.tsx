import { useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/gov/sidebar-nav";
import { OfficialView } from "@/components/gov/official-view";
import { StartupView } from "@/components/gov/startup-view";
import { PublicView } from "@/components/gov/public-view";
import { RulesAssistant } from "@/components/gov/rules-assistant";
import { useActiveRole, type ActiveRole } from "@/hooks/use-active-role";

export default function App() {
  const { activeRole, setActiveRole } = useActiveRole();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleRoleChange = (role: ActiveRole) => {
    setActiveRole(role);
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

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 md:block">
        <SidebarNav activeRole={activeRole} onRoleChange={handleRoleChange} />
      </aside>

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
              <SidebarNav activeRole={activeRole} onRoleChange={handleRoleChange} />
            </SheetContent>
          </Sheet>

          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-sm text-slate-400">{subtitle}</p>
          </div>
        </header>

        <main className="p-4 md:p-8">
          {activeRole === "official" ? (
            <OfficialView />
          ) : activeRole === "startup" ? (
            <StartupView />
          ) : (
            <PublicView />
          )}
        </main>
      </div>

      <RulesAssistant />
    </div>
  );
}

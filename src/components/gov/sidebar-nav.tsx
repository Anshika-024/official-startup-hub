import {
  Building2,
  Eye,
  LayoutDashboard,
  Lock,
  LogOut,
  Rocket,
  ShieldCheck,
  Settings,
  Landmark,
} from "lucide-react";
import type { ActiveRole } from "@/hooks/use-active-role";
import type { AccountRole } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const links = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Compliance", icon: ShieldCheck, active: false },
  { label: "Settings", icon: Settings, active: false },
];

export function SidebarNav({
  activeRole,
  onRoleChange,
  accountRole,
  displayName,
  signedIn,
  onSignOut,
}: {
  activeRole: ActiveRole;
  onRoleChange: (role: ActiveRole) => void;
  accountRole: AccountRole | null;
  displayName: string | null;
  signedIn: boolean;
  onSignOut: () => void;
}) {
  const roles: { id: ActiveRole; label: string; icon: typeof Building2 }[] = [
    { id: "official", label: "Department Official", icon: Building2 },
    { id: "startup", label: "Startup Vendor", icon: Rocket },
    { id: "public", label: "Public Viewer", icon: Eye },
  ];

  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
        <Landmark className="h-6 w-6 text-blue-400" />
        <div>
          <p className="text-sm font-semibold tracking-wide text-white">GeM PILOT PORTAL</p>
          <p className="text-xs text-slate-400">Procurement Sandbox v1.4</p>
        </div>
      </div>

      <div className="px-5 pt-5 pb-2 text-xs font-semibold tracking-widest text-slate-500 uppercase">
        Active Role
      </div>
      <nav className="flex flex-col">
        {roles.map((role) => {
          const isActive = activeRole === role.id;
          const locked = role.id !== "public" && accountRole !== role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onRoleChange(role.id)}
              className={cn(
                "flex items-center gap-3 border-l-4 border-transparent px-5 py-3 text-left text-sm transition-colors hover:bg-slate-800",
                isActive && "border-l-4 border-blue-500 bg-slate-800 font-semibold text-white",
                locked && !isActive && "text-slate-500",
              )}
            >
              <role.icon className="h-4 w-4" />
              <span className="flex-1">{role.label}</span>
              {locked ? <Lock className="h-3.5 w-3.5 text-slate-500" aria-label="Sign-in required" /> : null}
            </button>
          );
        })}
      </nav>

      <div className="px-5 pt-6 pb-2 text-xs font-semibold tracking-widest text-slate-500 uppercase">
        Navigation
      </div>
      <nav className="flex flex-col">
        {links.map((link) => (
          <a
            key={link.label}
            href="#"
            className={cn(
              "flex items-center gap-3 border-l-4 border-transparent px-5 py-3 text-sm hover:bg-slate-800",
              link.active && "bg-slate-800/60 text-white",
            )}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </a>
        ))}
      </nav>

      <div className="mt-auto border-t border-slate-800 px-5 py-4">
        {signedIn ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-white">{displayName ?? "Signed in"}</p>
              <p className="text-xs text-slate-500 capitalize">
                {accountRole ? `${accountRole} account` : "No role assigned"}
              </p>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="flex w-full items-center gap-2 border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Not signed in — public access only</p>
        )}
        <p className="mt-3 text-xs text-slate-500">Node: gov-cloud-ncr-01</p>
      </div>
    </div>
  );
}

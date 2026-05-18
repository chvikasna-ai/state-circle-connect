import { createFileRoute, Outlet, Link, Navigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { stateName } from "@/lib/states";
import { Home, MessageSquare, HelpCircle, Newspaper, CalendarDays, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app")({ component: AppLayout });

const nav = [
  { to: "/feed", label: "Feed", icon: Home },
  { to: "/rooms", label: "Rooms", icon: MessageSquare },
  { to: "/qa", label: "Q&A", icon: HelpCircle },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/events", label: "Events", icon: CalendarDays },
] as const;

function AppLayout() {
  const { user, profile, loading, roles, signOut } = useAuth();
  const loc = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;
  if (!profile) return <Navigate to="/onboarding" />;

  const isHelper = roles.includes("helper") || roles.includes("admin");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link to="/feed" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-display text-sm">SC</div>
            <span className="hidden font-display text-lg sm:inline">State Circle</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              {profile.state_code} · {stateName(profile.state_code)}
            </span>
            {isHelper && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>
                <ShieldCheck className="h-3 w-3" /> {roles.includes("admin") ? "Admin" : "Helper"}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2 md:px-6">
          {nav.map(n => {
            const active = loc.pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition " +
                (active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")
              }>
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}

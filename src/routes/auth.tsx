import { createFileRoute, useNavigate, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { findSavedLocalProfile, isLocalNicknameTaken, useAuth } from "@/lib/auth";
import { US_STATES } from "@/lib/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: s.mode === "signup" ? "signup" : "signin",
  }),
  component: AuthPage,
});

const profileSchema = z.object({
  display_name: z.string().trim().min(2).max(40),
  state_code: z.string().length(2),
});

function AuthPage() {
  const { user, profile, loading, createLocalProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  const savedProfile = name && state ? findSavedLocalProfile(name, state) : null;
  const nicknameTaken = name && state ? isLocalNicknameTaken(name, state) : false;

  if (loading) return null;
  if (user) return <Navigate to={profile ? "/feed" : "/onboarding"} />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const parsed = profileSchema.safeParse({ display_name: name, state_code: state });
      if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
      if (isLocalNicknameTaken(parsed.data.display_name, parsed.data.state_code)) {
        toast.error("That nickname is already used. Add something to your name, like your city or a number.");
        return;
      }

      createLocalProfile(parsed.data);
      toast.success(savedProfile ? "Welcome back!" : `Welcome to your ${parsed.data.state_code} circle!`);
      navigate({ to: "/feed" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-background">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center gap-2 justify-center">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-display text-sm">SC</div>
          <span className="font-display text-xl">State Circle</span>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="font-display text-2xl">Join your state</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            No email needed. Enter this once, and we will remember it.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div>
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="What should neighbors call you?" required />
              <p className={"mt-1 text-xs " + (nicknameTaken ? "text-destructive" : "text-muted-foreground")}>
                {savedProfile
                  ? "Welcome back. Use this same name and state to rejoin your saved profile."
                  : nicknameTaken
                    ? "That nickname is already used. Try adding your city, initials, or a number."
                    : "Pick a nickname only you will use. If it is taken, add something to your name."}
              </p>
            </div>
            <div>
              <Label htmlFor="state">Your state</Label>
              <select
                id="state"
                value={state}
                onChange={e => setState(e.target.value)}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring"
                required
              >
                <option value="">Pick your state</option>
                {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              Enter my circle
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

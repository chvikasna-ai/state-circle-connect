import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { US_STATES } from "@/lib/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

const schema = z.object({
  display_name: z.string().trim().min(2).max(40),
  state_code: z.string().length(2),
});

function Onboarding() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;
  if (profile) return <Navigate to="/feed" />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ display_name: name, state_code: state });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      display_name: parsed.data.display_name,
      state_code: parsed.data.state_code,
    });
    if (error) { toast.error(error.message); setBusy(false); return; }
    await refreshProfile();
    toast.success(`Welcome to your ${parsed.data.state_code} circle!`);
    navigate({ to: "/feed" });
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-background">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="font-display text-2xl">Set up your circle</h1>
        <p className="mt-1 text-sm text-muted-foreground">You'll only see and talk to people in your state.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="name">Display name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="What should neighbors call you?" required />
          </div>
          <div>
            <Label>Your state</Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger><SelectValue placeholder="Pick your state" /></SelectTrigger>
              <SelectContent>
                {US_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>Enter my circle</Button>
        </form>
      </div>
    </div>
  );
}

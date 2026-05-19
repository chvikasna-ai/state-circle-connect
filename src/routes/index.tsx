import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { US_STATES } from "@/lib/states";
import { HelpCircle, MapPin, MessageCircle, Newspaper, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading, profile, createLocalProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  if (loading) return null;
  if (user && profile) return <Navigate to="/feed" />;
  if (user && !profile) return <Navigate to="/auth" search={{ mode: "signup" }} />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const displayName = name.trim();
    if (displayName.length < 2) {
      toast.error("Name needs at least 2 characters");
      return;
    }
    if (!state) {
      toast.error("Pick your state");
      return;
    }

    setBusy(true);
    createLocalProfile({ display_name: displayName, state_code: state });
    toast.success("Welcome to your state circle!");
    navigate({ to: "/feed" });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6">
        <header className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-display text-primary-foreground">SC</div>
            <span className="font-display text-xl">State Circle</span>
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <MapPin className="h-3.5 w-3.5" /> Click here to sign up once
            </div>
            <h1 className="mt-6 font-display text-5xl leading-tight md:text-6xl">
              Welcome to State Circle.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
              A simple place to talk with people in your state, read local news, ask questions,
              and join safe topic-based chat rooms. No email is needed, and your name and state
              stay saved after you enter them once.
            </p>
          </div>

          <div className="space-y-4">
            <form onSubmit={submit} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-2xl">Sign up now</h2>
              <p className="mt-1 text-sm text-muted-foreground">No email needed. Enter this once and we will remember it.</p>
              <div className="mt-5 space-y-3">
                <div>
                  <Label htmlFor="welcome-name">What should neighbors call you?</Label>
                  <Input id="welcome-name" value={name} onChange={e => setName(e.target.value)} maxLength={40} required />
                </div>
                <div>
                  <Label htmlFor="welcome-state">Your state</Label>
                  <select
                    id="welcome-state"
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
              </div>
            </form>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-2xl">What it helps with</h2>
            <div className="mt-5 space-y-4">
              {[
                { icon: MessageCircle, title: "Talk locally", text: "Join public chat rooms for state conversations." },
                { icon: Newspaper, title: "Follow local news", text: "See fresh headlines and open articles or video news." },
                { icon: HelpCircle, title: "Ask questions", text: "Post questions and get helpful local answers." },
                { icon: ShieldCheck, title: "Stay safer", text: "Kindness filters help block hurtful messages." },
              ].map(item => (
                <div key={item.title} className="flex gap-3">
                  <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

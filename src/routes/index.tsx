import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { MapPin, MessageCircle, Newspaper, CalendarDays, ShieldCheck, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading, profile } = useAuth();
  if (loading) return null;
  if (user && profile) return <Navigate to="/feed" />;
  if (user && !profile) return <Navigate to="/onboarding" />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-display text-sm">SC</div>
            <span className="font-display text-xl">State Circle</span>
          </Link>
          <div className="flex gap-2">
            <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/auth" search={{ mode: "signup" }}><Button>Join your state</Button></Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-accent" /> Verified, state-only community
          </div>
          <h1 className="mt-6 font-display text-5xl leading-tight md:text-6xl">
            Your state. Your circle.<br/>
            <span className="italic text-accent">A safer place to talk locally.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            State Circle is a calm, organized community for people in your state. Ask questions,
            read verified local news, and find events — only inside approved conversation rooms.
            No DMs, no drama, no unsafe topics.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" search={{ mode: "signup" }}><Button size="lg">Join your state</Button></Link>
            <Link to="/auth"><Button size="lg" variant="outline">I already have an account</Button></Link>
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/50">
        <div className="mx-auto grid max-w-6xl gap-px bg-border md:grid-cols-3">
          {[
            { icon: MessageCircle, title: "Topic-locked rooms", text: "Six approved categories — that's it. No off-topic, no DMs." },
            { icon: Newspaper, title: "Verified local news", text: "Short updates from approved accounts. React, don't argue." },
            { icon: CalendarDays, title: "Events that matter", text: "School, sports, festivals — submitted by neighbors, approved by admins." },
            { icon: HelpCircle, title: "Local Q&A", text: "Real answers from people who actually live in your state." },
            { icon: ShieldCheck, title: "Safety filters", text: "No bullying, no personal info, no unsafe topics. Always." },
            { icon: MapPin, title: "Just your state", text: "You only see and talk with people from where you live." },
          ].map((f) => (
            <div key={f.title} className="bg-card p-8">
              <f.icon className="h-5 w-5 text-accent" />
              <h3 className="mt-4 font-display text-xl">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-foreground">
        © {new Date().getFullYear()} State Circle — built for local, not loud.
      </footer>
    </div>
  );
}

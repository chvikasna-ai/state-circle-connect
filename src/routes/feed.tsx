import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { stateName } from "@/lib/states";
import { formatDistanceToNow } from "date-fns";
import { HelpCircle, MessageSquare, Newspaper } from "lucide-react";

export const Route = createFileRoute("/feed")({ component: () => (<AppShell><Feed /></AppShell>) });

type FeedItem =
  | { kind: "news"; id: string; created_at: string; headline: string; summary: string }
  | { kind: "question"; id: string; created_at: string; title: string; body: string | null }
  | { kind: "message"; id: string; created_at: string; body: string; room_id: string };

const dailyGreeting = (date: Date) => {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

function Feed() {
  const { profile } = useAuth();
  const now = new Date();
  const today = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const time = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const { data, isLoading } = useQuery({
    queryKey: ["feed", profile?.state_code],
    queryFn: async (): Promise<FeedItem[]> => {
      const [news, qs, msgs] = await Promise.all([
        supabase.from("news_posts").select("id,created_at,headline,summary").order("created_at", { ascending: false }).limit(10),
        supabase.from("questions").select("id,created_at,title,body").order("created_at", { ascending: false }).limit(10),
        supabase.from("room_messages").select("id,created_at,body,room_id").order("created_at", { ascending: false }).limit(10),
      ]);
      const items: FeedItem[] = [
        ...(news.data ?? []).map(n => ({ kind: "news" as const, ...n })),
        ...(qs.data ?? []).map(q => ({ kind: "question" as const, ...q })),
        ...(msgs.data ?? []).map(m => ({ kind: "message" as const, ...m })),
      ];
      return items.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-6">
        <p className="text-xs uppercase tracking-wide text-accent">{today} - {time}</p>
        <h1 className="mt-2 font-display text-3xl">{dailyGreeting(now)}</h1>
        <p className="mt-1 text-muted-foreground">Here is what is happening today in {stateName(profile?.state_code)}.</p>
        {profile?.display_name && <p className="mt-5 text-sm font-medium text-foreground">{profile.display_name}</p>}
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { to: "/rooms", icon: MessageSquare, label: "Rooms" },
          { to: "/qa", icon: HelpCircle, label: "Ask a question" },
          { to: "/news", icon: Newspaper, label: "News" },
        ].map(q => (
          <Link key={q.to} to={q.to} className="group rounded-xl border border-border bg-card p-4 transition hover:border-accent hover:shadow-sm">
            <q.icon className="h-5 w-5 text-accent" />
            <div className="mt-2 font-display">{q.label}</div>
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-muted-foreground text-sm">Loading your circle...</p>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Your circle is quiet. Be the first to <Link to="/qa" className="text-accent underline">ask a question</Link>.
          </div>
        )}
        {data?.map(item => <FeedCard key={`${item.kind}-${item.id}`} item={item} />)}
      </div>
    </div>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  const time = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });
  if (item.kind === "news") return (
    <Link to="/news" className="block rounded-xl border border-border bg-card p-5 transition hover:border-accent">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: "var(--gold)" }}>
        <Newspaper className="h-3.5 w-3.5" /> News - {time}
      </div>
      <h3 className="mt-2 font-display text-xl">{item.headline}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.summary}</p>
    </Link>
  );
  if (item.kind === "question") return (
    <Link to="/qa/$id" params={{ id: item.id }} className="block rounded-xl border border-border bg-card p-5 transition hover:border-accent">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-accent">
        <HelpCircle className="h-3.5 w-3.5" /> Question - {time}
      </div>
      <h3 className="mt-2 font-display text-xl">{item.title}</h3>
      {item.body && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.body}</p>}
    </Link>
  );
  return (
    <Link to="/rooms" className="block rounded-xl border border-border bg-card p-5 transition hover:border-accent">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5" /> Room chat - {time}
      </div>
      <p className="mt-2 text-sm">{item.body}</p>
    </Link>
  );
}

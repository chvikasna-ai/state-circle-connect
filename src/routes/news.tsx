import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Newspaper, Heart, Star, Megaphone } from "lucide-react";

export const Route = createFileRoute("/news")({ component: News });

const REACTIONS = [
  { key: "like", label: "Helpful", icon: Heart },
  { key: "support", label: "Support", icon: Star },
  { key: "important", label: "Important", icon: Megaphone },
] as const;

function News() {
  const { user, profile, roles } = useAuth();
  const qc = useQueryClient();
  const canPost = roles.includes("helper") || roles.includes("admin");
  const [showForm, setShowForm] = useState(false);
  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const newsQ = useQuery({
    queryKey: ["news"],
    queryFn: async () => {
      const { data, error } = await supabase.from("news_posts").select("*").order("created_at", { ascending: false }).limit(30);
      if (error) throw error; return data;
    },
  });

  const reactionsQ = useQuery({
    queryKey: ["news-reactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("news_reactions").select("news_id,user_id,reaction");
      if (error) throw error; return data;
    },
  });

  const counts = (id: string, key: string) =>
    reactionsQ.data?.filter(r => r.news_id === id && r.reaction === key).length ?? 0;
  const mine = (id: string, key: string) =>
    !!reactionsQ.data?.find(r => r.news_id === id && r.reaction === key && r.user_id === user?.id);

  const toggle = async (newsId: string, key: string) => {
    if (!user) return;
    if (mine(newsId, key)) {
      await supabase.from("news_reactions").delete().eq("news_id", newsId).eq("user_id", user.id).eq("reaction", key);
    } else {
      await supabase.from("news_reactions").insert({ news_id: newsId, user_id: user.id, reaction: key });
    }
    qc.invalidateQueries({ queryKey: ["news-reactions"] });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    const { error } = await supabase.from("news_posts").insert({
      author_id: user.id, state_code: profile.state_code,
      headline: headline.trim(), summary: summary.trim(),
      source_url: sourceUrl.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    setHeadline(""); setSummary(""); setSourceUrl(""); setShowForm(false);
    qc.invalidateQueries({ queryKey: ["news"] });
    toast.success("News posted");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Local news</h1>
          <p className="mt-1 text-muted-foreground">Short, verified updates from your state. React — don't argue.</p>
        </div>
        {canPost && <Button onClick={() => setShowForm(v => !v)}>Post update</Button>}
      </div>
      {!canPost && (
        <p className="text-xs text-muted-foreground">Only Community Helpers and Admins can post news. Reactions are open to everyone.</p>
      )}
      {showForm && canPost && (
        <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 space-y-3">
          <Input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Headline" maxLength={160} required />
          <Textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Short summary (max 600 chars)" maxLength={600} required />
          <Input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="Source URL (optional)" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Publish</Button>
          </div>
        </form>
      )}
      {newsQ.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {newsQ.data?.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">No news yet.</div>
      )}
      <div className="space-y-4">
        {newsQ.data?.map(n => (
          <article key={n.id} className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: "var(--gold)" }}>
              <Newspaper className="h-3.5 w-3.5" /> News · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
            </div>
            <h2 className="mt-2 font-display text-2xl">{n.headline}</h2>
            <p className="mt-2 text-muted-foreground">{n.summary}</p>
            {n.source_url && <a href={n.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-accent underline">Source</a>}
            <div className="mt-4 flex gap-2">
              {REACTIONS.map(r => (
                <button key={r.key} onClick={() => toggle(n.id, r.key)}
                  className={"inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition " +
                    (mine(n.id, r.key) ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent")}>
                  <r.icon className="h-3.5 w-3.5" /> {r.label} · {counts(n.id, r.key)}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

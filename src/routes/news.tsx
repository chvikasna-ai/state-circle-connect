import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { stateName } from "@/lib/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Heart, Megaphone, Newspaper, PlayCircle, RefreshCw, Star, X } from "lucide-react";

export const Route = createFileRoute("/news")({ component: () => (<AppShell><News /></AppShell>) });

const FIVE_HOURS = 1000 * 60 * 60 * 5;

const REACTIONS = [
  { key: "like", label: "Helpful", icon: Heart },
  { key: "support", label: "Support", icon: Star },
  { key: "important", label: "Important", icon: Megaphone },
] as const;

type LocalHeadline = {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
};

const newsCacheKey = (stateCode?: string | null) => `state-circle-live-news-${stateCode ?? "US"}`;

const cleanText = (value: string) => {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value.replace(/<[^>]*>/g, "");
  return textarea.value.trim();
};

const cachedHeadlines = (stateCode?: string | null) => {
  const saved = window.localStorage.getItem(newsCacheKey(stateCode));
  if (!saved) return [];
  try {
    return JSON.parse(saved) as LocalHeadline[];
  } catch {
    window.localStorage.removeItem(newsCacheKey(stateCode));
    return [];
  }
};

const saveCachedHeadlines = (stateCode: string | null | undefined, headlines: LocalHeadline[]) => {
  window.localStorage.setItem(newsCacheKey(stateCode), JSON.stringify(headlines));
};

async function fetchStateHeadlines(stateCode?: string | null): Promise<LocalHeadline[]> {
  const state = stateName(stateCode) || "United States";
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(`${state} local news`)}&hl=en-US&gl=US&ceid=US:en`;
  const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
  if (!response.ok) return cachedHeadlines(stateCode);

  const json = await response.json();
  if (json.status !== "ok" || !Array.isArray(json.items)) return cachedHeadlines(stateCode);

  const headlines = json.items.slice(0, 12).map((item: {
    guid?: string;
    title?: string;
    link?: string;
    pubDate?: string;
    author?: string;
  }, index: number) => ({
    id: item.guid || item.link || `headline-${index}`,
    title: cleanText(item.title ?? "Local update"),
    source: cleanText(item.author || "Google News"),
    url: item.link ?? "#",
    publishedAt: item.pubDate ?? new Date().toISOString(),
  }));

  if (headlines.length > 0) saveCachedHeadlines(stateCode, headlines);
  return headlines.length > 0 ? headlines : cachedHeadlines(stateCode);
}

function News() {
  const { user, profile, roles } = useAuth();
  const qc = useQueryClient();
  const canPost = roles.includes("helper") || roles.includes("admin");
  const [selectedArticle, setSelectedArticle] = useState<LocalHeadline | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const state = stateName(profile?.state_code) || "local";
  const videoNewsUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${state} news today`)}`;
  const openInThisTab = (url: string) => {
    window.location.href = url;
  };

  const liveNewsQ = useQuery({
    queryKey: ["live-local-news", profile?.state_code],
    queryFn: () => fetchStateHeadlines(profile?.state_code),
    refetchInterval: FIVE_HOURS,
    staleTime: FIVE_HOURS,
    initialData: () => cachedHeadlines(profile?.state_code),
    retry: 1,
  });

  const newsQ = useQuery({
    queryKey: ["news"],
    queryFn: async () => {
      const { data, error } = await supabase.from("news_posts").select("*").order("created_at", { ascending: false }).limit(30);
      if (error) return [];
      return data;
    },
  });

  const reactionsQ = useQuery({
    queryKey: ["news-reactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("news_reactions").select("news_id,user_id,reaction");
      if (error) return [];
      return data;
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
          <p className="mt-1 text-muted-foreground">Fresh headlines from {state}, refreshed every 5 hours.</p>
        </div>
        {canPost && <Button onClick={() => setShowForm(v => !v)}>Post update</Button>}
      </div>
      {!canPost && (
        <p className="text-xs text-muted-foreground">Only Community Helpers and Admins can post updates. Everyone can read the live local feed.</p>
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

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl">Live local headlines</h2>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => openInThisTab(videoNewsUrl)}>
              <PlayCircle className="h-4 w-4" /> Watch today
            </Button>
            <Button variant="ghost" size="sm" onClick={() => liveNewsQ.refetch()} disabled={liveNewsQ.isFetching}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>
        {liveNewsQ.isFetching && (liveNewsQ.data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Loading local headlines...</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {liveNewsQ.data?.map(item => (
            <article key={item.id} className="rounded-xl border border-border bg-card p-5 transition hover:border-accent hover:shadow-sm">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-accent">
                <Newspaper className="h-3.5 w-3.5" /> {item.source}
              </div>
              <button type="button" onClick={() => setSelectedArticle(item)} className="mt-2 block text-left font-display text-xl hover:text-accent">
                {item.title}
              </button>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })}
              </p>
              <div className="mt-3 flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setSelectedArticle(item)}>Preview</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => openInThisTab(item.url)}>
                  <ExternalLink className="h-4 w-4" /> Read
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedArticle && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4">
          <article className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-accent">{selectedArticle.source}</p>
                <h2 className="mt-2 font-display text-2xl">{selectedArticle.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Published {formatDistanceToNow(new Date(selectedArticle.publishedAt), { addSuffix: true })}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedArticle(null)} aria-label="Close article">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-5 text-muted-foreground">
              This headline comes from a live local news source. Open the source to read the full article from the publisher.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button type="button" onClick={() => openInThisTab(selectedArticle.url)}>
                <ExternalLink className="h-4 w-4" /> Read full article
              </Button>
              <Button type="button" variant="outline" onClick={() => openInThisTab(videoNewsUrl)}>
                <PlayCircle className="h-4 w-4" /> Watch today's video news
              </Button>
            </div>
          </article>
        </div>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-xl">Community updates</h2>
        {newsQ.isLoading && <p className="text-sm text-muted-foreground">Loading updates...</p>}
        {newsQ.data?.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">No community updates yet.</div>
        )}
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
      </section>
    </div>
  );
}

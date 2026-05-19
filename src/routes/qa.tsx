import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getLocalQuestions, saveLocalQuestion } from "@/lib/local-qa";
import { isMessageAllowed } from "@/lib/moderation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { HelpCircle, Plus, Search } from "lucide-react";

export const Route = createFileRoute("/qa")({ component: () => (<AppShell><QAList /></AppShell>) });

function QAList() {
  const loc = useLocation();
  const { user, profile, session } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["questions"],
    queryFn: async () => {
      const localQuestions = getLocalQuestions();
      const { data, error } = await supabase.from("questions").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) return localQuestions;
      return [...localQuestions, ...(data ?? [])].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    },
  });

  if (loc.pathname !== "/qa") return <Outlet />;

  const searchTerm = search.trim().toLowerCase();
  const filteredQuestions = (data ?? []).filter(question => {
    if (!searchTerm) return true;
    return [question.title, question.body ?? ""].some(value =>
      value.toLowerCase().includes(searchTerm),
    );
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (trimmedTitle.length < 3) { toast.error("Title needs at least 3 characters"); return; }
    if (!isMessageAllowed(`${trimmedTitle} ${trimmedBody}`)) {
      toast.error("That question may be hurtful or inappropriate. Please rewrite it kindly.");
      return;
    }

    if (!session) {
      saveLocalQuestion({
        user_id: user.id,
        state_code: profile.state_code,
        title: trimmedTitle,
        body: trimmedBody || null,
      });
    } else {
      const { error } = await supabase.from("questions").insert({
        user_id: user.id, state_code: profile.state_code, title: trimmedTitle, body: trimmedBody || null,
      });
      if (error) { toast.error(error.message); return; }
    }

    setTitle(""); setBody(""); setShowForm(false);
    qc.invalidateQueries({ queryKey: ["questions"] });
    toast.success("Question posted");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Local Q&A</h1>
          <p className="mt-1 text-muted-foreground">Real questions, real answers from your state.</p>
        </div>
        <Button onClick={() => setShowForm(v => !v)}><Plus className="h-4 w-4 mr-1" />Ask</Button>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
          placeholder="Search questions by topic, like school, jobs, or safety"
        />
      </div>
      {showForm && (
        <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 space-y-3">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What do you want to ask your state?" maxLength={200} required />
          <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Optional context (max 2000 characters)" maxLength={2000} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Post question</Button>
          </div>
        </form>
      )}
      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {!isLoading && (data?.length ?? 0) > 0 && filteredQuestions.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No questions found for "{search.trim()}". Try another topic.
        </div>
      )}
      {data?.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No questions yet — be the first to ask.
        </div>
      )}
      <ul className="space-y-3">
        {filteredQuestions.map(q => (
          <li key={q.id}>
            <Link to="/qa/$id" params={{ id: q.id }} className="block rounded-xl border border-border bg-card p-5 hover:border-accent">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-accent">
                <HelpCircle className="h-3.5 w-3.5" /> {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
              </div>
              <h3 className="mt-2 font-display text-xl">{q.title}</h3>
              {q.body && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{q.body}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

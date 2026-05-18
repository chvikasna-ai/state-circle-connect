import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { HelpCircle, Plus } from "lucide-react";

export const Route = createFileRoute("/(app)/qa")({ component: QAList });

function QAList() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["questions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error; return data;
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    if (title.trim().length < 3) { toast.error("Title needs at least 3 characters"); return; }
    const { error } = await supabase.from("questions").insert({
      user_id: user.id, state_code: profile.state_code, title: title.trim(), body: body.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
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
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {data?.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No questions yet — be the first to ask.
        </div>
      )}
      <ul className="space-y-3">
        {data?.map(q => (
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

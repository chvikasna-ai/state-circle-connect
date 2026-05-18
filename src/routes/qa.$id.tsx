import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/qa/$id")({ component: QuestionPage });

function QuestionPage() {
  const { id } = useParams({ from: "/_app/qa/$id" });
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const qQ = useQuery({
    queryKey: ["q", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select("*").eq("id", id).single();
      if (error) throw error; return data;
    },
  });

  const aQ = useQuery({
    queryKey: ["answers", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("answers").select("*").eq("question_id", id).order("created_at");
      if (error) throw error;
      const ids = Array.from(new Set(data.map(a => a.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,display_name").in("id", ids)
        : { data: [] };
      const map = new Map((profs ?? []).map(p => [p.id, p.display_name]));
      return data.map(a => ({ ...a, display_name: map.get(a.user_id) ?? "Member" }));
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !body.trim()) return;
    const { error } = await supabase.from("answers").insert({
      question_id: id, user_id: user.id, state_code: profile.state_code, body: body.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setBody(""); qc.invalidateQueries({ queryKey: ["answers", id] });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Link to="/qa" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All questions
      </Link>
      {qQ.data && (
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-wide text-accent">Question · {formatDistanceToNow(new Date(qQ.data.created_at), { addSuffix: true })}</p>
          <h1 className="mt-2 font-display text-2xl">{qQ.data.title}</h1>
          {qQ.data.body && <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{qQ.data.body}</p>}
        </div>
      )}
      <div>
        <h2 className="font-display text-xl mb-3">{aQ.data?.length ?? 0} answers</h2>
        <div className="space-y-3">
          {aQ.data?.map(a => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{a.display_name} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
              <p className="mt-1 whitespace-pre-wrap">{a.body}</p>
            </div>
          ))}
        </div>
      </div>
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-4 space-y-3">
        <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Share an answer — be helpful and kind." maxLength={2000} required />
        <div className="flex justify-end"><Button type="submit">Post answer</Button></div>
      </form>
    </div>
  );
}

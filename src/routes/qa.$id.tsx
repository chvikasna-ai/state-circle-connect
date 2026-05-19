import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { findLocalQuestion, getLocalAnswers, saveLocalAnswer } from "@/lib/local-qa";
import { isMessageAllowed } from "@/lib/moderation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/qa/$id")({ component: QuestionPage });

function QuestionPage() {
  const { id } = useParams({ from: "/qa/$id" });
  const { user, profile, session } = useAuth();
  const qc = useQueryClient();
  const localQuestion = findLocalQuestion(id);
  const [body, setBody] = useState("");
  const [localAnswers, setLocalAnswers] = useState(() => localQuestion ? getLocalAnswers(id) : []);

  const qQ = useQuery({
    queryKey: ["q", id],
    enabled: !localQuestion,
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const aQ = useQuery({
    queryKey: ["answers", id],
    enabled: !localQuestion,
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
    const trimmedBody = body.trim();
    if (!user || !profile || !trimmedBody) return;
    if (!isMessageAllowed(trimmedBody)) {
      toast.error("That answer may be hurtful or inappropriate. Please rewrite it kindly.");
      return;
    }

    if (!session || localQuestion) {
      const nextAnswer = saveLocalAnswer({
        question_id: id,
        user_id: user.id,
        state_code: profile.state_code,
        body: trimmedBody,
        display_name: profile.display_name,
      });
      setLocalAnswers(answers => [...answers, nextAnswer]);
      setBody("");
      return;
    }

    const { error } = await supabase.from("answers").insert({
      question_id: id, user_id: user.id, state_code: profile.state_code, body: trimmedBody,
    });
    if (error) { toast.error(error.message); return; }
    setBody(""); qc.invalidateQueries({ queryKey: ["answers", id] });
  };

  const question = localQuestion ?? qQ.data;
  const answers = localQuestion ? localAnswers : aQ.data ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <Link to="/qa" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All questions
      </Link>
      {question && (
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-wide text-accent">
            Question - {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
          </p>
          <h1 className="mt-2 font-display text-2xl">{question.title}</h1>
          {question.body && <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{question.body}</p>}
        </div>
      )}
      <div>
        <h2 className="font-display text-xl mb-3">{answers.length} answers</h2>
        <div className="space-y-3">
          {answers.map(a => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">
                {a.display_name} - {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{a.body}</p>
            </div>
          ))}
        </div>
      </div>
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-4 space-y-3">
        <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Share an answer - be helpful and kind." maxLength={2000} required />
        <div className="flex justify-end"><Button type="submit">Post answer</Button></div>
      </form>
    </div>
  );
}

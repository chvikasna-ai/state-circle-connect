import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/rooms")({ component: () => (<AppShell><Rooms /></AppShell>) });

function Rooms() {
  const { data, isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Conversation rooms</h1>
        <p className="mt-1 text-muted-foreground">Talk only inside approved topics. No DMs, no off-topic — that's how we stay safe.</p>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading rooms…</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {data?.map(r => (
          <Link key={r.id} to="/rooms/$slug" params={{ slug: r.slug }}
            className="group rounded-xl border border-border bg-card p-5 transition hover:border-accent hover:shadow-sm">
            <div className="flex items-center gap-2 text-accent">
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wide">#{r.slug}</span>
            </div>
            <h3 className="mt-2 font-display text-xl">{r.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

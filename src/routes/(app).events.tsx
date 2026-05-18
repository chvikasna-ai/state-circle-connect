import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CalendarDays, MapPin, Check, Clock } from "lucide-react";

export const Route = createFileRoute("/(app)/events")({ component: Events });

function Events() {
  const { user, profile, roles } = useAuth();
  const qc = useQueryClient();
  const isAdmin = roles.includes("admin");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", location: "", starts_at: "" });

  const evQ = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").order("starts_at");
      if (error) throw error; return data;
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    if (!form.starts_at) { toast.error("Pick a start time"); return; }
    const { error } = await supabase.from("events").insert({
      submitted_by: user.id, state_code: profile.state_code,
      title: form.title.trim(), description: form.description.trim() || null,
      location: form.location.trim() || null, starts_at: new Date(form.starts_at).toISOString(),
    });
    if (error) { toast.error(error.message); return; }
    setForm({ title: "", description: "", location: "", starts_at: "" });
    setOpen(false);
    toast.success("Submitted! An admin will review it shortly.");
    qc.invalidateQueries({ queryKey: ["events"] });
  };

  const approve = async (id: string) => {
    const { error } = await supabase.from("events").update({ approved: true, approved_by: user!.id }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["events"] });
  };

  const approved = evQ.data?.filter(e => e.approved) ?? [];
  const pending = evQ.data?.filter(e => !e.approved) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Events calendar</h1>
          <p className="mt-1 text-muted-foreground">School, sports, festivals, community meetings — submitted by your state.</p>
        </div>
        <Button onClick={() => setOpen(v => !v)}>Submit event</Button>
      </div>
      {open && (
        <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 grid gap-3 sm:grid-cols-2">
          <Input className="sm:col-span-2" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Event title" maxLength={160} required />
          <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Location (city, venue)" />
          <Input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} required />
          <Textarea className="sm:col-span-2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Details (optional)" maxLength={1000} />
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Submit for approval</Button>
          </div>
        </form>
      )}

      {pending.length > 0 && (
        <section>
          <h2 className="font-display text-xl mb-2 flex items-center gap-2"><Clock className="h-4 w-4" /> Awaiting approval</h2>
          <div className="space-y-2">
            {pending.map(e => (
              <div key={e.id} className="rounded-xl border border-dashed border-border bg-card p-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">{new Date(e.starts_at).toLocaleString()}</div>
                  <div className="font-display text-lg">{e.title}</div>
                  {e.location && <div className="text-sm text-muted-foreground">📍 {e.location}</div>}
                </div>
                {isAdmin && <Button size="sm" onClick={() => approve(e.id)}><Check className="h-4 w-4 mr-1" />Approve</Button>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-xl mb-2 flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Upcoming</h2>
        {evQ.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {approved.length === 0 && <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">No upcoming events approved yet.</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          {approved.map(e => (
            <div key={e.id} className="rounded-xl border border-border bg-card p-5">
              <div className="text-xs uppercase tracking-wide text-accent">{new Date(e.starts_at).toLocaleString()}</div>
              <h3 className="mt-2 font-display text-xl">{e.title}</h3>
              {e.location && <div className="mt-1 text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{e.location}</div>}
              {e.description && <p className="mt-2 text-sm">{e.description}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

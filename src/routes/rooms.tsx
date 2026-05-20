import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { getLocalRooms, roomSlug, saveLocalRoom } from "@/lib/local-rooms";
import { stateName } from "@/lib/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Plus, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/rooms")({ component: () => (<AppShell><Rooms /></AppShell>) });

function Rooms() {
  const loc = useLocation();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["rooms", profile?.state_code],
    queryFn: async () => getLocalRooms(profile?.state_code),
  });

  const addChat = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast.error("Add a chat name");
      return;
    }
    if (!profile?.state_code) {
      toast.error("Pick your state first");
      return;
    }
    saveLocalRoom(profile.state_code, {
      name: trimmedName,
      slug: roomSlug(trimmedName),
      description: description.trim() || null,
    });
    setName("");
    setDescription("");
    setShowForm(false);
    qc.invalidateQueries({ queryKey: ["rooms", profile.state_code] });
    toast.success(`Chat added for ${stateName(profile.state_code)}`);
  };

  if (loc.pathname !== "/rooms") return <Outlet />;

  const searchTerm = search.trim().toLowerCase();
  const filteredRooms = (data ?? []).filter(room => {
    if (!searchTerm) return true;
    return [room.name, room.slug, room.description ?? ""].some(value =>
      value.toLowerCase().includes(searchTerm),
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Conversation rooms</h1>
          <p className="mt-1 text-muted-foreground">
            Rooms for {stateName(profile?.state_code)} only. People in other states have their own rooms.
          </p>
        </div>
        <Button onClick={() => setShowForm(v => !v)} className="shrink-0">
          <Plus className="h-4 w-4" /> Add chat
        </Button>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
          placeholder="Search rooms by topic, like jokes or neighborhood help"
        />
      </div>
      {showForm && (
        <form onSubmit={addChat} className="rounded-xl border border-border bg-card p-5 space-y-3">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Chat name" maxLength={60} required />
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What should people talk about here?" maxLength={180} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Create chat</Button>
          </div>
        </form>
      )}
      {isLoading && <p className="text-sm text-muted-foreground">Loading rooms...</p>}
      {!isLoading && filteredRooms.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          {search.trim()
            ? `No rooms found for "${search.trim()}". Try another topic.`
            : `No rooms in ${stateName(profile?.state_code)} yet. Add the first chat for this state.`}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {filteredRooms.map(r => (
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

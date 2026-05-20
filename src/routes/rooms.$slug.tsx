import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { isMessageAllowed } from "@/lib/moderation";
import { findLocalRoom, getLocalMessages, saveLocalMessage, toggleLocalMessageLike } from "@/lib/local-rooms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Heart } from "lucide-react";

export const Route = createFileRoute("/rooms/$slug")({ component: RoomPage });

function RoomPage() {
  const { slug } = useParams({ from: "/rooms/$slug" });
  const { profile, user } = useAuth();
  const [text, setText] = useState("");
  const localRoom = findLocalRoom(slug, profile?.state_code);
  const [localMessages, setLocalMessages] = useState(() =>
    localRoom && profile?.state_code ? getLocalMessages(profile.state_code, localRoom.id) : [],
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [localMessages]);

  useEffect(() => {
    if (!localRoom || !profile?.state_code) return;
    setLocalMessages(getLocalMessages(profile.state_code, localRoom.id));
  }, [localRoom?.id, profile?.state_code]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !user || !profile || !localRoom) return;
    if (body.length > 1000) { toast.error("Keep it under 1000 characters"); return; }
    if (!isMessageAllowed(body)) {
      toast.error("That message may be hurtful or inappropriate. Please rewrite it kindly.");
      return;
    }
    setText("");

    const nextMessage = saveLocalMessage(profile.state_code, localRoom.id, {
      body,
      user_id: user.id,
      display_name: profile.display_name,
      liked_by: [],
    });
    setLocalMessages(messages => [...messages, nextMessage]);
  };

  const toggleLike = (messageId: string) => {
    if (!localRoom || !user || !profile?.state_code) return;
    setLocalMessages(toggleLocalMessageLike(profile.state_code, localRoom.id, messageId, user.id));
  };

  if (!localRoom) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Link to="/rooms" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All rooms
        </Link>
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          This room does not belong to your current state. Go back and create a room for your state.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col">
      <div className="mb-4">
        <Link to="/rooms" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All rooms
        </Link>
        <h1 className="mt-1 font-display text-2xl">{localRoom.name}</h1>
        <p className="text-sm text-muted-foreground">{localRoom.description}</p>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4 space-y-3">
        {localMessages.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">No messages yet. Start a thread.</p>}
        {localMessages.map(m => {
          const mine = m.user_id === user?.id;
          return (
            <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
              <div className={"max-w-[75%] rounded-2xl px-4 py-2 " + (mine ? "bg-primary text-primary-foreground" : "bg-muted")}>
                <div className="text-xs font-medium opacity-70">{m.display_name}</div>
                <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                <button
                  type="button"
                  onClick={() => toggleLike(m.id)}
                  className={"mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition " +
                    ((m.liked_by ?? []).includes(user?.id ?? "")
                      ? "border-accent bg-accent/10 text-accent"
                      : mine ? "border-primary-foreground/30 text-primary-foreground/80" : "border-border text-muted-foreground hover:border-accent")}
                >
                  <Heart className="h-3 w-3" /> {(m.liked_by ?? []).length}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <Input value={text} onChange={e => setText(e.target.value)} placeholder="Stay on topic, be kind." maxLength={1000} />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
}

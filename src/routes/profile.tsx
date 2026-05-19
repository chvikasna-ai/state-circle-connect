import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { getSavedLocalProfiles, useAuth } from "@/lib/auth";
import { stateName } from "@/lib/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, UserCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({ component: () => (<AppShell><ProfilePage /></AppShell>) });

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "S") + (parts[1]?.[0] ?? "C");
}

function ProfilePage() {
  const { profile, updateProfile } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(profile?.display_name ?? "");
    setBio(profile?.bio ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const displayName = name.trim();
    if (displayName.length < 2) {
      toast.error("Name needs at least 2 characters");
      return;
    }
    const nameTaken = getSavedLocalProfiles().some(savedProfile =>
      savedProfile.id !== profile?.id &&
      savedProfile.display_name.trim().toLowerCase() === displayName.toLowerCase()
    );
    if (nameTaken) {
      toast.error("That nickname is already used. Add your city, initials, or a number.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        display_name: displayName,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const choosePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setAvatarUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Profile</h1>
        <p className="mt-1 text-muted-foreground">Your name, bio, and avatar for State Circle.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-muted text-2xl font-display">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{initials(name || profile?.display_name || "State Circle").toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-accent">
              <UserCircle className="h-4 w-4" /> {stateName(profile?.state_code)} member
            </div>
            <h2 className="mt-2 font-display text-2xl">{name || profile?.display_name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{bio || "Add a short bio so people know a little about you."}</p>
          </div>
        </div>
      </section>

      <form onSubmit={save} className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <Label htmlFor="display-name">Name</Label>
          <Input id="display-name" value={name} onChange={e => setName(e.target.value)} maxLength={40} required />
        </div>
        <div>
          <Label htmlFor="avatar-url">Avatar image link</Label>
          <div className="flex gap-2">
            <Input id="avatar-url" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Photo</span>
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={choosePhoto}
            className="hidden"
          />
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              Take or choose photo
            </Button>
            {avatarUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setAvatarUrl("")}>
                Remove photo
              </Button>
            )}
          </div>
        </div>
        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="A little about you..."
            maxLength={220}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save profile"}</Button>
        </div>
      </form>
    </div>
  );
}

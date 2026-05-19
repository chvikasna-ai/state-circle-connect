import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  display_name: string;
  state_code: string;
  bio: string | null;
  avatar_url: string | null;
};
export type Role = "admin" | "helper" | "member";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: Role[];
  loading: boolean;
  createLocalProfile: (profile: Pick<Profile, "display_name" | "state_code">) => void;
  updateProfile: (profile: Pick<Profile, "display_name" | "bio" | "avatar_url">) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);
const LOCAL_PROFILE_KEY = "state-circle-local-profile";
const LOCAL_PROFILES_KEY = "state-circle-local-profiles";

const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

const cleanName = (name: string) => name.trim().toLowerCase();

export const getSavedLocalProfiles = (): Profile[] => {
  if (!canUseStorage()) return [];
  const saved = window.localStorage.getItem(LOCAL_PROFILES_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved) as Profile[];
  } catch {
    window.localStorage.removeItem(LOCAL_PROFILES_KEY);
    return [];
  }
};

const saveProfileToHistory = (profile: Profile) => {
  const profiles = getSavedLocalProfiles();
  const nextProfiles = [
    profile,
    ...profiles.filter(savedProfile => savedProfile.id !== profile.id),
  ];
  window.localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(nextProfiles));
};

export const findSavedLocalProfile = (displayName: string, stateCode: string) =>
  getSavedLocalProfiles().find(profile =>
    cleanName(profile.display_name) === cleanName(displayName) &&
    profile.state_code === stateCode
  ) ?? null;

export const isLocalNicknameTaken = (displayName: string, stateCode: string) =>
  getSavedLocalProfiles().some(profile =>
    cleanName(profile.display_name) === cleanName(displayName) &&
    profile.state_code !== stateCode
  );

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [localProfile, setLocalProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const [{ data: prof }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setProfile(prof as Profile | null);
    setRoles(((r ?? []) as { role: Role }[]).map(x => x.role));
  };

  useEffect(() => {
    const saved = window.localStorage.getItem(LOCAL_PROFILE_KEY);
    if (saved) {
      try {
        const parsedProfile = JSON.parse(saved) as Profile;
        saveProfileToHistory(parsedProfile);
        setLocalProfile(parsedProfile);
      } catch {
        window.localStorage.removeItem(LOCAL_PROFILE_KEY);
      }
    }
    setLoading(false);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) setTimeout(() => { loadProfile(s.user.id); }, 0);
      else { setProfile(null); setRoles([]); }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const createLocalProfile = (nextProfile: Pick<Profile, "display_name" | "state_code">) => {
    const savedProfile = findSavedLocalProfile(nextProfile.display_name, nextProfile.state_code);
    if (savedProfile) {
      window.localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(savedProfile));
      setLocalProfile(savedProfile);
      return;
    }

    const prof: Profile = {
      id: crypto.randomUUID(),
      display_name: nextProfile.display_name,
      state_code: nextProfile.state_code,
      bio: null,
      avatar_url: null,
    };
    window.localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(prof));
    saveProfileToHistory(prof);
    setLocalProfile(prof);
  };

  const updateProfile = async (nextProfile: Pick<Profile, "display_name" | "bio" | "avatar_url">) => {
    if (session?.user) {
      const { error } = await supabase
        .from("profiles")
        .update(nextProfile)
        .eq("id", session.user.id);
      if (error) throw error;
      setProfile(current => current ? { ...current, ...nextProfile } : current);
      return;
    }

    setLocalProfile(current => {
      if (!current) return current;
      const updated = { ...current, ...nextProfile };
      window.localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));
      saveProfileToHistory(updated);
      return updated;
    });
  };

  const localUser = localProfile ? ({ id: localProfile.id } as User) : null;

  return (
    <Ctx.Provider value={{
      user: session?.user ?? localUser,
      session,
      profile: profile ?? localProfile,
      roles,
      loading,
      createLocalProfile,
      updateProfile,
      refreshProfile: async () => { if (session?.user) await loadProfile(session.user.id); },
      signOut: async () => {
        window.localStorage.removeItem(LOCAL_PROFILE_KEY);
        setLocalProfile(null);
        await supabase.auth.signOut();
      },
    }}>{children}</Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}

import { useSyncExternalStore } from "react";

// Operator display profile — harmless UI preference (name shown in sidebar/header).
const KEY = "jarvis-profile";

export interface Profile { name: string; role: string; }

function defaults(): Profile {
  if (typeof window !== "undefined") {
    // Prefer stored profile; never hardcode anyone's name.
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as Profile;
    } catch { /* ignore */ }
  }
  return { name: "", role: "" };
}

let profile: Profile = { name: "", role: "" };
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  profile = defaults();
}
function emit() { listeners.forEach((l) => l()); }
function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

const EMPTY_PROFILE: Profile = { name: "", role: "" };
export function useProfile(): Profile {
  useSyncExternalStore(subscribe, () => { load(); return profile; }, () => EMPTY_PROFILE);
  load();
  return profile;
}

export function setProfile(p: Partial<Profile>) {
  load();
  profile = { ...profile, ...p, name: p.name?.trim() ?? profile.name, role: p.role?.trim() ?? profile.role };
  try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch { /* noop */ }
  emit();
}

export function profileInitials(p: Profile, fallbackEmail?: string | null): string {
  if (p.name.trim()) {
    return p.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  }
  if (fallbackEmail) return fallbackEmail.slice(0, 2).toUpperCase();
  return "?";
}

export function profileDisplayName(p: Profile, fallbackEmail?: string | null): string {
  if (p.name.trim()) return p.name.trim();
  if (fallbackEmail) return fallbackEmail.split("@")[0] ?? "Operator";
  return "Operator";
}

"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-context";
import { apiFetch } from "@/lib/supabase";
import { apiErrorMessage } from "@/lib/data-mode";
import { setProfile, useProfile } from "@/lib/profile";

type Status = "Connected" | "Missing" | "Error" | "Checking";

export default function SettingsPage() {
  const { user, configured, signOut } = useAuth();
  const profile = useProfile();
  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<Record<string, { status: Status; detail: string }>>({});
  const [testing, setTesting] = useState<string | null>(null);

  const load = async (which = "all") => {
    setTesting(which);
    try {
      const r = await apiFetch(`/api/settings/test?which=${which}`);
      const j = await r.json();
      if (!r.ok) throw new Error(apiErrorMessage(j, "Status check failed."));
      setStatus((s) => ({ ...s, ...j }));
    } catch (e) {
      setStatus((s) => ({ ...s, error: { status: "Error", detail: e instanceof Error ? e.message : "status check failed" } }));
    } finally {
      setTesting(null);
    }
  };
  useEffect(() => { load(); }, []);

  const badge = (s?: Status) => s === "Connected" ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400" : s === "Missing" ? "border-amber-500/30 bg-amber-500/15 text-amber-400" : s === "Error" ? "border-rose-500/30 bg-rose-500/15 text-rose-400" : "border-[#27272A] text-zinc-400";

  const Section = ({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) => (
    <section className="rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-4">
      <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
      <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
  const Row = ({ k, v, test }: { k: string; v?: { status: Status; detail: string }; test?: string }) => (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 shrink-0 text-zinc-400">{k}</span>
      <span className={`rounded-md border px-1.5 py-0.5 font-semibold ${badge(v?.status)}`}>{testing === test ? "Checking" : (v?.status ?? "…")}</span>
      <span className="min-w-0 flex-1 truncate text-zinc-500">{v?.detail ?? ""}</span>
      {test && <button onClick={() => load(test)} disabled={testing !== null} className="shrink-0 rounded-lg border border-[#27272A] px-2 py-1 text-zinc-300 disabled:opacity-50">Test</button>}
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">System</p>
      <h1 className="text-[26px] font-semibold tracking-tight text-zinc-50">Settings</h1>
      <p className="text-xs text-zinc-500">Secrets live in server environment variables only — status shows presence, never values.</p>
      {saved && <p role="status" className="rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-1.5 text-xs text-emerald-200">Preferences saved (theme/sidebar only).</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        <Section title="Profile" hint="Display name shown in the sidebar and header. Stored only in this browser.">
          <label className="block text-xs text-zinc-500">Display name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={user?.email?.split("@")[0] ?? "Your name"} className="mt-1 w-full rounded-lg border border-[#1c1c21] bg-[#121215] px-3 py-2 text-sm text-zinc-100 outline-none" />
          </label>
          <label className="block text-xs text-zinc-500">Role
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Operator" className="mt-1 w-full rounded-lg border border-[#1c1c21] bg-[#121215] px-3 py-2 text-sm text-zinc-100 outline-none" />
          </label>
          {profileMsg && <p role="status" className="text-xs text-emerald-300">{profileMsg}</p>}
          <button onClick={() => { setProfile({ name, role }); setProfileMsg("Profile saved."); window.setTimeout(() => setProfileMsg(null), 2000); }} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">Save profile</button>
        </Section>
        <Section title="Account" hint="Supabase Auth session. Google OAuth works when enabled in Supabase Auth providers.">
          {configured ? (
            user ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="truncate text-zinc-300">{user.email ?? user.id}</span>
                <button onClick={signOut} className="ml-auto shrink-0 rounded-lg border border-[#27272A] px-3 py-1.5 text-zinc-300">Sign out</button>
              </div>
            ) : <p className="text-xs text-zinc-400">Not signed in (demo mode). <a href="/login" className="text-blue-400 underline">Sign in</a></p>
          ) : <p className="text-xs text-zinc-400">Auth not configured — running in explicit demo mode.</p>}
        </Section>
        <Section title="Providers" hint="Live connectivity checks. Values are never exposed.">
          <Row k="Supabase" v={status.supabase ?? status.database} test="supabase" />
          <Row k="AI" v={status.ai} test="ai" />
          <Row k="Business search" v={status.search} test="search" />
          <Row k="Email" v={status.email} test="email" />
          <Row k="Netlify" v={status.netlify ?? status.deployment} test="netlify" />
          <button onClick={() => load("all")} disabled={testing !== null} className="rounded-lg border border-[#27272A] px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-50">Test all</button>
        </Section>
        <Section title="AI" hint="Provider-agnostic OpenAI-compatible config (server env: AI_PROVIDER, AI_BASE_URL, AI_API_KEY, AI_MODEL).">
          <p className="text-xs text-zinc-400">Model output is labeled with provider + model + prompt version. Unconfigured AI returns an explicit error, never fabricated output.</p>
        </Section>
        <Section title="Payments" hint="UPI VPA is a preference; QR codes are generated locally from upi:// links.">
          <p className="text-xs text-zinc-400">Set your UPI VPA per-invoice on the Invoices page. QR images render from the local /api/invoices/qr endpoint — no external QR service.</p>
        </Section>
        <Section title="Data & Security" hint="Auth enforced on every mutation; dev bypass only when NODE_ENV=development and ALLOW_DEV_AUTH=true.">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setSaved(true); window.setTimeout(() => setSaved(false), 2000); }} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">Save preferences</button>
            <button onClick={() => { if (window.confirm("Delete ALL local demo data (leads, activity, outreach, invoices)? Only applies in demo mode.")) { ["jarvis-crm-leads", "jarvis-activity-events", "jarvis-outreach", "jarvis-invoices", "jarvis-deployments"].forEach((k) => localStorage.removeItem(k)); window.location.reload(); } }} className="rounded-lg border border-rose-800 px-3 py-1.5 text-xs text-rose-300">Delete local demo data…</button>
          </div>
        </Section>
      </div>
    </div>
  );
}

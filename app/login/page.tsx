"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-xs text-zinc-500">Loading…</p>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/today";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = supabaseConfigured();
  const inp = "w-full rounded-lg border border-[#1c1c21] bg-[#121215] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/50";

  const login = async () => {
    setErr(null); setBusy(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Auth not configured.");
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      router.replace(next);
    } catch (e) { setErr(e instanceof Error ? e.message : "Sign in failed."); }
    finally { setBusy(false); }
  };

  const google = async () => {
    setErr(null);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Auth not configured.");
      const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/today` } });
      if (error) throw error;
    } catch (e) { setErr(e instanceof Error ? e.message : "Google sign-in failed. Enable the Google provider in Supabase Auth if needed."); }
  };

  return (
    <div className="mx-auto mt-16 w-full max-w-sm rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-5">
      <h1 className="text-lg font-semibold text-zinc-50">Sign in to Jarvis</h1>
      {!configured && <p className="mt-1 rounded-lg border border-amber-800 bg-amber-950 p-2 text-xs text-amber-200">Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL + ANON_KEY, or enable demo mode for local development.</p>}
      <div className="mt-3 space-y-2">
        <label className="block text-xs text-zinc-500">Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className={inp} /></label>
        <label className="block text-xs text-zinc-500">Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" onKeyDown={(e) => e.key === "Enter" && login()} className={inp} /></label>
      </div>
      {err && <p role="alert" className="mt-2 rounded-lg border border-rose-800 bg-rose-950 p-2 text-xs text-rose-200">{err}</p>}
      <button onClick={login} disabled={busy || !configured} className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
      <button onClick={google} disabled={!configured} className="mt-2 w-full rounded-lg border border-[#27272A] py-2 text-sm text-zinc-200 disabled:opacity-50">Continue with Google</button>
      <p className="mt-3 flex justify-between text-xs text-zinc-500">
        <Link href="/signup" className="text-blue-400 hover:underline">Create account</Link>
        <Link href="/reset-password" className="text-blue-400 hover:underline">Forgot password?</Link>
      </p>
    </div>
  );
}

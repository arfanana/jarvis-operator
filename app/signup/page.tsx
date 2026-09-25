"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = supabaseConfigured();
  const inp = "w-full rounded-lg border border-[#1c1c21] bg-[#121215] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/50";

  const signup = async () => {
    setErr(null); setMsg(null); setBusy(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Auth not configured.");
      if (password.length < 8) throw new Error("Password must be at least 8 characters.");
      const { data, error } = await sb.auth.signUp({ email: email.trim(), password });
      if (error) throw error;
      if (data.session) router.replace("/today");
      else setMsg("Account created — check your email to confirm, then sign in.");
    } catch (e) { setErr(e instanceof Error ? e.message : "Sign up failed."); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto mt-16 w-full max-w-sm rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-5">
      <h1 className="text-lg font-semibold text-zinc-50">Create account</h1>
      <div className="mt-3 space-y-2">
        <label className="block text-xs text-zinc-500">Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className={inp} /></label>
        <label className="block text-xs text-zinc-500">Password (8+ chars)<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="new-password" onKeyDown={(e) => e.key === "Enter" && signup()} className={inp} /></label>
      </div>
      {err && <p role="alert" className="mt-2 rounded-lg border border-rose-800 bg-rose-950 p-2 text-xs text-rose-200">{err}</p>}
      {msg && <p role="status" className="mt-2 rounded-lg border border-emerald-800 bg-emerald-950 p-2 text-xs text-emerald-200">{msg}</p>}
      <button onClick={signup} disabled={busy || !configured} className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Creating…" : "Sign up"}</button>
      <p className="mt-3 text-xs text-zinc-500"><Link href="/login" className="text-blue-400 hover:underline">Back to sign in</Link></p>
    </div>
  );
}

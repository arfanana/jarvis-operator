"use client";
import { useState } from "react";
import Link from "next/link";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = supabaseConfigured();

  const send = async () => {
    setErr(null); setMsg(null); setBusy(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Auth not configured.");
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/login` });
      if (error) throw error;
      setMsg("Reset link sent — check your email.");
    } catch (e) { setErr(e instanceof Error ? e.message : "Request failed."); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto mt-16 w-full max-w-sm rounded-xl border border-[#1c1c21] bg-[#0c0c0f] p-5">
      <h1 className="text-lg font-semibold text-zinc-50">Reset password</h1>
      <label className="mt-3 block text-xs text-zinc-500">Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" onKeyDown={(e) => e.key === "Enter" && send()} className="mt-1 w-full rounded-lg border border-[#1c1c21] bg-[#121215] px-3 py-2 text-sm text-zinc-100 outline-none" /></label>
      {err && <p role="alert" className="mt-2 rounded-lg border border-rose-800 bg-rose-950 p-2 text-xs text-rose-200">{err}</p>}
      {msg && <p role="status" className="mt-2 rounded-lg border border-emerald-800 bg-emerald-950 p-2 text-xs text-emerald-200">{msg}</p>}
      <button onClick={send} disabled={busy || !configured} className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Sending…" : "Send reset link"}</button>
      <p className="mt-3 text-xs text-zinc-500"><Link href="/login" className="text-blue-400 hover:underline">Back to sign in</Link></p>
    </div>
  );
}

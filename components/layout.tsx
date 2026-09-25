"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn, todayISO } from "@/lib/utils";
import { useLeads } from "@/lib/crm";
import { profileDisplayName, profileInitials, useProfile } from "@/lib/profile";
import { useAuth } from "@/components/auth-context";
import {
  Bell, Bot, Briefcase, ChevronDown, ChevronUp, Database, KanbanSquare, LayoutGrid,
  Moon, Plus, Search, Settings2, ShieldCheck, Sparkles, Sun, TerminalSquare, Zap,
} from "lucide-react";

const groups = [
  { label: "WORKSPACE", items: [
    { href: "/today", label: "Today", icon: Zap, badge: "due" },
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
    { href: "/find-leads", label: "Find leads", icon: Search },
    { href: "/add-leads", label: "Add leads", icon: Plus },
    { href: "/saved-leads", label: "Saved leads", icon: Database, badge: "saved" },
    { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  ]},
  { label: "OPERATIONS", items: [
    { href: "/ai-tools", label: "AI tools", icon: Bot },
    { href: "/outreach", label: "Outreach", icon: Bell },
    { href: "/demos", label: "Demos", icon: Sparkles },
    { href: "/invoices", label: "Invoices", icon: Briefcase },
    { href: "/revenue", label: "Revenue", icon: Briefcase },
    { href: "/activity", label: "Activity", icon: TerminalSquare },
    { href: "/logs", label: "Logs", icon: TerminalSquare },
  ]},
  { label: "SYSTEM", items: [
    { href: "/website-cleanup", label: "Website cleanup", icon: ShieldCheck },
    { href: "/settings", label: "Settings", icon: Settings2 },
    { href: "/design-system", label: "Design system", icon: Sparkles },
  ]},
];

const WORKSPACES = [
  { name: "arfie co", sub: "Hyderabad, India", initial: "M" },
  { name: "Meridian Studio", sub: "Hyderabad, India", initial: "S" },
];

export function Sidebar({ ws, setWs }: { ws: number; setWs: (i: number) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [wsOpen, setWsOpen] = useState(false);
  const pathname = usePathname();
  const leads = useLeads();
  const stats = useMemo(() => {
    const today = todayISO();
    const due = leads.filter((l) => (l.next_follow_up ?? l.nextFollowUp ?? "") <= today).length;
    return { saved: leads.length, due };
  }, [leads]);
  const w = WORKSPACES[ws];
  const profile = useProfile();
  const { user } = useAuth();
  const initials = profileInitials(profile, user?.email);
  const displayName = profileDisplayName(profile, user?.email);
  const roleLabel = profile.role.trim() || "Operator";
  const badgeFor = (b?: string) => {
    if (b === "due") return <span title={`${stats.due} follow-ups due today or overdue`} className="cursor-help rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400">{stats.due}</span>;
    if (b === "saved") return <span title={`${stats.saved} leads saved in the CRM`} className="cursor-help rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">{stats.saved}</span>;
    return null;
  };
  return (
    <aside className={cn("flex h-screen shrink-0 flex-col border-r border-[#1c1c21] bg-[#0c0c0f] transition-all", collapsed ? "w-14" : "w-60")}>
      <div className="flex items-center gap-2 px-3 py-3">
        {collapsed ? (
          <button onClick={() => setCollapsed(false)} title="Expand sidebar"
            className="grid h-8 w-8 place-items-center rounded-lg border border-[#1c1c21] bg-[#121215] text-zinc-400 hover:text-zinc-200">
            <KanbanSquare size={14} />
          </button>
        ) : (
          <button onClick={() => setCollapsed(true)} title="Collapse sidebar"
            className="ml-auto rounded p-1 text-zinc-600 hover:bg-white/5 hover:text-zinc-300">
            <KanbanSquare size={14} />
          </button>
        )}
      </div>
      {!collapsed ? (
        <div className="relative px-3 pb-2">
          <button onClick={() => setWsOpen(!wsOpen)} title="Switch workspace — toggles the active team context for targets and assignments"
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-[#1c1c21] bg-[#121215] px-2.5 py-2 text-left hover:border-[#2a2a30]">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#27272A] text-[11px] font-bold text-zinc-200">{w.initial}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-zinc-100">{w.name}</span>
              <span className="block truncate text-[11px] text-zinc-500">{w.sub}</span>
            </span>
            {wsOpen ? <ChevronUp size={14} className="shrink-0 text-zinc-500" /> : <ChevronDown size={14} className="shrink-0 text-zinc-500" />}
          </button>
          {wsOpen && (
            <div className="absolute left-3 right-3 top-full z-50 mt-1 overflow-hidden rounded-lg border border-[#27272A] bg-[#121215] shadow-xl">
              {WORKSPACES.map((x, i) => (
                <button key={x.name} onClick={() => { setWs(i); setWsOpen(false); }}
                  className={cn("flex w-full items-center gap-2.5 px-2.5 py-2 text-left hover:bg-white/5", i === ws && "bg-blue-500/10")}>
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-[#27272A] text-[11px] font-bold text-zinc-200">{x.initial}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-zinc-100">{x.name}</span>
                    <span className="block truncate text-[11px] text-zinc-500">{x.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="px-3 pb-2">
          <button onClick={() => setCollapsed(false)} title="Expand sidebar"
            className="grid h-8 w-8 place-items-center rounded-lg border border-[#1c1c21] bg-[#121215] text-[11px] font-bold text-zinc-200">{w.initial}</button>
        </div>
      )}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {groups.map((g) => (
          <div key={g.label} className="mb-4">
            {!collapsed && <p className="px-2 pb-1.5 text-[10px] font-medium tracking-[0.08em] text-zinc-600">{g.label}</p>}
            {g.items.map((it) => {
              const active = pathname === it.href || (it.href === "/today" && pathname === "/");
              return (
                <Link key={it.href} href={it.href}
                  className={cn("mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px]",
                    active ? "bg-blue-500/10 text-blue-400" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100")}>
                  <it.icon size={15} className="shrink-0" />
                  {!collapsed && <span className="flex-1">{it.label}</span>}
                  {!collapsed && badgeFor((it as { badge?: string }).badge)}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      {!collapsed && (
        <div className="border-t border-[#1c1c21]">
          <div className="space-y-1.5 px-4 py-3 text-[12px]">
            <div className="flex items-center justify-between" title="All background jobs healthy — scraper, scorer, sender nominal">
              <span className="flex cursor-help items-center gap-1.5 text-zinc-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />System online</span>
              <span className="font-medium tabular-nums text-zinc-300">100%</span>
            </div>
            <div className="flex items-center justify-between"><span className="text-zinc-500">Saved leads</span><span className="tabular-nums text-zinc-300">{stats.saved}</span></div>
            <div className="flex items-center justify-between"><span className="text-zinc-500">Follow-ups due</span><span className="tabular-nums text-zinc-300">{stats.due}</span></div>
          </div>
          <Link href="/settings" title="Open account settings"
            className="mx-2 mb-2 flex items-center gap-2.5 rounded-lg border border-[#1c1c21] bg-[#121215] px-2.5 py-2 hover:border-[#2a2a30]">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-500/20 text-[11px] font-bold text-blue-300">{initials}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-zinc-100">{displayName}</span>
              <span className="block truncate text-[11px] text-zinc-500">{roleLabel}</span>
            </span>
            <Settings2 size={14} className="shrink-0 text-zinc-500" />
          </Link>
        </div>
      )}
    </aside>
  );
}

const NOTIFS = [
  { id: "n1", title: "Follow-ups due today", sub: "Today or overdue · act before momentum drops", tone: "rose" as const },
  { id: "n2", title: "WhatsApp rate-limit at 82%", sub: "Sender service · throttle bulk sends", tone: "amber" as const },
  { id: "n3", title: "Targets reset at midnight", sub: "Messages · Replies · Deals", tone: "emerald" as const },
];

function HeaderAvatar() {
  const profile = useProfile();
  const { user } = useAuth();
  return <>{profileInitials(profile, user?.email)}</>;
}

export function Header({ ws }: { ws: number }) {
  const pathname = usePathname();
  const crumbs = pathname.split("/").filter(Boolean);
  const here = crumbs.length ? crumbs[crumbs.length - 1].replace(/-/g, " ") : "Today";
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [bell, setBell] = useState(false);
  const [read, setRead] = useState<string[]>([]);
  useEffect(() => {
    try { if (localStorage.getItem("jarvis-theme") === "light") setTheme("light"); } catch { /* noop */ }
  }, []);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("jarvis-theme", next); } catch { /* noop */ }
    document.documentElement.classList.toggle("light", next === "light");
    document.documentElement.classList.toggle("dark", next === "dark");
  };
  const openPalette = () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
  const unread = NOTIFS.filter((n) => !read.includes(n.id)).length;
  return (
    <header className="flex items-center gap-3 border-b border-[#1c1c21] bg-[#09090B] px-5 py-2.5">
      <div className="flex items-center gap-2 text-[13px] text-zinc-500">
        <span className="hover:text-zinc-300">{WORKSPACES[ws].name === "arfie co" ? "Meridian Studio" : WORKSPACES[ws].name}</span>
        <span className="text-zinc-700">›</span>
        <span className="capitalize text-zinc-200">{here}</span>
      </div>
      <div className="flex-1" />
      <button onClick={openPalette} title="Global command menu — search leads, jump to pages, run actions"
        className="hidden w-64 items-center gap-2 rounded-lg border border-[#1c1c21] bg-[#121215] px-3 py-1.5 text-[13px] text-zinc-500 hover:border-[#2a2a30] md:flex">
        <Search size={13} /><span className="flex-1 text-left">Search anything</span>
        <kbd className="rounded bg-[#27272A] px-1.5 py-0.5 text-[10px] text-zinc-400">⌘ K</kbd>
      </button>
      <button onClick={toggleTheme} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-zinc-100">
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      <div className="relative">
        <button onClick={() => setBell(!bell)} title="Notifications — follow-ups, rate limits, closed deals"
          className="relative rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-zinc-100">
          <Bell size={16} />
          {unread > 0 && <span className="absolute right-1 top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white">{unread}</span>}
        </button>
        {bell && (
          <div className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-xl border border-[#27272A] bg-[#121215] shadow-2xl">
            <p className="border-b border-[#1c1c21] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Notifications</p>
            {NOTIFS.map((n) => (
              <button key={n.id} onClick={() => setRead((r) => [...r, n.id])}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-white/5">
                <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                  n.tone === "rose" && "bg-rose-500", n.tone === "amber" && "bg-amber-500", n.tone === "emerald" && "bg-emerald-500")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-zinc-100">{n.title}</span>
                  <span className="block truncate text-[11px] text-zinc-500">{n.sub}</span>
                </span>
                {!read.includes(n.id) && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />}
              </button>
            ))}
            <button onClick={() => setRead(NOTIFS.map((n) => n.id))} className="w-full border-t border-[#1c1c21] px-3 py-2 text-center text-[12px] text-blue-400 hover:underline">Mark all read</button>
          </div>
        )}
      </div>
      <Link href="/settings" title="Account settings"
        className="grid h-7 w-7 place-items-center rounded-full bg-blue-500/20 text-[11px] font-bold text-blue-300 hover:bg-blue-500/30"><HeaderAvatar /></Link>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [ws, setWs] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  useEffect(() => {
    // Hydrate the in-memory lead cache from persisted data on app boot,
    // so every page (Saved leads, Today, Pipeline…) sees server data
    // without having to visit the dashboard first.
    (async () => {
      try {
        const { dataMode } = await import("@/lib/data-mode");
        if (dataMode() !== "supabase") return;
        const { syncLeadsFromServer } = await import("@/lib/crm");
        await syncLeadsFromServer();
      } catch { /* best-effort; pages show their own error states */ }
    })();
  }, []);
  return (
    <div className="flex min-h-screen bg-[#09090B] text-zinc-100">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:bg-blue-600 focus:px-3 focus:py-2 focus:text-white">Skip to content</a>
      <div className="max-md:hidden"><Sidebar ws={ws} setWs={setWs} /></div>
      {mobileNav && (
        <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNav(false)} />
          <div className="relative h-full w-64 overflow-y-auto" onClick={() => setMobileNav(false)}>
            <Sidebar ws={ws} setWs={setWs} />
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-[#1c1c21] bg-[#09090B] px-4 py-2 md:hidden">
          <button onClick={() => setMobileNav(true)} aria-label="Open navigation" className="rounded-lg border border-[#1c1c21] px-2.5 py-1.5 text-sm text-zinc-200">☰</button>
        </div>
        <Header ws={ws} />
        <main id="main-content" className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">{children}</main>
      </div>
    </div>
  );
}

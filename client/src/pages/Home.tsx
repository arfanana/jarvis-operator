import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Bot,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Clock3,
  Command,
  Copy,
  Database,
  FileCode2,
  FileText,
  Filter,
  Gauge,
  Globe2,
  KanbanSquare,
  KeyRound,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TerminalSquare,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";

type Stage = "New" | "Contacted" | "Interested" | "Proposal" | "Won" | "Lost";

type Lead = {
  id: string;
  business: string;
  niche: string;
  location: string;
  score: number;
  stage: Stage;
  contact: string;
  lastTouch: string;
  value: number;
  initials: string;
};

const leads: Lead[] = [
  { id: "LD-1048", business: "Northline Architecture", niche: "Architecture studio", location: "Portland, OR", score: 94, stage: "Interested", contact: "Maya Chen", lastTouch: "18 min ago", value: 6800, initials: "NA" },
  { id: "LD-1042", business: "Field & Form", niche: "Interior design", location: "Austin, TX", score: 91, stage: "Proposal", contact: "Lena Ortiz", lastTouch: "2h ago", value: 5200, initials: "FF" },
  { id: "LD-1037", business: "Aster & Co.", niche: "Financial planning", location: "Chicago, IL", score: 88, stage: "Contacted", contact: "Rowan Blake", lastTouch: "Yesterday", value: 4100, initials: "AC" },
  { id: "LD-1031", business: "Good Day Dental", niche: "Dental practice", location: "Denver, CO", score: 84, stage: "Interested", contact: "James Park", lastTouch: "Yesterday", value: 3600, initials: "GD" },
  { id: "LD-1026", business: "Oak & Iron", niche: "Landscape design", location: "Nashville, TN", score: 79, stage: "New", contact: "No contact", lastTouch: "3d ago", value: 2800, initials: "OI" },
];

const pipeline: Record<Stage, Lead[]> = {
  New: [leads[4]],
  Contacted: [leads[2]],
  Interested: [leads[0], leads[3]],
  Proposal: [leads[1]],
  Won: [
    { id: "LD-1019", business: "Lumen Objects", niche: "Product design", location: "New York, NY", score: 96, stage: "Won", contact: "Iris Bell", lastTouch: "4d ago", value: 7200, initials: "LO" },
  ],
  Lost: [],
};

const stages: Stage[] = ["New", "Contacted", "Interested", "Proposal", "Won", "Lost"];

const navSections = [
  { label: "Workspace", items: [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Add leads", href: "/add-leads", icon: Plus },
    { label: "Pipeline", href: "/pipeline", icon: KanbanSquare },
  ] },
  { label: "Operations", items: [
    { label: "AI tools", href: "/ai-tools", icon: Bot },
    { label: "Revenue", href: "/revenue", icon: BriefcaseBusiness },
    { label: "Logs", href: "/logs", icon: TerminalSquare },
  ] },
  { label: "System", items: [
    { label: "Settings", href: "/settings", icon: Settings2 },
    { label: "Design system", href: "/design-system", icon: Sparkles },
  ] },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function stageTone(stage: Stage) {
  return {
    New: "neutral",
    Contacted: "blue",
    Interested: "amber",
    Proposal: "violet",
    Won: "green",
    Lost: "red",
  }[stage];
}

function StatusBadge({ stage }: { stage: Stage }) {
  return <span className={cn("badge", `badge-${stageTone(stage)}`)}>{stage}</span>;
}

function Shell({ children, onThemeToggle, light }: { children: React.ReactNode; onThemeToggle: () => void; light: boolean }) {
  const [location, setLocation] = useLocation();
  const current = location === "/" ? "/" : `/${location.split("/")[1]}`;
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className={cn("app-shell", collapsed && "sidebar-collapsed")}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <button className="brand" onClick={() => setLocation("/")} aria-label="Go to dashboard">
            <span className="brand-mark">J</span>
            <span className="brand-name">jarvis</span>
          </button>
          <button className="icon-button sidebar-collapse" onClick={() => setCollapsed((value) => !value)} aria-label="Collapse sidebar">
            <PanelLeftClose size={16} />
          </button>
        </div>
        <div className="workspace-switcher">
          <span className="workspace-avatar">M</span>
          <span className="workspace-copy"><strong>Meridian Studio</strong><small>Solo workspace</small></span>
          <ChevronDown size={14} className="muted-icon" />
        </div>
        <nav className="nav-groups" aria-label="Main navigation">
          {navSections.map((section) => (
            <div className="nav-group" key={section.label}>
              <div className="nav-section-label">{section.label}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = current === item.href;
                return (
                  <button key={item.href} className={cn("nav-item", active && "nav-item-active")} onClick={() => setLocation(item.href)}>
                    <Icon size={16} strokeWidth={1.7} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="live-stat"><span className="live-dot" /><span>System online</span><span className="stat-value mono">99.9%</span></div>
          <div className="sidebar-stat"><span>Leads this month</span><strong>128</strong></div>
          <div className="sidebar-stat"><span>Last sync</span><strong className="mono">2m ago</strong></div>
          <button className="profile-row" onClick={() => setProfileOpen((value) => !value)}>
            <span className="profile-avatar">MC</span><span className="profile-copy"><strong>Marin Cole</strong><small>Owner</small></span><MoreHorizontal size={15} className="muted-icon" />
          </button>
          {profileOpen && <div className="profile-menu"><button onClick={() => toast("Profile settings are ready for the next release")}>Profile settings</button><button onClick={() => toast("You are already working offline")}>Sign out</button></div>}
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Meridian Studio</span><ChevronRight size={14} /><strong>{getPageTitle(current)}</strong></div>
          <div className="topbar-actions">
            <button className="command-trigger" onClick={() => setCommandOpen(true)}><Search size={14} /><span>Search anything</span><kbd>⌘ K</kbd></button>
            <button className="icon-button" onClick={onThemeToggle} aria-label="Toggle theme">{light ? <Moon size={16} /> : <Sun size={16} />}</button>
            <button className="icon-button notification-button" onClick={() => toast("No new notifications")} aria-label="Notifications"><Bell size={16} /><span /></button>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>

      {commandOpen && <div className="command-overlay" onMouseDown={() => setCommandOpen(false)}>
        <div className="command-dialog" onMouseDown={(event) => event.stopPropagation()}>
          <div className="command-search"><Search size={16} /><input autoFocus placeholder="Search leads, pages, operations" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /><kbd>ESC</kbd></div>
          <div className="command-results">
            <div className="command-label">Jump to</div>
            {navSections.flatMap((section) => section.items).filter((item) => item.label.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => { const Icon = item.icon; return <button key={item.href} onClick={() => { setLocation(item.href); setCommandOpen(false); }}><Icon size={15} /><span>{item.label}</span><ChevronRight size={14} /></button>; })}
            {leads.filter((lead) => lead.business.toLowerCase().includes(searchTerm.toLowerCase())).map((lead) => <button key={lead.id} onClick={() => { setLocation("/pipeline"); setCommandOpen(false); toast(`${lead.business} selected`); }}><Users size={15} /><span>{lead.business}</span><small>{lead.id}</small></button>)}
          </div>
          <div className="command-footer"><span><kbd>↑↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span><span><kbd>ESC</kbd> Close</span></div>
        </div>
      </div>}
    </div>
  );
}

function getPageTitle(path: string) {
  return navSections.flatMap((section) => section.items).find((item) => item.href === path)?.label ?? "Dashboard";
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow ?? "Workspace"}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="page-header-action">{action}</div>}</div>;
}

function MetricCard({ label, value, delta, direction, note, icon: Icon }: { label: string; value: string; delta: string; direction: "up" | "down"; note: string; icon: React.ElementType }) {
  return <div className="metric-card"><div className="metric-top"><span className="metric-label">{label}</span><Icon size={16} className="muted-icon" /></div><div className="metric-value">{value}</div><div className="metric-meta"><span className={cn(direction === "up" ? "delta-up" : "delta-down")}>{direction === "up" ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{delta}</span><span>{note}</span></div></div>;
}

function Dashboard() {
  const [, setLocation] = useLocation();
  return <>
    <PageHeader eyebrow="Overview" title="Dashboard" description="A quiet view of the work that needs attention." action={<><button className="button secondary" onClick={() => toast("Export prepared")}>Export CSV</button><button className="button primary" onClick={() => setLocation("/add-leads")}><Plus size={15} /> Add lead</button></>} />
    <section className="metric-grid">
      <MetricCard label="Open pipeline" value="$42,680" delta="18.4%" direction="up" note="vs. last month" icon={Target} />
      <MetricCard label="Active proposals" value="12" delta="3" direction="up" note="since last week" icon={FileText} />
      <MetricCard label="Collected this month" value="$18,240" delta="9.2%" direction="up" note="vs. last month" icon={Database} />
      <MetricCard label="Next action" value="8 leads" delta="2 due" direction="down" note="in the next 24h" icon={Clock3} />
    </section>
    <section className="dashboard-grid">
      <div className="panel pipeline-panel"><div className="panel-header"><div><h2>Pipeline</h2><p>Current lead distribution by stage.</p></div><button className="text-button" onClick={() => setLocation("/pipeline")}>View pipeline <ChevronRight size={14} /></button></div><div className="pipeline-total"><strong>$42,680</strong><span>weighted value</span></div><div className="pipeline-bar" aria-label="Pipeline breakdown"><span className="bar-new" style={{ width: "12%" }} /><span className="bar-contacted" style={{ width: "18%" }} /><span className="bar-interested" style={{ width: "25%" }} /><span className="bar-proposal" style={{ width: "21%" }} /><span className="bar-won" style={{ width: "18%" }} /><span className="bar-lost" style={{ width: "6%" }} /></div><div className="legend-grid">{stages.map((stage) => <div className="legend-item" key={stage}><span className={cn("legend-dot", `dot-${stageTone(stage)}`)} /><span>{stage}</span><strong>{stage === "New" ? 14 : stage === "Contacted" ? 18 : stage === "Interested" ? 21 : stage === "Proposal" ? 12 : stage === "Won" ? 9 : 4}</strong></div>)}</div></div>
      <div className="panel activity-panel"><div className="panel-header"><div><h2>Activity</h2><p>Latest changes across the workspace.</p></div><button className="icon-button" onClick={() => toast("Activity refreshed")}><RefreshCw size={15} /></button></div><div className="activity-list">{[{ icon: Check, title: "Proposal marked as sent", detail: "Field & Form · 14 min ago", tone: "green" }, { icon: Send, title: "Outreach sequence started", detail: "Aster & Co. · 1h ago", tone: "blue" }, { icon: Sparkles, title: "Audit completed", detail: "Northline Architecture · 2h ago", tone: "violet" }, { icon: Plus, title: "3 new leads imported", detail: "Google Maps · 4h ago", tone: "neutral" }].map((item) => { const Icon = item.icon; return <div className="activity-row" key={item.title}><span className={cn("activity-icon", `activity-${item.tone}`)}><Icon size={13} /></span><span><strong>{item.title}</strong><small>{item.detail}</small></span></div>; })}</div></div>
    </section>
    <section className="panel table-panel"><div className="panel-header"><div><h2>Hot leads</h2><p>Highest scoring opportunities that still need a next step.</p></div><button className="text-button" onClick={() => setLocation("/pipeline")}>View all <ChevronRight size={14} /></button></div><LeadTable compact onSelect={(lead) => toast(`${lead.business} selected`)} /></section>
  </>;
}

function LeadTable({ compact = false, onSelect }: { compact?: boolean; onSelect?: (lead: Lead) => void }) {
  const rows = compact ? leads : [...leads, { id: "LD-1018", business: "Morrow Legal", niche: "Boutique law firm", location: "Boston, MA", score: 76, stage: "Contacted" as Stage, contact: "No contact", lastTouch: "5d ago", value: 3200, initials: "ML" }];
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>Business</th><th>Stage</th><th>Score</th><th>Contact</th><th>Last touch</th><th className="align-right">Value</th><th aria-label="Actions" /></tr></thead><tbody>{rows.map((lead) => <tr key={lead.id} onClick={() => onSelect?.(lead)}><td><div className="lead-cell"><span className="lead-avatar">{lead.initials}</span><span><strong>{lead.business}</strong><small>{lead.niche} · {lead.location}</small></span></div></td><td><StatusBadge stage={lead.stage} /></td><td><span className="score"><span className={cn("score-dot", lead.score > 90 ? "score-hot" : "score-warm")} />{lead.score}</span></td><td>{lead.contact}</td><td className="muted-text">{lead.lastTouch}</td><td className="align-right mono">{formatCurrency(lead.value)}</td><td className="align-right"><button className="row-action" onClick={(event) => { event.stopPropagation(); toast("Lead actions opened"); }}><MoreHorizontal size={16} /></button></td></tr>)}</tbody></table></div>;
}

function AddLeads() {
  const [tab, setTab] = useState("Single");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const tabs = ["Single", "Paste links", "Paste Maps details"];
  const submit = (event: React.FormEvent) => { event.preventDefault(); setSubmitted(true); toast.success(tab === "Single" ? "Lead added to New" : "Leads queued for enrichment"); };
  return <><PageHeader eyebrow="Lead intake" title="Add leads" description="Bring in a lead manually or queue a larger import." action={<span className="saved-indicator"><span className="live-dot" />Autosaved</span>} /><div className="tabs-line">{tabs.map((item) => <button key={item} className={cn("tab-button", tab === item && "tab-active")} onClick={() => { setTab(item); setSubmitted(false); }}>{item}</button>)}</div><div className="split-layout"><form className="form-section" onSubmit={submit}><div className="form-block"><div className="form-label">{tab === "Single" ? "Business details" : "Source input"}</div>{tab === "Single" ? <><label>Business name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Northline Architecture" required /></label><div className="form-row"><label>Website<input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="northline.co" /></label><label>Location<input placeholder="City, state" /></label></div><div className="form-row"><label>Contact name<input placeholder="Optional" /></label><label>Contact email<input type="email" placeholder="name@company.com" /></label></div></> : <label>{tab === "Paste links" ? "Website links" : "Google Maps details"}<textarea value={url} onChange={(event) => setUrl(event.target.value)} placeholder={tab === "Paste links" ? "Paste one URL per line" : "Paste copied Maps results here"} rows={7} required /></label>}<label>Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Context for the next step" rows={4} /></label></div><div className="form-footer"><button type="button" className="button secondary" onClick={() => { setName(""); setUrl(""); setNotes(""); setSubmitted(false); }}>Clear</button><button type="submit" className="button primary"><Plus size={15} /> {tab === "Single" ? "Add lead" : "Queue import"}</button></div>{submitted && <div className="inline-success"><Check size={15} /> {tab === "Single" ? `${name || "Lead"} is now in New.` : "Import queued. Enrichment will begin shortly."}</div>}</form><aside className="helper-panel"><div className="helper-icon"><Target size={16} /></div><h2>{tab === "Single" ? "Keep the first pass light" : "Bulk intake without the noise"}</h2><p>{tab === "Single" ? "Add the minimum context needed to create a lead. Audit and enrichment can fill in the gaps later." : "Jarvis will normalize each source, remove duplicates, and keep the original input for audit."}</p><div className="helper-list"><div><Check size={14} /> One record per line</div><div><Check size={14} /> Original source retained</div><div><Check size={14} /> Review before outreach</div></div><div className="helper-note"><CircleHelp size={14} /><span>Imports do not send outreach automatically.</span></div></aside></div></>;
}

function PipelineView() {
  const [selected, setSelected] = useState<Lead | null>(null);
  const [view, setView] = useState<"board" | "table">("board");
  const [filter, setFilter] = useState("All leads");
  return <><PageHeader eyebrow="Workspace" title="Pipeline" description="Move work forward with a clear view of every opportunity." action={<><button className="button secondary" onClick={() => toast("Filters saved")}>Save view</button><button className="button primary" onClick={() => toast("Lead intake opened")}><Plus size={15} /> Add lead</button></>} /><div className="toolbar"><div className="toolbar-left"><button className="filter-button"><Filter size={14} /> {filter}<ChevronDown size={13} /></button><button className="filter-button"><ListFilter size={14} /> Score: any</button><span className="toolbar-count">64 leads</span></div><div className="view-toggle"><button className={cn(view === "board" && "view-active")} onClick={() => setView("board")}><KanbanSquare size={14} /> Board</button><button className={cn(view === "table" && "view-active")} onClick={() => setView("table")}><ListFilter size={14} /> Table</button></div></div>{view === "board" ? <div className="kanban-board">{stages.map((stage) => <div className="kanban-column" key={stage}><div className="kanban-header"><span><span className={cn("legend-dot", `dot-${stageTone(stage)}`)} />{stage}</span><span className="column-count">{pipeline[stage].length}</span></div><div className="kanban-cards">{pipeline[stage].map((lead) => <button className="lead-card" key={lead.id} onClick={() => setSelected(lead)}><div className="lead-card-top"><span className="mono lead-id">{lead.id}</span><MoreHorizontal size={15} className="muted-icon" /></div><strong>{lead.business}</strong><span className="lead-card-meta">{lead.niche}</span><div className="lead-card-footer"><span className="score"><span className={cn("score-dot", lead.score > 90 ? "score-hot" : "score-warm")} />{lead.score}</span><span className="mono">{formatCurrency(lead.value)}</span></div></button>)}{pipeline[stage].length === 0 && <div className="column-empty">No leads in this stage.</div>}</div><button className="column-add" onClick={() => toast(`Add a lead to ${stage}`)}><Plus size={14} /> Add lead</button></div>)}</div> : <section className="panel table-panel"><LeadTable onSelect={setSelected} /></section>}{selected && <LeadDrawer lead={selected} onClose={() => setSelected(null)} />}</>;
}

function LeadDrawer({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [tab, setTab] = useState("Overview");
  const tabs = ["Overview", "Audit", "Outreach", "Demo", "Proposal", "Activity"];
  const copyText = tab === "Overview" ? `${lead.business} · ${lead.niche}\n${lead.location}\nScore ${lead.score}/100` : `Prepared ${tab.toLowerCase()} workspace for ${lead.business}.`;
  return <div className="drawer-overlay" onMouseDown={onClose}><aside className="lead-drawer" onMouseDown={(event) => event.stopPropagation()}><div className="drawer-header"><div><div className="eyebrow">{lead.id}</div><h2>{lead.business}</h2><p>{lead.niche} · {lead.location}</p></div><div className="drawer-actions"><StatusBadge stage={lead.stage} /><button className="icon-button" onClick={onClose}><X size={17} /></button></div></div><div className="drawer-tabs">{tabs.map((item) => <button key={item} className={cn(tab === item && "drawer-tab-active")} onClick={() => setTab(item)}>{item}</button>)}</div><div className="drawer-body">{tab === "Overview" ? <><div className="drawer-grid"><div><span className="micro-label">Fit score</span><strong className="drawer-score">{lead.score}<small>/100</small></strong></div><div><span className="micro-label">Potential value</span><strong className="drawer-stat mono">{formatCurrency(lead.value)}</strong></div><div><span className="micro-label">Last touch</span><strong className="drawer-stat">{lead.lastTouch}</strong></div><div><span className="micro-label">Contact</span><strong className="drawer-stat">{lead.contact}</strong></div></div><div className="detail-divider" /><div className="drawer-section"><div className="drawer-section-head"><h3>Working notes</h3><button className="text-button" onClick={() => toast("Notes copied")}> <Copy size={13} /> Copy</button></div><textarea defaultValue={`Strong fit for a focused conversion site. Existing presence is fragmented across directories.\n\nNext step: send the audit summary and ask for a 20-minute review.`} rows={7} /></div><div className="drawer-section"><div className="drawer-section-head"><h3>Contact details</h3><button className="text-button" onClick={() => toast("Contact details copied")}><Copy size={13} /> Copy</button></div><div className="contact-detail"><span className="profile-avatar">{lead.initials}</span><span><strong>{lead.contact}</strong><small>{lead.contact === "No contact" ? "Add a contact to unlock outreach" : "Primary decision maker"}</small></span></div></div></> : <div className="drawer-empty"><div className="helper-icon"><FileCode2 size={16} /></div><h3>{tab} workspace</h3><p>Use this space to review and refine the {tab.toLowerCase()} for this lead.</p><button className="button secondary" onClick={() => toast(`${tab} copied to clipboard`)}><Copy size={14} /> Copy draft</button></div>}</div><div className="drawer-footer"><button className="button secondary" onClick={() => toast("More lead actions opened")}><MoreHorizontal size={15} /> More</button><button className="button primary" onClick={() => { toast(`${lead.business} moved to the next stage`); onClose(); }}>Move to next stage <ChevronRight size={15} /></button></div></aside></div>;
}

function AITools() {
  const [running, setRunning] = useState<string | null>(null);
  const operations = [
    { title: "Website audit", description: "Review structure, clarity, and conversion friction.", count: "8 pending", last: "12 min ago", icon: Gauge },
    { title: "Enrich leads", description: "Fill gaps in business, contact, and market context.", count: "14 pending", last: "Yesterday", icon: Sparkles },
    { title: "Draft outreach", description: "Create a concise first message for qualified leads.", count: "6 pending", last: "3h ago", icon: Send },
    { title: "Generate proposal", description: "Turn a scoped opportunity into a reviewable proposal.", count: "2 pending", last: "2d ago", icon: FileText },
  ];
  const run = (title: string) => { setRunning(title); setTimeout(() => { setRunning(null); toast.success(`${title} completed`); }, 1200); };
  return <><PageHeader eyebrow="Operations" title="AI tools" description="Run focused operations across the workspace. Results remain reviewable." /><div className="tools-grid">{operations.map((operation) => { const Icon = operation.icon; const active = running === operation.title; return <div className="tool-card" key={operation.title}><div className="tool-card-top"><div className="tool-icon"><Icon size={17} /></div><span className="tool-status">Ready</span></div><h2>{operation.title}</h2><p>{operation.description}</p><div className="tool-meta"><span>{operation.count}</span><span>Last run {operation.last}</span></div>{active ? <div className="progress-row"><span className="progress-track"><span /></span><span className="mono">1.2s</span></div> : <button className="button secondary tool-run" onClick={() => run(operation.title)}>Run operation <ChevronRight size={14} /></button>}</div>; })}</div><div className="panel run-history"><div className="panel-header"><div><h2>Recent runs</h2><p>Execution history for the last seven days.</p></div><button className="text-button" onClick={() => toast("Run history opened")}>View logs <ChevronRight size={14} /></button></div><div className="run-row"><span className="activity-icon activity-green"><Check size={13} /></span><span><strong>Website audit · 18 records</strong><small>Completed by Gemini Flash · 12 min ago</small></span><span className="run-latency mono">08.4s</span><span className="badge badge-green">Success</span></div><div className="run-row"><span className="activity-icon activity-blue"><Sparkles size={13} /></span><span><strong>Enrich leads · 32 records</strong><small>Completed by Groq fallback · Yesterday</small></span><span className="run-latency mono">21.7s</span><span className="badge badge-green">Success</span></div></div></>;
}

function Revenue() {
  const invoices = [{ client: "Field & Form", status: "Paid", amount: 5200, date: "Sep 18, 2026" }, { client: "Lumen Objects", status: "Paid", amount: 7200, date: "Sep 12, 2026" }, { client: "Northline Architecture", status: "Outstanding", amount: 6800, date: "Due Sep 29, 2026" }, { client: "Good Day Dental", status: "Draft", amount: 3600, date: "Not sent" }];
  return <><PageHeader eyebrow="Operations" title="Revenue" description="Keep collected work and outstanding invoices in one place." action={<><button className="button secondary" onClick={() => toast("CSV export prepared")}>Export CSV</button><button className="button primary" onClick={() => toast("Invoice composer opened")}><Plus size={15} /> New invoice</button></>} /><div className="metric-grid revenue-metrics"><MetricCard label="Collected" value="$18,240" delta="9.2%" direction="up" note="this month" icon={Check} /><MetricCard label="Outstanding" value="$10,400" delta="2 invoices" direction="down" note="awaiting payment" icon={Clock3} /><MetricCard label="Clients" value="8" delta="1" direction="up" note="this quarter" icon={Users} /><MetricCard label="Avg. deal" value="$4,560" delta="6.8%" direction="up" note="vs. last quarter" icon={BriefcaseBusiness} /></div><section className="panel table-panel"><div className="panel-header"><div><h2>Invoices</h2><p>Every project, payment, and next action.</p></div><button className="filter-button"><Filter size={14} /> All statuses <ChevronDown size={13} /></button></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Client</th><th>Status</th><th>Amount</th><th>Due / paid date</th><th>Action</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.client}><td><strong>{invoice.client}</strong></td><td><span className={cn("badge", invoice.status === "Paid" ? "badge-green" : invoice.status === "Outstanding" ? "badge-amber" : "badge-neutral")}>{invoice.status}</span></td><td className="mono">{formatCurrency(invoice.amount)}</td><td className="muted-text">{invoice.date}</td><td><button className="text-button" onClick={() => toast(`${invoice.client} invoice opened`)}>Open <ChevronRight size={14} /></button></td></tr>)}</tbody></table></div></section></>;
}

function Logs() {
  const rows = [{ time: "09:42:18", operation: "Website audit", provider: "Google", model: "gemini-2.0-flash", latency: "08.4s", status: "Success" }, { time: "09:37:02", operation: "Enrich leads", provider: "Groq", model: "llama-3.3-70b", latency: "21.7s", status: "Success" }, { time: "08:51:44", operation: "Draft outreach", provider: "Google", model: "gemini-2.0-flash", latency: "05.1s", status: "Success" }, { time: "Yesterday", operation: "Generate proposal", provider: "Google", model: "gemini-2.0-flash", latency: "—", status: "Failed" }, { time: "Yesterday", operation: "Import leads", provider: "System", model: "—", latency: "01.2s", status: "Success" }];
  return <><PageHeader eyebrow="System" title="Logs" description="Trace every operation, provider response, and failure." /><div className="toolbar"><div className="toolbar-left"><div className="search-input"><Search size={14} /><input placeholder="Filter operations" /></div><button className="filter-button"><Filter size={14} /> Status: all <ChevronDown size={13} /></button><span className="toolbar-count">1,248 events</span></div><button className="button secondary" onClick={() => toast("Logs exported")}>Export logs</button></div><section className="panel table-panel"><div className="table-wrap"><table className="data-table logs-table"><thead><tr><th>Timestamp</th><th>Operation</th><th>Provider</th><th>Model</th><th>Latency</th><th>Status</th><th>Error</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.time}-${row.operation}`}><td className="mono muted-text">{row.time}</td><td><strong>{row.operation}</strong></td><td>{row.provider}</td><td className="mono muted-text">{row.model}</td><td className="mono">{row.latency}</td><td><span className={cn("badge", row.status === "Success" ? "badge-green" : "badge-red")}>{row.status}</span></td><td className="muted-text">{row.status === "Failed" ? "Provider timeout" : "—"}</td></tr>)}</tbody></table></div><div className="table-pagination"><span>Showing 1–5 of 1,248 events</span><div><button className="icon-button" disabled><ChevronRight size={14} className="rotate-180" /></button><button className="icon-button"><ChevronRight size={14} /></button></div></div></section></>;
}

function Settings() {
  const [saved, setSaved] = useState(false);
  return <><PageHeader eyebrow="System" title="Settings" description="Control models, preferences, and workspace data." action={saved ? <span className="saved-indicator"><Check size={14} />Saved</span> : undefined} /><div className="settings-layout"><div className="settings-nav"><button className="settings-nav-active">General</button><button onClick={() => toast("API keys section selected")}>API keys</button><button onClick={() => toast("Model settings selected")}>Model</button><button onClick={() => toast("Data settings selected")}>Data</button><button onClick={() => toast("Danger zone selected")} className="settings-danger">Danger zone</button></div><div className="settings-content"><SettingSection title="Preferences" description="Small defaults that keep the workspace focused."><div className="setting-row"><div><strong>Default pipeline view</strong><span>Choose what opens when Pipeline is selected.</span></div><select defaultValue="Board"><option>Board</option><option>Table</option></select></div><div className="setting-row"><div><strong>Timezone</strong><span>Used for activity and reminders.</span></div><select defaultValue="Pacific Time"><option>Pacific Time</option><option>Eastern Time</option><option>UTC</option></select></div></SettingSection><SettingSection title="API keys" description="Keys are encrypted and only shown once. Replace access without leaving the page."><div className="key-row"><div><KeyRound size={16} /><span><strong>Google Gemini</strong><small className="mono">••••••••••••7K2P</small></span></div><button className="text-button" onClick={() => toast("Gemini key replacement opened")}>Replace</button></div><div className="key-row"><div><KeyRound size={16} /><span><strong>Groq fallback</strong><small className="mono">••••••••••••91AV</small></span></div><button className="text-button" onClick={() => toast("Groq key replacement opened")}>Replace</button></div></SettingSection><SettingSection title="Data" description="Keep a clean export of the workspace or remove data that is no longer needed."><div className="setting-row"><div><strong>Workspace export</strong><span>Leads, activity, settings, and operation logs.</span></div><button className="button secondary" onClick={() => toast("Workspace export prepared")}>Export data</button></div></SettingSection><SettingSection title="Danger zone" description="Actions in this section cannot be undone."><div className="danger-row"><div><strong>Delete workspace data</strong><span>Remove all leads, activity, and generated outputs.</span></div><button className="button destructive" onClick={() => toast("Deletion is disabled in this preview")}>Delete data</button></div></SettingSection><div className="settings-footer"><button className="button primary" onClick={() => { setSaved(true); toast.success("Settings saved"); }}>Save changes</button></div></div></div></>;
}

function SettingSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="settings-section"><div className="settings-section-head"><h2>{title}</h2><p>{description}</p></div>{children}</section>; }

export default function Home() {
  const [location] = useLocation();
  const [light, setLight] = useState(false);
  const page = useMemo(() => {
    switch (location) {
      case "/add-leads": return <AddLeads />;
      case "/pipeline": return <PipelineView />;
      case "/ai-tools": return <AITools />;
      case "/revenue": return <Revenue />;
      case "/logs": return <Logs />;
      case "/settings": return <Settings />;
      default: return <Dashboard />;
    }
  }, [location]);
  return <Shell light={light} onThemeToggle={() => { setLight((value) => !value); document.documentElement.classList.toggle("light"); }}>{page}</Shell>;
}

export { StatusBadge, MetricCard, SettingSection };

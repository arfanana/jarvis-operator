export default function DesignSystemPage() {
  const sec = "rounded border border-border bg-panel p-3";
  return (
    <div className="space-y-3">
      <h1 className="text-base font-bold">Design System <span className="text-xs font-normal text-muted">usage notes inline</span></h1>
      <div className={sec}><h2 className="text-xs font-semibold">Buttons</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium">Primary (send/save)</button>
          <button className="rounded bg-sky-700 px-3 py-1.5 text-xs font-medium">Secondary (scan/generate)</button>
          <button className="rounded border border-border px-3 py-1.5 text-xs">Ghost (snooze/view)</button>
          <button className="rounded border border-red-800 px-3 py-1.5 text-xs text-red-300">Danger</button>
        </div>
        <p className="mt-1 text-2xs text-muted">Use: primary max once per row; ghost for utility actions.</p></div>
      <div className={sec}><h2 className="text-xs font-semibold">Badges / statuses</h2>
        <div className="mt-2 flex flex-wrap gap-1.5 text-2xs">
          {["new", "contacted", "replied", "proposal", "won", "lost"].map((s) => <span key={s} className="rounded bg-white/10 px-1.5 py-0.5">{s}</span>)}
          <span className="rounded bg-emerald-900 px-1.5 py-0.5 text-emerald-300">ok</span>
          <span className="rounded bg-amber-900 px-1.5 py-0.5 text-amber-300">warn / aging</span>
          <span className="rounded bg-red-900 px-1.5 py-0.5 text-red-300">error</span>
        </div>
        <p className="mt-1 text-2xs text-muted">Use: status pills in tables; level badges in logs.</p></div>
      <div className={sec}><h2 className="text-xs font-semibold">Stat cards</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <div className="rounded border border-border bg-base p-3"><p className="text-2xs uppercase text-muted">Pipeline</p><p className="text-xl font-bold">₹25.1L</p></div>
          <div className="rounded border border-border bg-base p-3"><p className="text-2xs uppercase text-muted">Win rate</p><p className="text-xl font-bold">38%</p></div>
          <div className="rounded border border-border bg-base p-3"><p className="text-2xs uppercase text-muted">Forecast</p><p className="text-xl font-bold text-emerald-400">₹3.6L</p></div>
        </div></div>
      <div className={sec}><h2 className="text-xs font-semibold">Table (dense-table)</h2>
        <table className="dense-table mt-2 w-full"><thead><tr><th>Col A</th><th>Col B</th><th>Col C</th></tr></thead>
          <tbody><tr><td>Row 1</td><td className="text-muted">meta</td><td>12</td></tr><tr><td>Row 2</td><td className="text-muted">meta</td><td>34</td></tr></tbody></table>
        <p className="mt-1 text-2xs text-muted">Use: 11px uppercase headers, 12.5px rows, hover bg #141417.</p></div>
      <div className={sec}><h2 className="text-xs font-semibold">Progress</h2>
        <div className="mt-2 h-1.5 rounded bg-white/10"><div className="h-1.5 rounded bg-emerald-500" style={{ width: "42%" }} /></div>
        <p className="mt-1 text-2xs text-muted">Use: emerald fill for targets; sky for funnel volume.</p></div>
      <div className={sec}><h2 className="text-xs font-semibold">Tooltip</h2>
        <p className="mt-1 text-xs"><span title="Native title tooltip — zero JS, used for score breakdowns" className="cursor-help underline decoration-dotted">Hover me (score: 88)</span></p>
        <p className="mt-1 text-2xs text-muted">Use: native title attr on dense cells; Radix tooltip only if rich content needed.</p></div>
      <div className={sec}><h2 className="text-xs font-semibold">Status colors</h2>
        <p className="mt-1 text-2xs text-muted">emerald = success/sent · sky = info/volume · amber = aging/warn · red = error/danger · zinc = neutral. No gradients anywhere.</p></div>
    </div>
  );
}

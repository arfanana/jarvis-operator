// Demo-site content pipeline: AI produces STRICT JSON, our renderer turns it
// into restrained, professional multi-page sites. The model never writes HTML,
// which is what keeps AI-slop (gradients, emojis, lorem, buzzwords) out.

export interface DemoService { name: string; desc: string; price?: string; }
export interface DemoTestimonial { name: string; text: string; rating: number; }
export interface DemoFaq { q: string; a: string; }

export interface DemoSiteContent {
  business: string;
  tagline: string;
  intro: string;
  phone: string;
  address: string;
  hours: { days: string; time: string }[];
  areas: string[];
  services: DemoService[];
  testimonials: DemoTestimonial[];
  faqs: DemoFaq[];
  about: string;
}

const BUZZ = ["cutting-edge", "state-of-the-art", "revolutionize", "seamless", "delve", "tapestry", "nestled", "bustling", "vibrant", "testament", "moreover", "furthermore"];

/** Strict JSON-only prompt for the AI op. Grounded in known facts, placeholders labeled. */
export function demoContentPrompt(lead: Record<string, unknown>, category: string): string {
  const facts = `Business: ${lead.name ?? "—"} | Category: ${category || lead.category || "local business"} | City: ${lead.city ?? "—"} | Phone: ${lead.phone ?? "unknown"} | Rating: ${lead.rating ?? "unknown"} (${lead.reviewCount ?? 0} reviews) | Website: ${lead.website ?? "none"}.`;
  return `Write website copy for a small local business as STRICT JSON only (no markdown fences, no commentary) with exactly these keys:
{"business": string, "tagline": string (under 60 chars, concrete, no hype), "intro": string (2 plain sentences), "phone": string (use given phone or "" ), "address": string (use "${lead.city ?? "city"}" if unknown, never invent a street), "hours": [{"days": string, "time": string}] (4 rows max), "areas": string[] (3 nearby areas max, plain names), "services": [{"name": string, "desc": string (one plain sentence), "price": string (e.g. "₹500 onwards" or "")}] (4-6 items), "testimonials": [{"name": string (Indian first name + initial), "text": string (one specific sentence), "rating": 4|5}] (3 items, clearly sample voices), "faqs": [{"q": string, "a": string (one sentence)}] (4 items), "about": string (2 plain sentences)}.
RULES: plain words a shop owner would use. No emojis. No exclamation marks. No superlatives ("best", "#1", "finest"). No invented street addresses, prices you cannot know (use "Ask for price" when unsure), or fake awards. Distinguish fact from sample content.
Facts: ${facts}`;
}

function stripEmojis(s: string): string {
  // Surrogate-pair ranges: no ES2015+ `u` flag needed.
  return s.replace(/([\uD800-\uDBFF][\uDC00-\uDFFF])|[\u2600-\u27BF\u2B00-\u2BFF\uFE0F]/g, "");
}

function cleanLine(s: unknown, max: number, fallback = ""): string {
  let t = typeof s === "string" ? s : fallback;
  t = stripEmojis(t).replace(/\s+/g, " ").trim();
  t = t.replace(/!+/g, "").replace(/\s{2,}/g, " ").trim();
  t = t.replace(/lorem ipsum[^.]*\.?/gi, "").trim();
  for (const b of BUZZ) t = t.replace(new RegExp(b, "gi"), "").replace(/\s{2,}/g, " ").trim();
  if (t.length > max) t = t.slice(0, max - 1).trim() + "…";
  return t || fallback;
}

/** Parse + sanitize AI JSON into safe content. Never throws. */
export function parseDemoContent(text: string, fallback: DemoSiteContent): DemoSiteContent {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return fallback;
    const raw = JSON.parse(m[0]) as Partial<DemoSiteContent>;
    const pick = <T,>(v: unknown, d: T): T => (v === undefined || v === null ? d : (v as T));
    const services: DemoService[] = Array.isArray(raw.services)
      ? raw.services.slice(0, 6).map((s) => ({
          name: cleanLine((s as DemoService)?.name, 60, "Service"),
          desc: cleanLine((s as DemoService)?.desc, 160, "Ask us for details."),
          price: cleanLine((s as DemoService)?.price, 30),
        }))
      : fallback.services;
    const testimonials: DemoTestimonial[] = Array.isArray(raw.testimonials)
      ? raw.testimonials.slice(0, 4).map((t) => ({
          name: cleanLine((t as DemoTestimonial)?.name, 40, "Customer"),
          text: cleanLine((t as DemoTestimonial)?.text, 220, "Good experience overall."),
          rating: (t as DemoTestimonial)?.rating === 4 ? 4 : 5,
        }))
      : fallback.testimonials;
    const faqs: DemoFaq[] = Array.isArray(raw.faqs)
      ? raw.faqs.slice(0, 6).map((f) => ({
          q: cleanLine((f as DemoFaq)?.q, 120, "Common question"),
          a: cleanLine((f as DemoFaq)?.a, 240, "Please call us and we will explain."),
        }))
      : fallback.faqs;
    return {
      business: cleanLine(raw.business, 60, fallback.business),
      tagline: cleanLine(raw.tagline, 80, fallback.tagline),
      intro: cleanLine(raw.intro, 300, fallback.intro),
      phone: cleanLine(raw.phone, 30, fallback.phone),
      address: cleanLine(raw.address, 120, fallback.address),
      hours: Array.isArray(raw.hours) && raw.hours.length
        ? raw.hours.slice(0, 5).map((h) => ({ days: cleanLine((h as { days: string })?.days, 30, "Mon–Sat"), time: cleanLine((h as { time: string })?.time, 30, "10am–8pm") }))
        : fallback.hours,
      areas: Array.isArray(raw.areas) ? raw.areas.slice(0, 5).map((a) => cleanLine(a, 40)).filter(Boolean) : fallback.areas,
      services: services.length ? services : fallback.services,
      testimonials: testimonials.length ? testimonials : fallback.testimonials,
      faqs: faqs.length ? faqs : fallback.faqs,
      about: cleanLine(raw.about, 400, fallback.about),
    };
  } catch {
    return fallback;
  }
}

export function defaultDemoContent(business: string, city: string, phone: string, category: string): DemoSiteContent {
  return {
    business, tagline: `${category} in ${city} — walk in or call ahead.`,
    intro: `We serve customers across ${city} with straightforward pricing and no waiting games. Call or message us and we will give you a time slot the same day when possible.`,
    phone, address: `${city}`,
    hours: [{ days: "Mon–Sat", time: "10:00am–8:00pm" }, { days: "Sunday", time: "11:00am–2:00pm" }],
    areas: [city],
    services: [
      { name: "Consultation", desc: "Tell us what you need; we suggest the right option and a clear price.", price: "Free" },
      { name: "Standard service", desc: "Our most-booked option, done while you wait in most cases.", price: "Ask for price" },
      { name: "Follow-up visit", desc: "We check the work holds up and fix anything that does not.", price: "Ask for price" },
    ],
    testimonials: [{ name: "Ravi K.", text: "Work finished on the same day and the price matched the estimate.", rating: 5 }],
    faqs: [
      { q: "Do I need an appointment?", a: "Walk-ins are welcome; calling ahead gets you a fixed slot." },
      { q: "How do I pay?", a: "Cash, cards and UPI are all accepted." },
    ],
    about: `${business} is a neighbourhood ${category.toLowerCase()} serving ${city}. Sample text — replace with the owner's story before publishing.`,
  };
}

// ---------- Renderer: restrained, professional, multi-page ----------

export type DemoHeadingFont = "serif" | "sans";
export type DemoBodyFont = "sans" | "serif";

export interface DemoTheme {
  accent: string;
  headingFont: DemoHeadingFont;
  bodyFont: DemoBodyFont;
  baseSize: number;
  radius: number;
}

export const DEFAULT_DEMO_THEME: DemoTheme = {
  accent: "#0C3B38",
  headingFont: "serif",
  bodyFont: "sans",
  baseSize: 16,
  radius: 10,
};

export const DEMO_ACCENTS = ["#0C3B38", "#1D4ED8", "#9A3412", "#6D28D9", "#0F766E", "#334155"];

const HEADING_STACKS: Record<DemoHeadingFont, string> = {
  serif: 'Georgia,"Times New Roman",serif',
  sans: '-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
};
const BODY_STACKS: Record<DemoBodyFont, string> = {
  sans: '-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
  serif: 'Georgia,"Times New Roman",serif',
};

export function sanitizeTheme(t: Partial<DemoTheme>): DemoTheme {
  return {
    accent: /^#[0-9a-fA-F]{6}$/.test(t.accent ?? "") ? (t.accent as string) : DEFAULT_DEMO_THEME.accent,
    headingFont: t.headingFont === "sans" ? "sans" : "serif",
    bodyFont: t.bodyFont === "serif" ? "serif" : "sans",
    baseSize: Math.min(19, Math.max(14, Math.round(t.baseSize ?? DEFAULT_DEMO_THEME.baseSize))),
    radius: Math.min(16, Math.max(0, Math.round(t.radius ?? DEFAULT_DEMO_THEME.radius))),
  };
}

/** Real Tooth Medic flagship content, reusable as a starting template for other demos. */
export function toothMedicSiteContent(): DemoSiteContent {
  return {
    business: "Tooth Medic Family Dental Care",
    tagline: "Modern dental care, designed around your smile.",
    intro:
      "From clear aligners and implants to gentle first visits for children, Tooth Medic covers the treatments families in Musheerabad actually ask for — explained plainly, priced before anything begins.",
    phone: "+91 70752 29333",
    address: "Musheerabad, Hyderabad, Telangana",
    hours: [{ days: "Hours vary", time: "Call ahead to confirm" }],
    areas: ["Musheerabad", "Hyderabad"],
    services: [
      { name: "Laser & Implants", desc: "Replacement options for missing teeth, including implant dentistry.", price: "" },
      { name: "Invisalign", desc: "Clear aligners planned around your smile and bite.", price: "" },
      { name: "Kids Dental", desc: "Unhurried first visits and routine care for children.", price: "" },
      { name: "Airway Dentistry", desc: "Dental assessment with breathing and sleep in mind.", price: "" },
      { name: "Myofunctional Therapy", desc: "Guided exercises supporting tongue posture and oral habits.", price: "" },
      { name: "Smile Design", desc: "A planned approach to the shape, shade and alignment of your smile.", price: "" },
    ],
    testimonials: [],
    faqs: [
      { q: "Do I need an appointment, or can I walk in?", a: "Appointments keep waiting times short. Call or message on WhatsApp to book; walk-in availability depends on the day's schedule." },
      { q: "What happens at a first consultation?", a: "An examination, a discussion of your concerns, and treatment options with next steps. Nothing proceeds without your agreement." },
      { q: "Do you treat children?", a: "Yes. First visits are kept short and pressure-free so children get comfortable with the clinic." },
      { q: "How do I know if Invisalign suits me?", a: "Suitability depends on your bite and treatment goals, which is exactly what the assessment appointment determines." },
      { q: "How do I reach the clinic?", a: "The clinic is in Musheerabad, Hyderabad. Use the Get Directions button for the map, or call +91 70752 29333." },
    ],
    about:
      "Tooth Medic Family Dental Care is a neighbourhood practice in Musheerabad, Hyderabad — set up so children, parents and grandparents can all be seen in one place.",
  };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const ICONS = {
  phone: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
  pin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
};

function shell(c: DemoSiteContent, t: DemoTheme, page: "home" | "services" | "reviews" | "contact", title: string, body: string): string {
  const tel = c.phone.replace(/\D/g, "");
  const wa = tel ? `https://wa.me/${tel}` : "#contact";
  const nav = (href: string, label: string, key: string) =>
    `<a href="${href}"${page === (key as typeof page) ? ' aria-current="page" class="active"' : ""}>${label}</a>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — ${esc(c.business)}</title>
<meta name="description" content="${esc(c.tagline)}">
<style>
:root{--accent:${t.accent};--ink:#1a1a1a;--muted:#5b5b5b;--line:#e2e2e2;--bg:#ffffff;--soft:#f6f6f4;--radius:${t.radius}px;--hfont:${HEADING_STACKS[t.headingFont]};--bfont:${BODY_STACKS[t.bodyFont]}}
*{box-sizing:border-box}body{margin:0;font-family:var(--bfont);font-size:${t.baseSize}px;color:var(--ink);background:var(--bg);line-height:1.6}
h1,h2,h3,.brand-name{font-family:var(--hfont)}
.wrap{max-width:1020px;margin:0 auto;padding:0 22px}
.eyebrow{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:10px}
.strip{background:#1c1b1a;color:#cfcdc8;font-size:13px}
.strip .wrap{display:flex;gap:18px;flex-wrap:wrap;padding-top:8px;padding-bottom:8px}
.strip span{display:inline-flex;align-items:center;gap:6px}
.strip a{color:#fff;text-decoration:none}
header.top{border-bottom:1px solid var(--line);background:#fff;position:sticky;top:0;z-index:10}
.top-inner{display:flex;align-items:center;gap:14px;padding:14px 22px;max-width:1020px;margin:0 auto;position:relative}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);margin-right:auto}
.brand-mark{width:34px;height:34px;border-radius:8px;background:var(--accent);color:#fff;display:grid;place-items:center;font-weight:800;font-size:17px}
.brand-name{font-weight:700;font-size:17px;line-height:1.2}
.brand-sub{font-size:12px;color:var(--muted);font-weight:400}
nav.links{display:flex;gap:4px}
nav.links a{text-decoration:none;color:var(--muted);font-size:14px;padding:8px 12px;border-radius:6px}
nav.links a:hover{color:var(--ink);background:var(--soft)}
nav.links a.active{color:var(--ink);font-weight:600}
.btn{display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:#fff;text-decoration:none;font-weight:650;font-size:14.5px;padding:12px 20px;border-radius:var(--radius);border:0;cursor:pointer;transition:filter .15s}
.btn:hover{filter:brightness(.94)}
.btn.ghost{background:#fff;color:var(--ink);border:1px solid var(--line)}
.btn.ghost:hover{background:var(--soft)}
.btn:focus-visible,a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.menu-btn{display:none;background:none;border:1px solid var(--line);border-radius:6px;padding:8px 12px;font-size:14px;cursor:pointer}
.hero{background:var(--soft);border-bottom:1px solid var(--line);padding:56px 0 48px}
.hero-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:32px;align-items:start}
.hero h1{font-size:38px;line-height:1.2;margin:0 0 12px;letter-spacing:-.01em}
.hero p.lede{color:var(--muted);font-size:17.5px;margin:0 0 22px;max-width:560px}
.row{display:flex;gap:10px;flex-wrap:wrap}
.ticks{display:flex;gap:18px;flex-wrap:wrap;margin:22px 0 0;padding:0;list-style:none}
.ticks li{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--muted)}
.ticks svg{color:var(--accent);flex-shrink:0}
.book-card{background:#fff;border:1px solid var(--line);border-radius:calc(var(--radius) + 2px);padding:24px;box-shadow:0 8px 24px rgba(0,0,0,.07)}
.book-card h2{font-size:19px;margin:0 0 4px}
.book-card .big-phone{font-size:24px;font-weight:800;text-decoration:none;color:var(--ink)}
.book-card .big-phone:hover{color:var(--accent)}
section.block{padding:44px 0}
section.alt{background:var(--soft);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
h2.sec{font-size:24px;margin:0 0 6px;letter-spacing:-.01em}
.sub{color:var(--muted);font-size:15px;margin:0 0 22px;max-width:640px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px}
.card{border:1px solid var(--line);border-radius:var(--radius);padding:20px;background:#fff;transition:box-shadow .15s,transform .15s}
a.card{text-decoration:none;color:inherit;display:block}
a.card:hover{box-shadow:0 8px 22px rgba(0,0,0,.08);transform:translateY(-2px)}
.card h3{margin:0 0 6px;font-size:16.5px}
.card p{margin:0 0 10px;color:var(--muted);font-size:14.5px}
.price{font-weight:750;font-size:15.5px;color:var(--ink)}
.meta{display:flex;gap:16px;flex-wrap:wrap;color:var(--muted);font-size:14px}
.meta span{display:inline-flex;align-items:center;gap:6px}
table.hours{border-collapse:collapse;width:100%;max-width:420px;font-size:14px}
table.hours td{border-bottom:1px solid var(--line);padding:8px 4px}
table.hours td:last-child{text-align:right;font-weight:600}
details{border:1px solid var(--line);border-radius:var(--radius);padding:12px 16px;margin-bottom:10px;background:#fff}
summary{cursor:pointer;font-weight:600;font-size:15px}
.stars{color:#a57600;letter-spacing:2px;font-size:14px}
.t-name{font-weight:650;font-size:14px;margin-top:10px}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.step{border:1px solid var(--line);border-radius:var(--radius);padding:20px;background:#fff}
.step-num{width:32px;height:32px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font-weight:700;font-size:15px;margin-bottom:10px}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chip{border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 15px;font-size:13.5px;color:var(--muted)}
.cta-band{background:var(--accent);color:#fff;padding:42px 0}
.cta-band h2{margin:0 0 8px;font-size:24px}
.cta-band p{margin:0 0 18px;opacity:.92}
.cta-band .btn{background:#fff;color:var(--ink)}
.cta-band .btn.ghost{background:transparent;color:#fff;border-color:rgba(255,255,255,.6)}
form.book label{display:block;font-size:14px;font-weight:600;margin:13px 0 5px}
form.book input,form.book textarea,form.book select{width:100%;font:inherit;padding:11px 13px;border:1px solid var(--line);border-radius:calc(var(--radius) - 2px);background:#fff}
form.book .err{color:#b00020;font-size:13px;display:none}
form.book .ok{color:#1a7f37;font-size:13px;display:none}
.callbar{display:none}
footer{background:#1c1b1a;color:#b9b6b0;font-size:13.5px;padding:36px 0 90px}
footer .wrap{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:28px}
footer strong{color:#fff;font-size:15px}
footer a{color:#e8e6e1;text-decoration:none}
footer a:hover{text-decoration:underline}
.foot-note{border-top:1px solid #38362f;margin-top:24px;padding-top:16px;font-size:12.5px;color:#8a8781}
@media(max-width:720px){.hero-grid{grid-template-columns:1fr}.hero h1{font-size:29px}nav.links{display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border-bottom:1px solid var(--line);flex-direction:column;padding:8px 20px 16px}nav.links.open{display:flex}.menu-btn{display:block}footer .wrap{grid-template-columns:1fr}.callbar{display:flex;position:fixed;bottom:0;left:0;right:0;z-index:20}.callbar a{flex:1;text-align:center;padding:14px;text-decoration:none;font-weight:700;font-size:15px}.callbar .call{background:var(--accent);color:#fff}.callbar .wa{background:#1fa855;color:#fff}body{padding-bottom:52px}}
</style>
</head>
<body>
<div class="strip"><div class="wrap">
${c.hours[0] ? `<span>${ICONS.clock} Today: ${esc(c.hours[0].days)} ${esc(c.hours[0].time)}</span>` : ""}
${c.address ? `<span>${ICONS.pin} ${esc(c.address)}</span>` : ""}
${tel ? `<span style="margin-left:auto"><a href="tel:${tel}">${esc(c.phone)}</a></span>` : ""}
</div></div>
<header class="top"><div class="top-inner">
<a class="brand" href="index.html"><span class="brand-mark">${esc((c.business.trim()[0] ?? "B").toUpperCase())}</span><span><span class="brand-name">${esc(c.business)}</span><br><span class="brand-sub">${esc(c.areas[0] ?? "")}</span></span></a>
<button class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="mainNav">Menu</button>
<nav class="links" id="mainNav">${nav("index.html", "Home", "home")}${nav("services.html", "Services", "services")}${nav("reviews.html", "Reviews", "reviews")}${nav("contact.html", "Contact", "contact")}</nav>
${tel ? `<a class="btn" href="tel:${tel}">${ICONS.phone} ${esc(c.phone)}</a>` : ""}
</div></header>
${body}
<div class="callbar">${tel ? `<a class="call" href="tel:${tel}">Call now</a><a class="wa" href="${wa}?text=${encodeURIComponent("Hi " + c.business + ", I found your website and have a question.")}">WhatsApp</a>` : `<a class="call" href="contact.html">Contact us</a>`}</div>
<footer><div class="wrap">
<div><strong>${esc(c.business)}</strong><br>${esc(c.address)}${c.areas.length ? `<br>Serving: ${esc(c.areas.join(", "))}` : ""}<br>${tel ? `<a href="tel:${tel}">${esc(c.phone)}</a>` : ""}</div>
<div><strong>Hours</strong><br>${c.hours.map((h) => `${esc(h.days)}: ${esc(h.time)}`).join("<br>")}</div>
<div><strong>Pages</strong><br><a href="index.html">Home</a><br><a href="services.html">Services</a><br><a href="reviews.html">Reviews</a><br><a href="contact.html">Contact</a></div>
</div>
<div class="wrap"><p class="foot-note">Demo website with sample content — replace samples with real information before publishing.</p></div></footer>
<script>
(function(){var b=document.getElementById('menuBtn'),n=document.getElementById('mainNav');if(b&&n){b.addEventListener('click',function(){var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o?'true':'false');});}
var f=document.getElementById('bookForm');if(f){f.addEventListener('submit',function(ev){ev.preventDefault();var err=document.getElementById('formErr');var name=document.getElementById('fName').value.trim();var phone=document.getElementById('fPhone').value.trim();if(name.length<2||phone.replace(/\\D/g,'').length<8){if(err)err.style.display='block';return;}if(err)err.style.display='none';var msg='Hi ${c.business.replace(/'/g, "")}, I am '+name+'. '+document.getElementById('fService').value+' — please call me back at '+phone+'.';var ok=document.getElementById('formOk');${tel ? `window.open('${wa}?text='+encodeURIComponent(msg),'_blank');` : ""}if(ok)ok.style.display='block';f.reset();});}
var rot=document.getElementById('tRot');if(rot){var items=rot.querySelectorAll('.t-item'),i=0;if(items.length>1){setInterval(function(){items[i].style.display='none';i=(i+1)%items.length;items[i].style.display='block';},5000);}}
})();
</script>
</body>
</html>`;
}

function servicesList(c: DemoSiteContent, tel: string, detailed: boolean): string {
  return `<div class="grid">${c.services.map((s) => `<div class="card"><h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p>${s.price ? `<p class="price">${esc(s.price)}</p>` : ""}${detailed && tel ? `<a class="btn ghost" href="https://wa.me/${tel}?text=${encodeURIComponent(`Hi ${c.business}, I want to book: ${s.name}`)}">Book this</a>` : ""}</div>`).join("")}</div>`;
}

/** Render all pages. Returns filename → html. No gradients, no emojis, no lorem, no buzzwords. */
export function renderDemoSite(c: DemoSiteContent, theme: DemoTheme = DEFAULT_DEMO_THEME): Record<string, string> {
  const th = sanitizeTheme(theme);
  const tel = c.phone.replace(/\D/g, "");
  const home = shell(c, th, "home", "Home", `
<div class="hero"><div class="wrap hero-grid">
<div>
<span class="eyebrow">${esc(c.areas[0] ?? "Local business")}</span>
<h1>${esc(c.tagline)}</h1>
<p class="lede">${esc(c.intro)}</p>
<div class="row">${tel ? `<a class="btn" href="tel:${tel}">${ICONS.phone} Call ${esc(c.phone)}</a><a class="btn ghost" href="services.html">See services and prices</a>` : `<a class="btn" href="contact.html">Contact us</a>`}</div>
<ul class="ticks">
<li>${ICONS.check} Walk-ins welcome</li>
<li>${ICONS.check} Clear pricing before we start</li>
<li>${ICONS.check} Cash, cards and UPI accepted</li>
</ul>
</div>
<div class="book-card">
<h2>Visit or call</h2>
<p class="sub" style="margin-bottom:12px">No forms, no waiting list.</p>
${tel ? `<a class="big-phone" href="tel:${tel}">${esc(c.phone)}</a>` : ""}
<table class="hours" style="margin-top:12px">${c.hours.slice(0, 3).map((h) => `<tr><td>${esc(h.days)}</td><td>${esc(h.time)}</td></tr>`).join("")}</table>
<p class="meta" style="margin-top:12px"><span>${ICONS.pin} ${esc(c.address)}</span></p>
<div class="row" style="margin-top:14px"><a class="btn ghost" href="contact.html">Hours and directions</a></div>
</div>
</div></div>
<section class="block"><div class="wrap">
<span class="eyebrow">Services</span>
<h2 class="sec">What we do</h2><p class="sub">Fixed prices where possible. Everything else quoted before we start.</p>
${servicesList(c, tel, false)}
<div class="row" style="margin-top:18px"><a class="btn ghost" href="services.html">All services and prices</a></div>
</div></section>
<section class="block alt"><div class="wrap">
<span class="eyebrow">How it works</span>
<h2 class="sec">Three steps, no surprises</h2><p class="sub">The same process for every customer.</p>
<div class="steps">
<div class="step"><div class="step-num">1</div><h3 style="margin:0 0 6px;font-size:16px">Tell us what you need</h3><p style="margin:0;color:var(--muted);font-size:14.5px">Call, message, or walk in. We listen first.</p></div>
<div class="step"><div class="step-num">2</div><h3 style="margin:0 0 6px;font-size:16px">Agree a fixed price</h3><p style="margin:0;color:var(--muted);font-size:14.5px">You approve the price before any work starts.</p></div>
<div class="step"><div class="step-num">3</div><h3 style="margin:0 0 6px;font-size:16px">Done, then checked</h3><p style="margin:0;color:var(--muted);font-size:14.5px">We verify the work with you before you pay.</p></div>
</div>
</div></section>
<section class="block"><div class="wrap">
<span class="eyebrow">Customers</span>
<h2 class="sec">What people say</h2><p class="sub">Sample voices — replace with real reviews before publishing.</p>
<div id="tRot">${c.testimonials.map((t, i) => `<div class="t-item"${i ? ' style="display:none"' : ""}><p>"${esc(t.text)}"</p><p class="stars">${"★".repeat(t.rating)}${"☆".repeat(5 - t.rating)}</p><p class="t-name">${esc(t.name)}</p></div>`).join("")}</div>
<div class="row" style="margin-top:16px"><a class="btn ghost" href="reviews.html">Read all reviews</a></div>
</div></section>
${c.areas.length > 1 ? `<section class="block alt"><div class="wrap"><h2 class="sec">Areas served</h2><div class="chips">${c.areas.map((a) => `<span class="chip">${esc(a)}</span>`).join("")}</div></div></section>` : ""}
<div class="cta-band"><div class="wrap">
<h2>Need it done this week?</h2>
<p>Call during opening hours and we will give you a time slot.</p>
<div class="row">${tel ? `<a class="btn" href="tel:${tel}">${ICONS.phone} ${esc(c.phone)}</a>` : ""}<a class="btn ghost" href="contact.html">Contact page</a></div>
</div></div>`);

  const services = shell(c, th, "services", "Services", `
<section class="block"><div class="wrap">
<span class="eyebrow">Price list</span>
<h2 class="sec">Services and prices</h2><p class="sub">If a price is not listed, message us and we reply with a fixed quote before starting.</p>
${servicesList(c, tel, true)}
</div></section>
<div class="cta-band"><div class="wrap">
<h2>Not sure which one you need?</h2>
<p>Describe it on a call and we will point you to the right option.</p>
<div class="row">${tel ? `<a class="btn" href="tel:${tel}">${ICONS.phone} ${esc(c.phone)}</a>` : ""}<a class="btn ghost" href="contact.html">Request a callback</a></div>
</div></div>`);

  const avg = c.testimonials.length
    ? (c.testimonials.reduce((s, t) => s + t.rating, 0) / c.testimonials.length).toFixed(1)
    : "—";
  const reviews = shell(c, th, "reviews", "Reviews", `
<section class="block"><div class="wrap">
<span class="eyebrow">Reviews</span>
<h2 class="sec">What customers say</h2><p class="sub">Average ${avg} from ${c.testimonials.length} sample reviews. Replace with real Google reviews before publishing.</p>
<div class="bars">${[5, 4, 3, 2, 1].map((s) => {
    const n = c.testimonials.filter((t) => t.rating === s).length;
    const pct = c.testimonials.length ? Math.round((n / c.testimonials.length) * 100) : 0;
    return `<div class="bar-row"><span style="width:28px">${s}★</span><span class="bar"><i style="width:${pct}%"></i></span><span style="width:36px">${pct}%</span></div>`;
  }).join("")}</div>
${c.testimonials.map((t) => `<div class="card" style="margin-bottom:12px"><p>"${esc(t.text)}"</p><p class="stars">${"★".repeat(t.rating)}${"☆".repeat(5 - t.rating)}</p><p class="t-name">${esc(t.name)}</p></div>`).join("")}
</div></section>
<section class="block alt"><div class="wrap">
<h2 class="sec">Questions</h2>
${c.faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}
</div></section>`);

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.business + " " + c.address)}`;
  const contact = shell(c, th, "contact", "Contact", `
<section class="block"><div class="wrap">
<span class="eyebrow">Visit or call</span>
<h2 class="sec">Contact and hours</h2><p class="sub">Call, message, or drop by during opening hours.</p>
<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">
<div class="card"><h3>Reach us</h3>
<p class="meta"><span>${ICONS.phone} ${esc(c.phone || "Phone on request")}</span></p>
<p class="meta"><span>${ICONS.pin} ${esc(c.address)}</span></p>
<p><a class="btn ghost" href="${mapUrl}" target="_blank" rel="noreferrer">Open in Maps</a></p>
<h3 style="margin-top:16px">Hours</h3>
<table class="hours">${c.hours.map((h) => `<tr><td>${esc(h.days)}</td><td>${esc(h.time)}</td></tr>`).join("")}</table>
</div>
<div class="card"><h3>Request a callback</h3>
<form class="book" id="bookForm" novalidate>
<label for="fName">Your name</label><input id="fName" name="name" autocomplete="name" required>
<label for="fPhone">Phone number</label><input id="fPhone" name="phone" inputmode="tel" autocomplete="tel" required>
<label for="fService">What do you need?</label><select id="fService" name="service">${c.services.map((s) => `<option>${esc(s.name)}</option>`).join("")}<option>Something else</option></select>
<p class="err" id="formErr">Please add your name and a valid phone number.</p>
<p class="err" id="formOk" style="display:none;color:#1a7f37">Thanks — ${tel ? "opening WhatsApp to send your request." : "we will call you back."}</p>
<button class="btn" type="submit" style="margin-top:12px">${ICONS.check} Request callback</button>
</form></div>
</div>
</div></section>`);
  return { "index.html": home, "services.html": services, "reviews.html": reviews, "contact.html": contact };
}

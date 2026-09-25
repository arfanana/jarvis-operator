import { err } from "@/lib/server/errors";

// Real server-side business search provider abstraction.
// Controlled by BUSINESS_SEARCH_PROVIDER=google|demo|auto (default auto).
// Google Places API key (PLACES_API_KEY) NEVER leaves the server.

export interface BusinessResult {
  placeId?: string;
  name: string;
  category?: string;
  address?: string;
  city?: string;
  region?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  lat?: number;
  lng?: number;
  /** Straight-line distance from the searched center. Present when computable. */
  distanceKm?: number;
}

/** Haversine distance in km. Exported for tests. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)) * 10) / 10;
}

export interface BusinessSearchQuery {
  text: string;
  location?: string;
  radiusKm?: number;
  minRating?: number;
  minReviews?: number;
}

export interface BusinessSearchResponse {
  source: "live" | "demo";
  provider: string;
  results: BusinessResult[];
}

export interface BusinessSearchProvider {
  name: string;
  search(q: BusinessSearchQuery): Promise<BusinessResult[]>;
}

// ---------- Google Places (New API: Places API v1 text search) ----------

export class GooglePlacesProvider implements BusinessSearchProvider {
  name = "google-places";
  constructor(private apiKey: string) {}

  async search(q: BusinessSearchQuery): Promise<BusinessResult[]> {
    const body = {
      textQuery: [q.text, q.location].filter(Boolean).join(" in "),
      ...(q.minRating ? { minRating: q.minRating } : {}),
      ...(q.radiusKm ? { locationBias: undefined } : {}),
    };
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.primaryType,places.location",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 400) {
      const t = await res.text().catch(() => "");
      throw err("provider", "Business search rejected the query.", t.slice(0, 200));
    }
    if (res.status === 403) throw err("provider", "Business search API key invalid or Places API not enabled.");
    if (res.status === 429) throw err("rate_limited", "Business search provider rate limit hit. Try again shortly.");
    if (!res.ok) throw err("provider", `Business search failed (${res.status}).`);
    const j = (await res.json()) as {
      places?: {
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        internationalPhoneNumber?: string;
        websiteUri?: string;
        rating?: number;
        userRatingCount?: number;
        primaryType?: string;
        location?: { latitude?: number; longitude?: number };
      }[];
    };
    let out: BusinessResult[] = (j.places ?? []).map((p) => ({
      placeId: p.id,
      name: p.displayName?.text ?? "Unknown business",
      category: p.primaryType?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      address: p.formattedAddress,
      city: q.location,
      phone: p.internationalPhoneNumber,
      website: p.websiteUri,
      rating: p.rating,
      reviewCount: p.userRatingCount,
      lat: p.location?.latitude,
      lng: p.location?.longitude,
    }));
    if (q.minReviews) out = out.filter((r) => (r.reviewCount ?? 0) >= (q.minReviews ?? 0));
    return out;
  }
}

// ---------- Demo provider (deterministic, clearly labeled DEMO DATA) ----------

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export class DemoBusinessProvider implements BusinessSearchProvider {
  name = "demo";
  async search(q: BusinessSearchQuery): Promise<BusinessResult[]> {
    const t = q.text.replace(/\b\w/g, (c) => c.toUpperCase());
    const area = q.location ?? "Kukatpally";
    // Vary names per area so different searches look different; count scales with radius.
    const pool = [
      "Smile Care", "City Health", "Green Life", "Sunrise", "New Look", "Prime",
      "Royal", "Elite", "Care Plus", "True Value", "Urban", "Apex", "Nova", "Zenith",
      "First Choice", "Best Point", "Lotus", "Sharma", "Reddy", "Khan", "Patel", "Iyer",
    ];
    const kinds = [`${t} Clinic`, `${t} Center`, `${t} Studio`, `${t} Point`, `${t} House`, `${t} Hub`];
    const count = Math.min(30, Math.max(8, Math.round(6 + (q.radiusKm ?? 5) * 2)));
    const out: BusinessResult[] = [];
    for (let i = 0; i < count; i++) {
      const h = hash(`${area}|${q.text}|${i}`);
      const name = `${pool[h % pool.length]} ${kinds[(h >> 4) % kinds.length]}`;
      const rating = Math.round((3.4 + ((h >> 5) % 16) / 10) * 10) / 10;
      const reviewCount = 35 + ((h >> 7) % 820);
      const hasSite = h % 3 !== 0;
      out.push({
        placeId: `demo-${h.toString(36)}`,
        name,
        category: t,
        address: `${100 + (h % 800)}, Main Road, ${area}`,
        city: area,
        phone: h % 4 === 0 ? undefined : `+91 9${String(700000000 + (h % 99999999))}`,
        website: hasSite ? `https://example-${h % 997}.com` : undefined,
        rating,
        reviewCount,
      });
    }
    return out.filter((r) => (q.minRating ? (r.rating ?? 0) >= q.minRating : true) && (q.minReviews ? (r.reviewCount ?? 0) >= (q.minReviews ?? 0) : true));
  }
}

export function activeSearchProvider(): { provider: BusinessSearchProvider; source: "live" | "demo" } {
  const mode = (process.env.BUSINESS_SEARCH_PROVIDER ?? "auto").toLowerCase();
  const googleKey = process.env.PLACES_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY ?? "";
  const geoKey = process.env.GEOAPIFY_API_KEY ?? "";
  if ((mode === "google" || mode === "auto") && googleKey) {
    return { provider: new GooglePlacesProvider(googleKey), source: "live" };
  }
  if (mode === "google" && !googleKey) {
    throw err("not_configured", "Business search set to google but PLACES_API_KEY is missing. Set it or use BUSINESS_SEARCH_PROVIDER=auto.");
  }
  if (mode === "geoapify" || (mode === "auto" && geoKey)) {
    if (!geoKey) throw err("not_configured", "Business search set to geoapify but GEOAPIFY_API_KEY is missing. Get a free key at geoapify.com.");
    return { provider: new GeoapifyProvider(geoKey), source: "live" };
  }
  if (mode === "overpass" || mode === "auto") {
    return { provider: new OverpassProvider(), source: "live" };
  }
  return { provider: new DemoBusinessProvider(), source: "demo" };
}

/** Demo fallback is only allowed when explicitly enabled — never silent in production. */
export function demoFallbackAllowed(): boolean {
  if (process.env.BUSINESS_SEARCH_PROVIDER === "demo") return true;
  if (process.env.NEXT_PUBLIC_DEMO_PERSISTENCE !== undefined) return process.env.NEXT_PUBLIC_DEMO_PERSISTENCE === "true";
  return process.env.NODE_ENV !== "production";
}

// ---------- Geoapify Places (live, free key, no card) ----------
// Free key at geoapify.com (3000 requests/day). Server key, never in browser.

/** Map free text to Geoapify category sets (specific → broad parent). Exported for tests. */
export function geoCategoriesFor(text: string): string[] {
  const t = text.toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));
  if (has("dentist", "dental", "orthodont")) return ["healthcare.dentist", "healthcare"];
  if (has("doctor", "medical", "clinic", "hospital", "physio")) return ["healthcare.clinic_or_praxis", "healthcare.hospital", "healthcare"];
  if (has("gym", "fitness", "yoga", "crossfit")) return ["sport.fitness", "leisure", "sport"];
  if (has("salon", "beauty", "barber", "hair", "spa", "nail")) return ["commercial.beauty", "commercial.hairdresser", "commercial"];
  if (has("restaurant", "food", "dining", "biryani", "pizza", "bakery")) return ["catering.restaurant", "catering.fast_food", "catering.cafe", "catering"];
  if (has("cafe", "coffee")) return ["catering.cafe", "catering"];
  if (has("hotel", "lodge", "guest house", "hostel")) return ["accommodation.hotel", "accommodation"];
  if (has("school", "coaching", "tuition", "training", "college", "institute")) return ["education.school", "education"];
  if (has("realtor", "real estate", "property")) return ["commercial.real_estate", "office", "commercial"];
  if (has("plumber", "plumbing", "electrician", "electrical", "carpenter")) return ["service.home_care", "service", "commercial"];
  if (has("pharmacy", "medical store", "chemist")) return ["healthcare.pharmacy", "healthcare"];
  if (has("car", "auto", "garage", "mechanic", "car wash")) return ["service.vehicle", "service", "commercial"];
  if (has("bank", "atm")) return ["service.financial", "service"];
  if (has("grocery", "supermarket", "kirana")) return ["commercial.supermarket", "commercial"];
  return ["commercial", "catering", "service"];
}

export class GeoapifyProvider implements BusinessSearchProvider {
  name = "geoapify";
  constructor(private apiKey: string) {}

  async search(q: BusinessSearchQuery): Promise<BusinessResult[]> {
    const where = q.location?.trim() || q.text;
    // Geocode with Geoapify (same key).
    const g = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(where)}&limit=1&apiKey=${this.apiKey}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (g.status === 401 || g.status === 403) throw err("provider", "Geoapify key invalid. Check GEOAPIFY_API_KEY.");
    if (!g.ok) throw err("provider", "Location lookup failed.");
    const gj = (await g.json()) as { features?: { properties?: { lat?: number; lon?: number; formatted?: string } }[] };
    const center = gj.features?.[0]?.properties;
    if (!center?.lat || !center?.lon) throw err("provider", `Could not locate "${where}". Try "Area, City".`);
    const radiusM = Math.min(25000, Math.max(500, Math.round((q.radiusKm ?? 5) * 1000)));
    const cats = geoCategoriesFor(q.text);
    // Specific category first for precision; broaden only when sparse or rejected.
    const attempts: string[][] = [[cats[0]], cats];
    let lastErr: unknown = null;
    for (const list of attempts) {
      const url = `https://api.geoapify.com/v2/places?categories=${list.join(",")}&filter=circle:${center.lon},${center.lat},${radiusM}&limit=40&apiKey=${this.apiKey}`;
      let res: Response;
      try {
        res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      } catch (e) {
        lastErr = e;
        continue;
      }
      if (res.status === 401 || res.status === 403) throw err("provider", "Geoapify key invalid. Check GEOAPIFY_API_KEY.");
      if (res.status === 400) { lastErr = err("provider", "Business search rejected the query."); continue; }
      if (res.status === 429) throw err("rate_limited", "Geoapify rate limit hit. Try again shortly.");
      if (!res.ok) { lastErr = err("provider", `Business search failed (${res.status}).`); continue; }
      const j = (await res.json()) as {
        features?: { properties?: Record<string, unknown> & { name?: string; formatted?: string; city?: string; phone?: string; website?: string; place_id?: string; lat?: number; lon?: number; datasource?: { raw?: Record<string, unknown> } } }[];
      };
      const seen = new Set<string>();
      const out: BusinessResult[] = [];
      for (const f of j.features ?? []) {
        const p = f.properties ?? {};
        const raw = (p.datasource?.raw ?? {}) as Record<string, unknown>;
        const name = typeof p.name === "string" ? p.name.trim() : "";
        if (!name || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && !isNaN(Number(v)) ? Number(v) : undefined);
        const lat = typeof p.lat === "number" ? p.lat : undefined;
        const lng = typeof p.lon === "number" ? p.lon : undefined;
        out.push({
          placeId: typeof p.place_id === "string" ? `geoapify-${p.place_id}` : undefined,
          name,
          category: q.text.replace(/\b\w/g, (c) => c.toUpperCase()),
          address: typeof p.formatted === "string" ? p.formatted : undefined,
          city: typeof p.city === "string" ? p.city : q.location,
          phone: (typeof p.phone === "string" ? p.phone : typeof raw.phone === "string" ? raw.phone : undefined) as string | undefined,
          website: (typeof p.website === "string" ? p.website : typeof raw.website === "string" ? raw.website : undefined) as string | undefined,
          rating: num(raw.rating) ?? num((raw as Record<string, unknown>).stars),
          reviewCount: num(raw.user_ratings_total) ?? num((raw as Record<string, unknown>).review_count),
          lat,
          lng,
          distanceKm: lat !== undefined && lng !== undefined ? distanceKm(center.lat, center.lon, lat, lng) : undefined,
        });
        if (out.length >= 40) break;
      }
      // Broad fallback only when the precise query came back sparse.
      if (out.length >= 3 || list.length === cats.length) {
        out.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
        return out;
      }
      lastErr = err("provider", "Too few results.");
    }
    throw lastErr instanceof Error ? lastErr : err("provider", "Business search failed.");
  }
}

// ---------- OpenStreetMap Overpass (live, free, no key) ----------

/** Map free-text business types to OSM tag selectors. Exported for tests. */
export function tagsForQuery(text: string): string[] {
  const t = text.toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));
  if (has("dentist", "dental", "orthodont")) return ["healthcare=dentist", "amenity=dentist"];
  if (has("doctor", "medical", "clinic", "hospital", "physio")) return ["healthcare=clinic", "amenity=clinic", "amenity=doctors", "amenity=hospital"];
  if (has("gym", "fitness", "yoga", "crossfit")) return ["leisure=fitness_centre", "leisure=sports_centre"];
  if (has("salon", "beauty", "barber", "hair", "spa", "nail")) return ["shop=beauty", "shop=hairdresser"];
  if (has("restaurant", "food", "dining", "biryani", "cafe", "coffee", "pizza", "bakery")) return ["amenity=restaurant", "amenity=fast_food", "amenity=cafe"];
  if (has("hotel", "lodge", "guest house", "hostel")) return ["tourism=hotel", "tourism=guest_house", "tourism=hostel"];
  if (has("school", "coaching", "tuition", "training", "college", "institute")) return ["amenity=school", "amenity=college", "office=educational_institution"];
  if (has("realtor", "real estate", "property")) return ["office=estate_agent"];
  if (has("plumber", "plumbing")) return ["craft=plumber"];
  if (has("electrician", "electrical")) return ["craft=electrician"];
  if (has("pharmacy", "medical store", "chemist")) return ["amenity=pharmacy"];
  if (has("gym", "saloon")) return ["shop=hairdresser"];
  if (has("car", "auto", "garage", "mechanic")) return ["shop=car_repair", "amenity=car_wash"];
  if (has("bank", "atm")) return ["amenity=bank", "amenity=atm"];
  if (has("grocery", "supermarket", "kirana")) return ["shop=supermarket", "shop=convenience"];
  return [];
}

/** Bounding box for radiusKm around a point. Exported for tests. */
export function bboxAround(lat: number, lng: number, radiusKm: number): [number, number, number, number] {
  const r = Math.min(25, Math.max(0.5, radiusKm));
  const dLat = r / 111;
  const dLng = r / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return [lat - dLat, lng - dLng, lat + dLat, lng + dLng];
}

const geoCache = new Map<string, { lat: number; lng: string; display: string }>();

async function geocode(place: string): Promise<{ lat: number; lng: number; display: string }> {
  const key = place.toLowerCase();
  const hit = geoCache.get(key) as unknown as { lat: number; lng: number; display: string } | undefined;
  if (hit) return hit;
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(place)}`, {
    headers: { "User-Agent": "Jarvis-Operator/1.0 (local business search)", Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw err("provider", "Location lookup failed.");
  const j = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
  if (!j.length || !j[0].lat || !j[0].lon) throw err("provider", `Could not locate "${place}". Try "Area, City".`);
  const out = { lat: Number(j[0].lat), lng: Number(j[0].lon), display: j[0].display_name ?? place };
  geoCache.set(key, out as unknown as { lat: number; lng: string; display: string });
  if (geoCache.size > 200) geoCache.delete(geoCache.keys().next().value as string);
  return out;
}

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
];
const OVERPASS_TIMEOUT_MS = 15_000;

export class OverpassProvider implements BusinessSearchProvider {
  name = "osm-overpass";
  async search(q: BusinessSearchQuery): Promise<BusinessResult[]> {
    const where = q.location?.trim() || q.text;
    const geo = await geocode(where);
    const radiusKm = q.radiusKm ?? 5;
    const boxes = splitBoxes(geo.lat, geo.lng, radiusKm);
    const tags = tagsForQuery(q.text);
    // Nodes only: POIs are virtually always nodes; way queries blow up large boxes (504s).
    const clauseFor = (bbox: string) => tags.length
      ? tags.map((t) => {
          const [k, v] = t.split("=");
          return `node["${k}"="${v}"](${bbox});`;
        })
      : [`node["name"~"${q.text.replace(/"/g, "")}",i](${bbox});`];
    const seen = new Set<string>();
    const out: BusinessResult[] = [];
    for (const box of boxes) {
      const [s, w, n, e] = box;
      const bbox = `${s.toFixed(5)},${w.toFixed(5)},${n.toFixed(5)},${e.toFixed(5)}`;
      const query = `[out:json][timeout:30];(${clauseFor(bbox).join("")});out 40;`;
      const elements = await this.fetchBox(query);
      for (const el of elements) {
        const tags2 = el.tags ?? {};
        const name = tags2.name?.trim();
        if (!name || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        const phone = tags2["contact:phone"] ?? tags2.phone;
        const website = tags2["contact:website"] ?? tags2.website;
        const addr = [tags2["addr:housenumber"], tags2["addr:street"], tags2["addr:suburb"], tags2["addr:city"]].filter(Boolean).join(", ") || undefined;
        const r: BusinessResult = {
          placeId: `osm-${el.type}/${el.id}`,
          name,
          category: q.text.replace(/\b\w/g, (c) => c.toUpperCase()),
          address: addr,
          city: q.location,
          phone,
          website,
          lat: el.lat,
          lng: el.lon,
          distanceKm: el.lat !== undefined && el.lon !== undefined ? distanceKm(geo.lat, geo.lng, el.lat, el.lon) : undefined,
        };
        if (q.minRating && (r.rating ?? 0) < q.minRating) continue;
        out.push(r);
        if (out.length >= 40) break;
      }
    }
    return out.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
  }

  private async fetchBox(query: string): Promise<{ type: string; id: number; lat?: number; lon?: number; tags?: Record<string, string> }[]> {
    let lastErr: unknown = null;
    for (const mirror of OVERPASS_MIRRORS) {
      try {
        const res = await fetch(mirror, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Jarvis-Operator/1.0 (local business search)" },
          body: "data=" + encodeURIComponent(query),
          signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
        });
        if (res.status === 429) throw err("rate_limited", "OpenStreetMap is rate-limiting searches. Wait a minute and retry.");
        if (!res.ok) throw err("provider", `Business search failed (${res.status}).`);
        const j = (await res.json()) as {
          elements?: { type: string; id: number; lat?: number; lon?: number; tags?: Record<string, string> }[];
        };
        return j.elements ?? [];
      } catch (e) {
        lastErr = e;
        if (e instanceof Error && "code" in e && ((e as { code: string }).code === "rate_limited" || (e as { code: string }).code === "validation")) throw e;
        if (process.env.NODE_ENV !== "production") console.error(`[overpass] mirror failed ${mirror}:`, e instanceof Error ? e.message : e);
        continue; // try next mirror
      }
    }
    throw lastErr instanceof Error ? lastErr : err("provider", "Business search failed on all mirrors.");
  }
}

/** Split large search areas into quadrants so no single Overpass query times out. Exported for tests. */
export function splitBoxes(lat: number, lng: number, radiusKm: number): [number, number, number, number][] {
  const r = Math.min(25, Math.max(0.5, radiusKm));
  if (r <= 10) return [bboxAround(lat, lng, r)];
  const mid = bboxAround(lat, lng, r);
  const [s, w, n, e] = mid;
  const mLat = (s + n) / 2;
  const mLng = (w + e) / 2;
  return [
    [s, w, mLat, mLng],
    [s, mLng, mLat, e],
    [mLat, w, n, mLng],
    [mLat, mLng, n, e],
  ];
}

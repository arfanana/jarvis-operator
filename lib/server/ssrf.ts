import dns from "node:dns/promises";
import net from "node:net";

const CLOUD_METADATA = new Set(["169.254.169.254", "169.254.169.253", "fd00:ec2::254", "100.100.100.200"]);

function ipv4ToInt(ip: string): number {
  const p = ip.split(".").map(Number);
  return ((p[0] * 256 + p[1]) * 256 + p[2]) * 256 + p[3];
}
function inCidr(ip: string, cidr: string): boolean {
  const [base, bits] = cidr.split("/");
  const n = Number(bits);
  const mask = n === 0 ? 0 : (~0 << (32 - n)) >>> 0;
  return ((ipv4ToInt(ip) & mask) >>> 0) === ((ipv4ToInt(base) & mask) >>> 0);
}
const V4_BLOCKS = ["127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "169.254.0.0/16", "224.0.0.0/4", "0.0.0.0/8", "100.64.0.0/10", "192.0.2.0/24", "198.51.100.0/24", "203.0.113.0/24"];

function isBlockedIp(ip: string): string | null {
  if (CLOUD_METADATA.has(ip)) return "cloud metadata address blocked";
  if (net.isIPv4(ip)) {
    if (V4_BLOCKS.some((c) => inCidr(ip, c))) return `private/reserved IPv4 blocked (${ip})`;
    return null;
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === "::1" || l.startsWith("fe80:") || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("ff")) return `private IPv6 blocked (${ip})`;
    return null;
  }
  return "unrecognized IP";
}

/** Validate a URL for server-side fetch: http/https only, no localhost/internal, no odd ports. */
export async function validateFetchUrl(raw: string, opts?: { allowPorts?: number[] }): Promise<{ url: URL; ips: string[] }> {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Invalid URL."); }
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only http/https URLs are allowed.");
  const host = url.hostname.toLowerCase();
  if (["localhost"].includes(host) || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) throw new Error("Internal hostnames are blocked.");
  const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  const allowed = new Set([...(opts?.allowPorts ?? []), 80, 443]);
  if (!allowed.has(port)) throw new Error("Only standard web ports (80/443) are allowed.");
  if (net.isIP(host)) {
    const why = isBlockedIp(host);
    if (why) throw new Error(why);
    return { url, ips: [host] };
  }
  // DNS resolution check
  let records: string[] = [];
  try {
    records = await dns.resolve4(host).catch(() => []);
    const v6 = await dns.resolve6(host).catch(() => []);
    records = [...records, ...v6];
  } catch { throw new Error("DNS resolution failed."); }
  if (!records.length) throw new Error("DNS resolution failed.");
  for (const ip of records) {
    const why = isBlockedIp(ip);
    if (why) throw new Error(`DNS resolves to blocked address: ${why}`);
  }
  return { url, ips: records };
}

export interface SafeFetchResult { status: number; finalUrl: string; headers: Record<string, string>; body: string; size: number; }

/** SSRF-safe fetch: revalidates every redirect, caps redirects/size/time. */
export async function safeFetch(rawUrl: string, opts?: { timeoutMs?: number; maxRedirects?: number; maxBytes?: number; headers?: Record<string, string> }): Promise<SafeFetchResult> {
  const timeoutMs = opts?.timeoutMs ?? 8000;
  const maxRedirects = opts?.maxRedirects ?? 3;
  const maxBytes = opts?.maxBytes ?? 750_000;
  let current = rawUrl;
  let status = 0;
  let finalUrl = rawUrl;
  let headers: Record<string, string> = {};
  for (let i = 0; i <= maxRedirects; i++) {
    const { url } = await validateFetchUrl(current);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(url.toString(), { redirect: "manual", signal: ctrl.signal, headers: { "User-Agent": "Jarvis-Operator/1.0 (+website-audit)", Accept: "text/html,*/*", ...(opts?.headers ?? {}) } });
    } catch (e) {
      clearTimeout(t);
      throw new Error(e instanceof Error && e.name === "AbortError" ? "Fetch timed out." : "Fetch failed.");
    }
    clearTimeout(t);
    status = res.status;
    finalUrl = url.toString();
    headers = {};
    res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    if ([301, 302, 303, 307, 308].includes(status)) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error("Redirect without location.");
      current = new URL(loc, url.toString()).toString();
      await res.arrayBuffer().catch(() => null);
      if (i === maxRedirects) throw new Error("Too many redirects.");
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > maxBytes) throw new Error(`Response too large (${buf.length} bytes, limit ${maxBytes}).`);
    return { status, finalUrl, headers, body: buf.toString("utf8"), size: buf.length };
  }
  throw new Error("Too many redirects.");
}

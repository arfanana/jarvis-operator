import { describe, expect, it } from "vitest";
import { validateFetchUrl } from "@/lib/server/ssrf";

describe("SSRF protection", () => {
  it("rejects non-http", async () => {
    await expect(validateFetchUrl("file:///etc/passwd")).rejects.toThrow();
    await expect(validateFetchUrl("ftp://example.com")).rejects.toThrow();
  });
  it("rejects localhost/loopback/private", async () => {
    await expect(validateFetchUrl("http://localhost:3000/x")).rejects.toThrow();
    await expect(validateFetchUrl("http://127.0.0.1/")).rejects.toThrow();
    await expect(validateFetchUrl("http://10.0.0.5/")).rejects.toThrow();
    await expect(validateFetchUrl("http://192.168.1.1/")).rejects.toThrow();
    await expect(validateFetchUrl("http://169.254.169.254/latest")).rejects.toThrow();
    await expect(validateFetchUrl("http://[::1]/")).rejects.toThrow();
  });
  it("rejects non-standard ports", async () => {
    await expect(validateFetchUrl("http://example.com:8080/")).rejects.toThrow();
  });
});

describe("pipeline transitions", () => {
  const COLS = ["new", "contacted", "replied", "proposal", "won", "lost"];
  it("advances in order", () => {
    const advance = (cur: string) => COLS[COLS.indexOf(cur) + 1];
    expect(advance("new")).toBe("contacted");
    expect(advance("proposal")).toBe("won");
  });
});

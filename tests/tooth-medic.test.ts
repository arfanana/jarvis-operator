import { describe, expect, it } from "vitest";
import {
  CLINIC,
  FAQS,
  JOURNEY,
  TREATMENTS,
  WA_BOOKING,
  WA_CHAT,
  treatmentBookingLink,
} from "@/lib/tooth-medic-content";

const BANNED = [
  "best dentist", "#1", "no. 1", "award-winning", "years of experience",
  "patients", "painless", "guaranteed", "cutting-edge", "state-of-the-art",
  "lorem", "✨",
];

describe("tooth medic content honesty", () => {
  it("uses only supplied contact facts", () => {
    expect(CLINIC.phoneDisplay).toBe("+91 70752 29333");
    expect(CLINIC.email).toBe("toothmedic4u@gmail.com");
    expect(CLINIC.area).toBe("Musheerabad");
  });
  it("contains no invented claims anywhere", () => {
    const blob = JSON.stringify({ TREATMENTS, FAQS, JOURNEY }).toLowerCase();
    for (const b of BANNED) expect(blob).not.toContain(b.toLowerCase());
  });
  it("covers all six supplied treatments", () => {
    const names = TREATMENTS.map((t) => t.name);
    for (const n of ["Laser & Implants", "Invisalign", "Kids Dental", "Airway Dentistry", "Myofunctional Therapy", "Smile Design"]) {
      expect(names).toContain(n);
    }
  });
  it("builds valid WhatsApp links with prefilled enquiry text", () => {
    for (const url of [WA_BOOKING, WA_CHAT, treatmentBookingLink("Invisalign")]) {
      expect(url.startsWith("https://wa.me/917075229333?text=")).toBe(true);
      const text = decodeURIComponent(url.split("text=")[1]);
      expect(text.length).toBeGreaterThan(20);
    }
    expect(decodeURIComponent(WA_BOOKING.split("text=")[1])).toContain("booking a consultation");
  });
});

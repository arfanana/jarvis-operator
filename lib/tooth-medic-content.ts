// Single source of truth for the Tooth Medic flagship demo.
// ONLY real supplied information. Anything unknown is left empty and the UI
// renders a fill-in-later slot instead of inventing facts.

export const CLINIC = {
  name: "Tooth Medic Family Dental Care",
  shortName: "Tooth Medic",
  city: "Hyderabad",
  area: "Musheerabad",
  region: "Telangana",
  phoneDisplay: "+91 70752 29333",
  phoneIntl: "+917075229333",
  email: "toothmedic4u@gmail.com",
  mapsQuery: "Tooth Medic Family Dental Care Musheerabad Hyderabad",
} as const;

export function whatsappLink(message: string): string {
  return `https://wa.me/917075229333?text=${encodeURIComponent(message)}`;
}

export const WA_BOOKING = whatsappLink(
  "Hi Tooth Medic Family Dental Care, I'd like to enquire about booking a consultation."
);
export const WA_CHAT = whatsappLink(
  "Hi Tooth Medic Family Dental Care, I have a question about a treatment."
);

export function treatmentBookingLink(treatment: string): string {
  return whatsappLink(
    `Hi Tooth Medic Family Dental Care, I'd like to enquire about ${treatment}.`
  );
}

export interface Treatment {
  slug: string;
  name: string;
  tagline: string;
  points: string[];
  featured?: boolean;
}

export const TREATMENTS: Treatment[] = [
  {
    slug: "invisalign",
    name: "Invisalign",
    tagline: "Clear aligners planned around your smile and bite.",
    points: ["Assessment to check suitability", "Digital treatment preview", "Staged aligner sets with reviews"],
    featured: true,
  },
  {
    slug: "implants",
    name: "Laser & Implants",
    tagline: "Replacement options for missing teeth, including implant dentistry.",
    points: ["Consultation and imaging review", "Step-by-step treatment plan", "Crown and aftercare guidance"],
    featured: true,
  },
  {
    slug: "smile-design",
    name: "Smile Design",
    tagline: "A planned approach to the shape, shade and alignment of your smile.",
    points: ["Smile assessment", "Preview before treatment begins", "Staged, reviewable plan"],
    featured: true,
  },
  {
    slug: "kids",
    name: "Kids Dental",
    tagline: "Unhurried first visits and routine care for children.",
    points: ["First check-ups without pressure", "Habit and hygiene guidance", "Recall reminders for parents"],
  },
  {
    slug: "airway",
    name: "Airway Dentistry",
    tagline: "Dental assessment with breathing and sleep in mind.",
    points: ["Screening as part of examination", "Referral coordination where needed", "Review-based follow-up"],
  },
  {
    slug: "myofunctional",
    name: "Myofunctional Therapy",
    tagline: "Guided exercises supporting tongue posture and oral habits.",
    points: ["Habit assessment", "Structured exercise program", "Progress reviews"],
  },
];

export const JOURNEY = [
  { title: "Book a consultation", text: "Call or message on WhatsApp and pick a time that suits you." },
  { title: "Discuss your concerns", text: "Tell the team what bothers you and what you want to change." },
  { title: "Get a personal plan", text: "Receive treatment options with clear steps before anything begins." },
  { title: "Begin treatment", text: "Start when ready, with reviews scheduled along the way." },
];

export const FAQS = [
  {
    q: "Do I need an appointment, or can I walk in?",
    a: "Appointments keep waiting times short. Call or message on WhatsApp to book; walk-in availability depends on the day's schedule.",
  },
  {
    q: "What happens at a first consultation?",
    a: "An examination, a discussion of your concerns, and treatment options with next steps. Nothing proceeds without your agreement.",
  },
  {
    q: "Do you treat children?",
    a: "Yes. First visits are kept short and pressure-free so children get comfortable with the clinic.",
  },
  {
    q: "How do I know if Invisalign suits me?",
    a: "Suitability depends on your bite and treatment goals, which is exactly what the assessment appointment determines.",
  },
  {
    q: "How do I reach the clinic?",
    a: "The clinic is in Musheerabad, Hyderabad. Use the Get Directions button for the map, or call +91 70752 29333.",
  },
];

export interface SiteImage { src: string; alt: string; credit?: string; }

export const IMAGES: Record<"hero" | "clinic" | "chair", SiteImage> = {
  hero: {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/20180101-123256-dental-clinic-ramat-gan-israel-2018.jpg/1280px-20180101-123256-dental-clinic-ramat-gan-israel-2018.jpg",
    alt: "Modern dental clinic treatment room with dental chair and equipment",
  },
  clinic: {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Dentist_Office_IMG_2447_Oslo.JPG/1280px-Dentist_Office_IMG_2447_Oslo.JPG",
    alt: "Modern dental office with treatment chair",
    credit: "Bjoertvedt, CC BY-SA 3.0, via Wikimedia Commons",
  },
  chair: {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Dentist_Office_IMG_2457_Oslo.JPG/1280px-Dentist_Office_IMG_2457_Oslo.JPG",
    alt: "Dental treatment equipment close-up",
    credit: "Bjoertvedt, CC BY-SA 3.0, via Wikimedia Commons",
  },
};

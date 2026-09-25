// Shared data model for shadcn-based multi-business site templates.
// tooth-medic = REAL business facts. restaurant/salon/gym = obvious SAMPLES
// (fictional names, 90000 numbers, sample ribbon in UI).

export interface SiteService {
  name: string;
  desc: string;
  points: string[];
  featured?: boolean;
}

export interface SiteTheme {
  /** Primary action color. */
  accent: string;
  /** Dark section background. */
  dark: string;
  /** Soft section background. */
  soft: string;
}

export interface SitePreset {
  slug: string;
  navLabel: string;
  category: string;
  /** True → UI shows a "Sample template" ribbon and footer note. */
  sample: boolean;
  business: string;
  shortName: string;
  tagline: string;
  intro: string;
  phoneDisplay: string;
  phoneHref: string;
  email?: string;
  address: string;
  area: string;
  city: string;
  hoursNote: string;
  services: SiteService[];
  faqs: { q: string; a: string }[];
  steps: { title: string; text: string }[];
  whyPoints: { title: string; text: string }[];
  image: { src: string; alt: string; credit?: string };
  theme: SiteTheme;
  bookingMessage: string;
  chatMessage: string;
}

export function whatsappFor(preset: SitePreset, message: string): string {
  const digits = preset.phoneHref.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export const SITE_PRESETS: Record<string, SitePreset> = {
  "tooth-medic": {
    slug: "tooth-medic",
    navLabel: "Tooth Medic",
    category: "Dental Clinic",
    sample: false,
    business: "Tooth Medic Family Dental Care",
    shortName: "Tooth Medic",
    tagline: "Modern dental care, designed around your smile.",
    intro:
      "From clear aligners and implants to gentle first visits for children, Tooth Medic covers the treatments families in Musheerabad actually ask for — explained plainly, priced before anything begins.",
    phoneDisplay: "+91 70752 29333",
    phoneHref: "tel:+917075229333",
    email: "toothmedic4u@gmail.com",
    address: "Musheerabad, Hyderabad, Telangana",
    area: "Musheerabad",
    city: "Hyderabad",
    hoursNote: "Timings vary by day — call ahead to confirm today's hours.",
    services: [
      { name: "Invisalign", desc: "Clear aligners planned around your smile and bite.", points: ["Assessment to check suitability", "Digital treatment preview", "Staged aligner sets with reviews"], featured: true },
      { name: "Laser & Implants", desc: "Replacement options for missing teeth, including implant dentistry.", points: ["Consultation and imaging review", "Step-by-step treatment plan", "Crown and aftercare guidance"], featured: true },
      { name: "Smile Design", desc: "A planned approach to the shape, shade and alignment of your smile.", points: ["Smile assessment", "Preview before treatment begins", "Staged, reviewable plan"], featured: true },
      { name: "Kids Dental", desc: "Unhurried first visits and routine care for children.", points: ["First check-ups without pressure", "Habit and hygiene guidance"] },
      { name: "Airway Dentistry", desc: "Dental assessment with breathing and sleep in mind.", points: ["Screening as part of examination", "Referral coordination where needed"] },
      { name: "Myofunctional Therapy", desc: "Guided exercises supporting tongue posture and oral habits.", points: ["Habit assessment", "Structured exercise program"] },
    ],
    faqs: [
      { q: "Do I need an appointment, or can I walk in?", a: "Appointments keep waiting times short. Call or message on WhatsApp to book; walk-in availability depends on the day's schedule." },
      { q: "What happens at a first consultation?", a: "An examination, a discussion of your concerns, and treatment options with next steps. Nothing proceeds without your agreement." },
      { q: "Do you treat children?", a: "Yes. First visits are kept short and pressure-free so children get comfortable with the clinic." },
      { q: "How do I know if Invisalign suits me?", a: "Suitability depends on your bite and treatment goals, which is exactly what the assessment appointment determines." },
      { q: "How do I reach the clinic?", a: "The clinic is in Musheerabad, Hyderabad. Use the Get Directions button for the map, or call +91 70752 29333." },
    ],
    steps: [
      { title: "Book a consultation", text: "Call or message on WhatsApp and pick a time that suits you." },
      { title: "Discuss your concerns", text: "Tell the team what bothers you and what you want to change." },
      { title: "Get a personal plan", text: "Receive treatment options with clear steps before anything begins." },
      { title: "Begin treatment", text: "Start when ready, with reviews scheduled along the way." },
    ],
    whyPoints: [
      { title: "One clinic for the whole family", text: "Children's first visits and adult treatments in a single practice." },
      { title: "Specialised treatments, explained plainly", text: "Airway dentistry and myofunctional therapy alongside implants and aligners." },
      { title: "Plans before procedures", text: "Options, steps and pricing are agreed up front." },
      { title: "Reachable on WhatsApp", text: "Questions and changes go through a direct message." },
    ],
    image: {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/20180101-123256-dental-clinic-ramat-gan-israel-2018.jpg/1280px-20180101-123256-dental-clinic-ramat-gan-israel-2018.jpg",
      alt: "Modern dental clinic treatment room with dental chair and equipment",
    },
    theme: { accent: "#0C3B38", dark: "#042F2D", soft: "#FAF7F1" },
    bookingMessage: "Hi Tooth Medic Family Dental Care, I'd like to enquire about booking a consultation.",
    chatMessage: "Hi Tooth Medic Family Dental Care, I have a question about a treatment.",
  },
  restaurant: {
    slug: "restaurant",
    navLabel: "Sample Restaurant",
    category: "Restaurant",
    sample: true,
    business: "Cedar Table (Sample)",
    shortName: "Cedar Table",
    tagline: "Slow-cooked biryani and family thalis, served hot.",
    intro:
      "A neighbourhood family restaurant template: lunch thalis on weekdays, dum biryani on weekends, and takeaway that actually travels well. Replace every word with the real menu before showing a client.",
    phoneDisplay: "+91 90000 00001",
    phoneHref: "tel:+919000000001",
    email: "hello@example.com",
    address: "Road No. 12, Malakpet, Hyderabad",
    area: "Malakpet",
    city: "Hyderabad",
    hoursNote: "Sample hours — replace with real timings.",
    services: [
      { name: "Lunch Thali", desc: "A rotating weekday plate: dal, sabzi, rice, roti, papad, sweet.", points: ["Served 12–3:30pm", "Veg and non-veg"], featured: true },
      { name: "Dum Biryani", desc: "Weekend special, sealed and slow-cooked.", points: ["Chicken, mutton, veg", "Family packs"], featured: true },
      { name: "Family Combos", desc: "Fixed-price spreads for four to six people.", points: ["Starters plus mains", "Takeaway packing"], featured: true },
      { name: "Takeaway", desc: "Call ahead and skip the wait.", points: ["Ready in 20 minutes", "UPI accepted"] },
    ],
    faqs: [
      { q: "Do I need to reserve a table?", a: "Weekday lunches rarely need one; weekend dinners do. Call ahead to be safe." },
      { q: "Is takeaway available?", a: "Yes — call 20 minutes ahead and it will be packed when you arrive." },
      { q: "Do you do bulk or party orders?", a: "Yes for 20+ portions with a day's notice. Share the headcount on call." },
    ],
    steps: [
      { title: "Call or walk in", text: "Tables turn fast at lunch; evenings are busier." },
      { title: "Order at the table", text: "The menu is one page — thalis, biryani, combos." },
      { title: "Eat while it's hot", text: "Biryani goes from handi to table, not under a lamp." },
      { title: "Takeaway for home", text: "Pack the same food for the family table." },
    ],
    whyPoints: [
      { title: "One-page menu", text: "Fewer dishes, cooked properly, served fast." },
      { title: "Family pricing", text: "Combos priced for four to six people." },
      { title: "Takeaway that travels", text: "Sealed packing that survives a 30-minute ride." },
    ],
    image: {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Restaurant_room_of_Amantaka_luxury_Resort_%26_Hotel_in_Luang_Prabang_Laos.jpg/1280px-Restaurant_room_of_Amantaka_luxury_Resort_%26_Hotel_in_Luang_Prabang_Laos.jpg",
      alt: "Restaurant dining room with set tables",
      credit: "Basile Morin, CC BY-SA 4.0, via Wikimedia Commons",
    },
    theme: { accent: "#9A3412", dark: "#431407", soft: "#FDF6F0" },
    bookingMessage: "Hi, I'd like to book a table for this weekend.",
    chatMessage: "Hi, I have a question about your menu.",
  },
  salon: {
    slug: "salon",
    navLabel: "Sample Salon",
    category: "Salon",
    sample: true,
    business: "Glow & Trim (Sample)",
    shortName: "Glow & Trim",
    tagline: "Haircuts with a consultation first, not after.",
    intro:
      "A neighbourhood salon template: cuts, colour, facials and bridal packages with upfront pricing. Replace every word with the real service list before showing a client.",
    phoneDisplay: "+91 90000 00002",
    phoneHref: "tel:+919000000002",
    email: "hello@example.com",
    address: "Street No. 8, Habsiguda, Hyderabad",
    area: "Habsiguda",
    city: "Hyderabad",
    hoursNote: "Sample hours — replace with real timings.",
    services: [
      { name: "Haircut & Styling", desc: "Consultation, cut, wash and finish.", points: ["Men, women and kids", "Upfront pricing"], featured: true },
      { name: "Facials & Cleanup", desc: "Skin-type matched facials, no upsell pressure.", points: ["30 and 60 minute options", "Patch test first"], featured: true },
      { name: "Bridal Packages", desc: "Trial plus wedding-day hair and makeup.", points: ["Trial included", "Home service option"], featured: true },
      { name: "Beard & Grooming", desc: "Shaping, colour and care.", points: ["Walk-ins welcome", "15-minute slots"] },
    ],
    faqs: [
      { q: "Do I need an appointment?", a: "Cuts are fastest with one; beard grooming takes walk-ins." },
      { q: "How long does a facial take?", a: "Cleanup 30 minutes, full facial 60. Timings are honoured." },
      { q: "Do bridal packages include a trial?", a: "Yes — the trial is part of every bridal booking." },
    ],
    steps: [
      { title: "Book a slot", text: "Call or message with the service you want." },
      { title: "Consult first", text: "Stylist confirms the look and the price before starting." },
      { title: "Get the service", text: "No mid-chair upsells, ever." },
      { title: "Aftercare advice", text: "What to use at home, in plain words." },
    ],
    whyPoints: [
      { title: "Price before scissors", text: "You approve the cost in the consultation." },
      { title: "Trial with bridal", text: "See the look before the wedding day." },
      { title: "Hygiene basics", text: "Fresh capes, sterilised tools, visible station cleaning." },
    ],
    image: {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Hair_salon_-_Arlington%2C_MA.jpg/1280px-Hair_salon_-_Arlington%2C_MA.jpg",
      alt: "Hair salon interior with styling chairs",
    },
    theme: { accent: "#6D28D9", dark: "#2E1065", soft: "#F7F3FD" },
    bookingMessage: "Hi, I'd like to book a haircut appointment.",
    chatMessage: "Hi, I have a question about your services.",
  },
  gym: {
    slug: "gym",
    navLabel: "Sample Gym",
    category: "Gym",
    sample: true,
    business: "IronWorks (Sample)",
    shortName: "IronWorks",
    tagline: "Strength training with a coach watching your form.",
    intro:
      "A neighbourhood strength gym template: open floor, coached batches and personal training. Replace every word with the real offering before showing a client.",
    phoneDisplay: "+91 90000 00003",
    phoneHref: "tel:+919000000003",
    email: "hello@example.com",
    address: "Plot 14, Nacharam, Hyderabad",
    area: "Nacharam",
    city: "Hyderabad",
    hoursNote: "Sample hours — replace with real timings.",
    services: [
      { name: "Open Floor", desc: "Racks, platforms and machines, coached floor hours.", points: ["Morning and evening batches", "Form checks included"], featured: true },
      { name: "Personal Training", desc: "One-on-one programming and nutrition basics.", points: ["Monthly assessments", "WhatsApp check-ins"], featured: true },
      { name: "Cardio & Conditioning", desc: "Bikes, rowers and sled work without the crowd.", points: ["Off-peak pricing", "Beginner induction"], featured: true },
      { name: "Trial Week", desc: "Seven days, full access, one coached session.", points: ["No card required", "Converts to membership"] },
    ],
    faqs: [
      { q: "I'm a beginner. Where do I start?", a: "The trial week plus an induction session that teaches the basic lifts safely." },
      { q: "Is there a trainer on the floor?", a: "Yes during batch hours — form checks are part of membership, not an extra." },
      { q: "Can I pause my membership?", a: "Yes, up to a month per year for travel or injury. Just inform the desk." },
    ],
    steps: [
      { title: "Take the trial week", text: "Full access plus one coached session." },
      { title: "Get assessed", text: "Movement screen and a starting program." },
      { title: "Train in batches", text: "Coached morning or evening slots." },
      { title: "Review monthly", text: "Numbers checked, program adjusted." },
    ],
    whyPoints: [
      { title: "Coached floor", text: "A trainer watches form during batch hours." },
      { title: "No machines-only trap", text: "Free weights first, machines where they help." },
      { title: "Pause-friendly", text: "Travel or injury pauses without losing money." },
    ],
    image: {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Woman_standing_in_front_of_a_dumbbell_rack_doing_bicep_curls.jpg/1280px-Woman_standing_in_front_of_a_dumbbell_rack_doing_bicep_curls.jpg",
      alt: "Gym member training with dumbbells",
      credit: "Shixart1985, CC BY 2.0, via Wikimedia Commons",
    },
    theme: { accent: "#1D4ED8", dark: "#172554", soft: "#F2F6FD" },
    bookingMessage: "Hi, I'd like to enquire about the trial week.",
    chatMessage: "Hi, I have a question about memberships.",
  },
};

export const SITE_SLUGS = Object.keys(SITE_PRESETS);

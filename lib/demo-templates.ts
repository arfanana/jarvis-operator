export interface DemoTemplate {
  id: string;
  label: string;
  category: string;
  hero: string;
  services: string[];
  cta: string;
  accent: string;
}

export const DEMO_TEMPLATES: DemoTemplate[] = [
  { id: "dental", label: "Dental clinic", category: "Dental Clinic", hero: "Painless dentistry, same-day appointments", services: ["Cleaning & whitening", "Braces & aligners", "Implants", "Kids dentistry"], cta: "Book on WhatsApp", accent: "#0ea5e9" },
  { id: "restaurant", label: "Restaurant", category: "Restaurant", hero: "Order in 60 seconds — hot & fresh", services: ["Lunch thali", "Biryani specials", "Family combos", "Online ordering"], cta: "Order now", accent: "#f59e0b" },
  { id: "salon", label: "Salon", category: "Salon", hero: "Look sharp this weekend", services: ["Haircut & styling", "Facials", "Bridal packages", "Memberships"], cta: "Book a slot", accent: "#ec4899" },
  { id: "gym", label: "Gym", category: "Gym", hero: "Lose 5kg in 90 days — coached", services: ["Strength zone", "Cardio & Zumba", "Personal training", "Diet plans"], cta: "Free trial", accent: "#22c55e" },
  { id: "real-estate", label: "Real estate", category: "Real Estate", hero: "Verified flats near you", services: ["2/3 BHK listings", "Site visits", "Home loans", "Resale help"], cta: "Book site visit", accent: "#6366f1" },
  { id: "coaching", label: "Coaching center", category: "Coaching", hero: "Rank in IIT-JEE / NEET 2027", services: ["Classroom batches", "Test series", "Doubt rooms", "Parent reports"], cta: "Free demo class", accent: "#8b5cf6" },
  { id: "hotel", label: "Hotel", category: "Hotel", hero: "Stay 5 min from the station", services: ["Deluxe rooms", "Banquet hall", "Restaurant", "Airport pickup"], cta: "Reserve room", accent: "#0d9488" },
  { id: "lawyer", label: "Lawyer", category: "Legal", hero: "Property & business counsel", services: ["Registration", "Disputes", "Contracts", "Consultation"], cta: "Talk to counsel", accent: "#475569" },
  { id: "retail", label: "Local retailer", category: "Retail", hero: "Everything nearby, delivered today", services: ["Groceries", "Home essentials", "Same-day delivery", "WhatsApp ordering"], cta: "Order on WhatsApp", accent: "#f97316" },
  { id: "generic", label: "Generic local business", category: "General", hero: "Trusted by your neighbours", services: ["Service 1", "Service 2", "Reviews", "Contact"], cta: "Chat with us", accent: "#3b82f6" },
];

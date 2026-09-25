import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Footer, MobileCallBar, Navbar } from "@/components/tooth-medic/chrome";
import { About, Contact, Faq, FinalCta, Hero, Journey, Treatments, TrustBar, WhyUs } from "@/components/tooth-medic/sections";
import { CLINIC } from "@/lib/tooth-medic-content";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: `${CLINIC.name} | Dentist in ${CLINIC.area}, ${CLINIC.city}`,
  description:
    "Family dental care in Musheerabad, Hyderabad — Invisalign, implants, kids dentistry, airway dentistry and smile design. Book a consultation on WhatsApp.",
};

export default function ToothMedicPage() {
  return (
    <div className={`${display.variable} ${body.variable} bg-white font-sans text-stone-900 antialiased`}>
      <Navbar />
      <main id="main" className="pb-16 md:pb-0">
        <Hero />
        <TrustBar />
        <Treatments />
        <WhyUs />
        <Journey />
        <About />
        <Faq />
        <Contact />
        <FinalCta />
      </main>
      <Footer />
      <MobileCallBar />
    </div>
  );
}

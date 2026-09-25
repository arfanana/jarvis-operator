import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  SiteContact,
  SiteFaq,
  SiteFinal,
  SiteFooter,
  SiteHero,
  SiteMobileBar,
  SiteNavbar,
  SiteSampleRibbon,
  SiteServices,
  SiteSteps,
  SiteWhy,
} from "@/components/site-template/Renderer";
import { SITE_PRESETS, SITE_SLUGS } from "@/lib/site-templates";

export function generateStaticParams() {
  return SITE_SLUGS.map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = SITE_PRESETS[params.slug];
  if (!p) return { title: "Not found" };
  return {
    title: `${p.business} | ${p.category} in ${p.area}, ${p.city}`,
    description: p.intro.slice(0, 160),
  };
}

export default function SitePage({ params }: { params: { slug: string } }) {
  const preset = SITE_PRESETS[params.slug];
  if (!preset) notFound();
  return (
    <div className="bg-white font-sans text-stone-900 antialiased">
      {preset.sample && <SiteSampleRibbon />}
      <SiteNavbar preset={preset} />
      <main id="main" className="pb-16 md:pb-0">
        <SiteHero preset={preset} />
        <SiteServices preset={preset} />
        <SiteWhy preset={preset} />
        <SiteSteps preset={preset} />
        <SiteFaq preset={preset} />
        <SiteContact preset={preset} />
        <SiteFinal preset={preset} />
      </main>
      <SiteFooter preset={preset} />
      <SiteMobileBar preset={preset} />
    </div>
  );
}

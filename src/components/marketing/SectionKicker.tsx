/**
 * Small kicker used above every marketing section's main heading: a short
 * brand-gradient rule + an uppercase label. Shared across FeaturesSection,
 * PricingSection, AboutSection, and FaqSection so the "eyebrow" treatment
 * (previously plain floating accent-colored text, no visual anchor) reads as
 * one consistent system across the whole scrolling landing page instead of
 * four independent implementations. Same copy/size as before — this only
 * adds the gradient rule, it doesn't change what any section says.
 */
export function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-px w-8 bg-gradient-brand" aria-hidden />
      <p className="text-xs font-bold uppercase tracking-widest text-accent">{children}</p>
    </div>
  );
}

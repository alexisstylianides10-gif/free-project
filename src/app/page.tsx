import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Hero } from "@/components/marketing/Hero";
import { Problem } from "@/components/marketing/Problem";
import { Differentiation } from "@/components/marketing/Differentiation";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Architecture } from "@/components/marketing/Architecture";
import { Privacy } from "@/components/marketing/Privacy";
import { Footer } from "@/components/marketing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-ink-950 text-paper">
      <MarketingNav />
      <main>
        <Hero />
        <Problem />
        <Differentiation />
        <HowItWorks />
        <Architecture />
        <Privacy />
      </main>
      <Footer />
    </div>
  );
}

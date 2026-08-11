import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Vision } from "@/components/landing/Vision";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#05050a]">
      <Nav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Vision />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

// Moved verbatim out of pricing/PricingClient.tsx (was PRICING_FAQ, local to
// that file). Same 4 Q&A objects, same copy, just relocated so PricingSection
// (standalone /pricing + inline on /) and FaqSection (/ only) both import one
// shared source instead of two copies existing — see
// PRODUCT_SPECS_SCROLL_LANDING.md §4.
export const PRICING_FAQ: { q: string; a: string }[] = [
  {
    q: "Is there really a free plan?",
    a: "Yes. Core organization (timetable, homework, exams, career matches, or your business plan and milestones) is always free. AI features like the Coach, study plans, and quiz generation are part of Plus.",
  },
  {
    q: "What happens after my trial?",
    a: "Every new account gets a 3-day free trial of Plus automatically, no card required. When it ends, AI features pause until you subscribe — your core tracking (timetable, homework, exams, or your business plan) stays free either way.",
  },
  {
    q: "Can I switch between monthly and yearly?",
    a: "Yes — before you subscribe you can toggle between monthly and yearly anytime, right on this page or in-app. If you're already on Plus, switching intervals is done from the billing portal (Manage subscription).",
  },
  {
    q: "Can I switch tracks?",
    a: "Your track (student or founder) is locked in once you finish onboarding, so the app can build itself fully around it. If you signed up on the wrong track, contact us and we can help. Note: the founder track is currently paused for new signups while we polish it, so new accounts are on the student track for now.",
  },
];

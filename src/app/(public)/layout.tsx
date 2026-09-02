import { CookieBanner } from "@/components/shared/CookieBanner";

/**
 * Layout scope for the public marketing/auth surface only: `/`, `/login`,
 * `/signup`, `/choose-plan`, `/privacy`, `/terms`, `/faq` (a Next.js route
 * group — the `(public)` folder name doesn't affect any URL). This is
 * deliberately the ONLY place `CookieBanner` mounts.
 *
 * It used to mount unconditionally in the root layout, which meant it also
 * rendered on every authenticated `/app/**` page — where it's `fixed
 * inset-x-0 bottom-0 z-50` and completely covers `BottomNav` (`fixed
 * inset-x-0 bottom-0 z-40 md:hidden`), blocking primary in-app navigation
 * for every first-time mobile visitor until they tapped Accept. `/app/**`
 * has its own nested layout (`src/app/app/layout.tsx`) that is NOT nested
 * under this one, so moving the banner here structurally guarantees it can
 * never render above `BottomNav` again — this isn't a pathname string
 * check that could silently rot, it's enforced by the route tree itself.
 *
 * A returning logged-in user has also typically already consented anyway,
 * so nothing is lost by not showing it inside `/app/**`.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CookieBanner />
    </>
  );
}

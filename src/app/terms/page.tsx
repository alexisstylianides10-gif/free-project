import type { Metadata } from "next";
import { StaticContentPage, LegalDraftNotice } from "@/components/shared/StaticContentPage";
import { branding, siteUrl } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Terms of Service",
  alternates: { canonical: `${siteUrl}/terms` },
};

export default function TermsPage() {
  return (
    <StaticContentPage title="Terms of Service" lastUpdated="September 1, 2026">
      <LegalDraftNotice />

      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of {branding.name}, operated by
        [COMPANY NAME]. By creating an account or using {branding.name}, you agree to these Terms. If you do not
        agree, please do not use {branding.name}.
      </p>

      <h2 className="text-body font-semibold text-foreground">Your account</h2>
      <p>
        You need an account to use {branding.name}. You&rsquo;re responsible for keeping your login details
        secure and for all activity that happens under your account. Tell us at [CONTACT EMAIL] if you think your
        account has been accessed without your permission.
      </p>
      <p>
        When you sign up, you choose a track (student or founder) and complete a short onboarding flow. Your
        track is locked once onboarding is complete so the app can build itself around it correctly; if you
        signed up on the wrong track, contact us and we&rsquo;ll help.
      </p>

      <h2 className="text-body font-semibold text-foreground">Using {branding.name}</h2>
      <p>You agree to use {branding.name} only for its intended purpose: organizing your schoolwork or your business plan, and using the tools we provide to support that. You agree not to:</p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Use the app to store or share content that is illegal, harmful, or infringes someone else&rsquo;s rights.</li>
        <li>Attempt to access another user&rsquo;s account or data.</li>
        <li>Attempt to disrupt, reverse-engineer, or abuse the app or the AI features (for example, using them for purposes unrelated to your studies or business, or in ways designed to bypass usage limits).</li>
        <li>Resell or provide commercial access to {branding.name} to others without our permission.</li>
      </ul>
      <p>We may suspend or terminate accounts that violate these Terms.</p>

      <h2 className="text-body font-semibold text-foreground">Your content</h2>
      <p>
        You own the content you create in {branding.name} (your homework, notes, business plans, and similar
        material). You grant us a limited license to store, process, and display that content back to you, and
        to send relevant parts of it to our AI provider, Stripe, and Supabase, solely to operate the app for you.
        See our <a href="/privacy" className="font-semibold text-foreground underline underline-offset-4">Privacy Policy</a> for details.
      </p>

      <h2 className="text-body font-semibold text-foreground">AI features</h2>
      <p>
        {branding.name}&rsquo;s AI features (the AI Coach, generated study plans, quizzes, and research tools) use
        a third-party AI model to generate responses. AI-generated content can be incomplete or inaccurate. It is
        provided to help you study or plan, not as a substitute for your teacher, school, professional accountant,
        lawyer, or other qualified advisor, and you should use your own judgment before relying on it, especially
        for graded work or business decisions.
      </p>

      <h2 className="text-body font-semibold text-foreground">Subscriptions and billing</h2>
      <p>
        Core organizational features of {branding.name} are free. Some features (including AI tools) require a
        paid {branding.name} Plus subscription, billed through Stripe on the interval you select at checkout.
        Subscriptions renew automatically until you cancel. You can manage or cancel your subscription from
        within the app at any time; cancelling stops future renewals but does not automatically refund the
        current billing period unless required by law.
      </p>

      <h2 className="text-body font-semibold text-foreground">Ending your account</h2>
      <p>
        You can stop using {branding.name} at any time. Self-service account deletion is being added to the app;
        until it ships, you can request deletion of your account at any time by emailing [CONTACT EMAIL]. We may
        also suspend or close accounts that violate these Terms.
      </p>

      <h2 className="text-body font-semibold text-foreground">Disclaimers and limitation of liability</h2>
      <p>
        {branding.name} is provided &ldquo;as is.&rdquo; We work to keep it accurate and available, but we do not
        guarantee it will be uninterrupted, error-free, or that AI-generated content will always be correct. To
        the fullest extent permitted by law, [COMPANY NAME] is not liable for indirect, incidental, or
        consequential damages arising from your use of {branding.name}.
      </p>

      <h2 className="text-body font-semibold text-foreground">Changes to these Terms</h2>
      <p>
        We may update these Terms as {branding.name} changes. We&rsquo;ll update the &ldquo;draft last
        updated&rdquo; date above when we do, and material changes will be communicated in-app or by email where
        practical. Continuing to use {branding.name} after a change means you accept the updated Terms.
      </p>

      <h2 className="text-body font-semibold text-foreground">Contact</h2>
      <p>
        Questions about these Terms? Contact us at [CONTACT EMAIL]. Our registered address is [ADDRESS].
      </p>
    </StaticContentPage>
  );
}

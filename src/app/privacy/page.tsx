import type { Metadata } from "next";
import { StaticContentPage, LegalDraftNotice } from "@/components/shared/StaticContentPage";
import { branding, siteUrl } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: `${siteUrl}/privacy` },
};

export default function PrivacyPage() {
  return (
    <StaticContentPage title="Privacy Policy" lastUpdated="September 1, 2026">
      <LegalDraftNotice />

      <p>
        This Privacy Policy explains what information {branding.name} collects, how it is used, and the choices
        you have about it. It applies to the {branding.name} web app and any related services we operate.
      </p>

      <h2 className="text-body font-semibold text-foreground">Who we are</h2>
      <p>
        {branding.name} is operated by [COMPANY NAME]. If you have a question about this policy or your data,
        contact us at [CONTACT EMAIL]. Our registered address is [ADDRESS].
      </p>

      <h2 className="text-body font-semibold text-foreground">Information we collect</h2>
      <p>When you create an account, we collect the information you give us directly:</p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Account information: your name and email address.</li>
        <li>
          Onboarding information: whether you&rsquo;re using {branding.name} as a student or a founder, and the
          details that go with that (school/year group and subjects, or your business idea/stage).
        </li>
        <li>
          Content you create in the app: homework, exams and timetable entries, study materials and notes,
          flashcards and quiz results, business plans and milestones, and messages you send to the AI Coach.
        </li>
        <li>Billing information: handled by our payment processor, Stripe (see below). We do not store your card details ourselves.</li>
      </ul>
      <p>
        We do not use third-party advertising trackers, and we do not run persistent behavioral-advertising
        tracking of any kind on {branding.name}. See the cookie notice at the bottom of every page for the
        specific cookies we use.
      </p>

      <h2 className="text-body font-semibold text-foreground">How we use your information</h2>
      <p>We use the information above to:</p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Provide the core product: your dashboard, plan, study tools, and progress tracking.</li>
        <li>Power AI features (the AI Coach, study-plan generation, quiz generation, and similar tools).</li>
        <li>Process payments and manage your subscription.</li>
        <li>Communicate with you about your account (e.g. sign-in confirmation, important account notices).</li>
        <li>Keep the app secure and diagnose problems when something breaks.</li>
      </ul>

      <h2 className="text-body font-semibold text-foreground">Where your data is stored</h2>
      <p>
        Your account data and everything you create in the app is stored using Supabase, our database and
        authentication provider, on infrastructure located in the United States. By using {branding.name}, you
        understand your data will be processed and stored in the United States, which may have different data
        protection laws than your own country.
      </p>

      <h2 className="text-body font-semibold text-foreground">AI features and third-party processing</h2>
      <p>
        Some features of {branding.name}, including the AI Coach and AI-generated study plans, quizzes, and
        research, work by sending relevant information (such as your question, subjects, or study materials) to
        Anthropic, our AI provider, to generate a response using their Claude models. Anthropic processes this
        information to return a result to {branding.name}; we do not control Anthropic&rsquo;s own data-handling
        practices, and we encourage you to review Anthropic&rsquo;s own privacy policy for details on how they
        handle data submitted to their API. Do not paste sensitive personal information into AI features that you
        would not want processed by a third-party AI provider.
      </p>

      <h2 className="text-body font-semibold text-foreground">Payments</h2>
      <p>
        Subscription payments are processed by Stripe. When you subscribe to {branding.name} Plus, your payment
        details are collected and processed directly by Stripe under Stripe&rsquo;s own privacy policy.
        {` ${branding.name}`} never receives or stores your full card number.
      </p>

      <h2 className="text-body font-semibold text-foreground">We do not sell your data</h2>
      <p>
        We do not sell your personal data to third parties, and we do not share your homework, business, or
        conversation content with anyone except the service providers named in this policy (Supabase, Anthropic,
        Stripe), each of whom processes it only to provide their part of the service to us.
      </p>

      <h2 className="text-body font-semibold text-foreground">Your choices and account deletion</h2>
      <p>
        You can review and correct most of your account information from within the app. Self-service account
        deletion is being added to {branding.name}; until it ships, you can request deletion of your account and
        associated data at any time by emailing [CONTACT EMAIL], and we will action it in a reasonable timeframe.
      </p>

      <h2 className="text-body font-semibold text-foreground">Students and minors</h2>
      <p>
        {branding.name} is used by students, some of whom may be under 18. We do not run behavioral-advertising
        tracking or public leaderboards, and we do not knowingly sell any user&rsquo;s data, minor or otherwise.
        If you are a parent or guardian and want to review, correct, or request deletion of your child&rsquo;s
        data, contact us at [CONTACT EMAIL] and we will work with you directly.
      </p>

      <h2 className="text-body font-semibold text-foreground">Changes to this policy</h2>
      <p>
        We may update this policy as {branding.name} changes. We&rsquo;ll update the &ldquo;draft last
        updated&rdquo; date above when we do. Material changes will be communicated in-app or by email where
        practical.
      </p>

      <p>Questions about this policy or your data? Contact us at [CONTACT EMAIL].</p>
    </StaticContentPage>
  );
}

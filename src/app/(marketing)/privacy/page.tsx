export const metadata = { title: "Privacy Policy" };

const updated = "August 12, 2026";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Privacy Policy</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">Last updated {updated}</p>

      <div className="prose-legal mt-8 space-y-6 text-[14.5px] leading-relaxed text-foreground">
        <p>
          Alxioum (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is operated by{" "}
          <strong>[Your Company Name — not yet finalized]</strong>, based in <strong>[Your Jurisdiction — not yet finalized]</strong>.
          This policy explains what we collect, why, and how you can see or delete it. It&apos;s written in plain language because we&apos;d
          rather you actually read it.
        </p>

        <section>
          <h2 className="text-[17px] font-semibold">What we collect</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li><strong>Account data</strong>: your email and password (handled by Supabase Auth; we never see or store your raw password).</li>
            <li><strong>Content you create</strong>: calendar events, tasks, memories, and chat messages — only what you enter or ask Alxioum to save.</li>
            <li><strong>Activity history</strong>: a log of actions Alxioum has taken on your behalf (what, when, success or failure), so you have an audit trail.</li>
            <li><strong>Usage counters</strong>: how many AI actions you&apos;ve used this billing period, to enforce plan limits. We do not log the content of your conversations for analytics purposes beyond what&apos;s needed to make the product work.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[17px] font-semibold">How your data reaches the AI model</h2>
          <p className="mt-2">
            When you send a message in Chat, we send Anthropic (which powers Alxioum&apos;s Head Agent) your message, a short
            summary of relevant context (e.g. today&apos;s event count, not your whole database), and the last few turns of that
            conversation — never your full history and never other users&apos; data. Anthropic processes this to generate a
            response and is bound by its own data-handling terms; we do not permit training on your data through our API usage.
          </p>
        </section>

        <section>
          <h2 className="text-[17px] font-semibold">What we never do</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>We do not sell your data.</li>
            <li>We do not show you third-party advertising or share your data with advertisers.</li>
            <li>We do not create, change, or delete anything in your account without an explicit confirmation from you, except when you use manual editing screens (Calendar, Tasks, Memory) yourself.</li>
            <li>We do not invent or fabricate information about you — Alxioum only acts on data actually stored in your account.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[17px] font-semibold">Your rights</h2>
          <p className="mt-2">You can, at any time, from Settings:</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>View everything Alxioum knows about you (&ldquo;What Alxioum knows&rdquo;).</li>
            <li>Export your data as a JSON file.</li>
            <li>Delete individual items (an event, a task, a memory).</li>
            <li>Delete all of your data permanently, or delete your account entirely by contacting us.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[17px] font-semibold">Security</h2>
          <p className="mt-2">
            Your data is stored in a Postgres database (Supabase) with row-level security, meaning every query is scoped to your
            authenticated account at the database level — not just in application code. Our AI provider API key is stored
            server-side only and is never exposed to your browser.
          </p>
        </section>

        <section>
          <h2 className="text-[17px] font-semibold">Cookies and local storage</h2>
          <p className="mt-2">
            We don&apos;t use advertising or tracking cookies. Your browser stores your session token and theme preference locally
            so you stay signed in — see our <a href="/cookies" className="text-accent underline underline-offset-2">Cookies page</a> for details.
          </p>
        </section>

        <section>
          <h2 className="text-[17px] font-semibold">Contact</h2>
          <p className="mt-2">
            Questions about this policy or your data: <strong>[support@your-domain — not yet finalized]</strong>.
          </p>
        </section>

        <p className="text-[13px] text-muted-foreground">
          This document is a starting point for a real product and has not been reviewed by a lawyer. Replace the bracketed
          placeholders with your actual company/jurisdiction details, and have it reviewed before relying on it commercially.
        </p>
      </div>
    </div>
  );
}

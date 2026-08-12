export const metadata = { title: "Terms of Service" };

const updated = "August 12, 2026";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Terms of Service</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">Last updated {updated}</p>

      <div className="mt-8 space-y-6 text-[14.5px] leading-relaxed text-foreground">
        <p>
          These terms govern your use of Alxioum, operated by <strong>[Your Company Name — not yet finalized]</strong>. By creating
          an account, you agree to them.
        </p>

        <section>
          <h2 className="text-[17px] font-semibold">1. What Alxioum is</h2>
          <p className="mt-2">
            Alxioum is an AI assistant that can take actions in your calendar, tasks, and memory based on natural-language
            requests. Every action that creates, changes, or deletes something requires your explicit confirmation before it
            happens, unless you&apos;ve knowingly enabled an automation that says otherwise.
          </p>
        </section>

        <section>
          <h2 className="text-[17px] font-semibold">2. Your account</h2>
          <p className="mt-2">
            You&apos;re responsible for keeping your login credentials secure and for activity that happens under your account.
            You must be able to consent to these terms in your jurisdiction to use Alxioum.
          </p>
        </section>

        <section>
          <h2 className="text-[17px] font-semibold">3. AI behavior and limitations</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Alxioum uses a large language model. It can misunderstand requests, and you should review confirmation prompts before approving them — that&apos;s exactly why they exist.</li>
            <li>Alxioum will never execute a create, update, delete, or complete action without you confirming it first.</li>
            <li>Alxioum does not have unlimited bulk actions (e.g. &ldquo;delete everything&rdquo;) — actions are proposed and confirmed individually.</li>
            <li>We do not guarantee the AI&apos;s responses are complete, accurate, or suitable for any particular purpose. Don&apos;t rely on Alxioum for medical, legal, or financial decisions.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[17px] font-semibold">4. Plans and usage limits</h2>
          <p className="mt-2">
            The Free plan includes a limited number of AI actions per month; Pro increases that limit for a monthly or yearly
            fee, shown on our <a href="/pricing" className="text-accent underline underline-offset-2">Pricing page</a>. Limits and
            pricing may change; we&apos;ll show current terms before you upgrade. Manual (non-AI) use of Calendar, Tasks, and
            Memory is not limited by your AI action quota.
          </p>
        </section>

        <section>
          <h2 className="text-[17px] font-semibold">5. Acceptable use</h2>
          <p className="mt-2">
            Don&apos;t use Alxioum to break the law, abuse the service (e.g. automated scraping, attempting to bypass usage limits
            or rate limits), or attempt to access another user&apos;s data.
          </p>
        </section>

        <section>
          <h2 className="text-[17px] font-semibold">6. Termination</h2>
          <p className="mt-2">
            You can delete your data or stop using Alxioum at any time from Settings. We may suspend accounts that violate these
            terms.
          </p>
        </section>

        <section>
          <h2 className="text-[17px] font-semibold">7. Liability</h2>
          <p className="mt-2">
            Alxioum is provided &ldquo;as is.&rdquo; To the extent permitted by law, we are not liable for indirect or consequential damages
            arising from your use of the service, including actions you confirmed that produced an unintended result.
          </p>
        </section>

        <section>
          <h2 className="text-[17px] font-semibold">8. Contact</h2>
          <p className="mt-2">Questions about these terms: <strong>[support@your-domain — not yet finalized]</strong>.</p>
        </section>

        <p className="text-[13px] text-muted-foreground">
          This document is a starting point for a real product and has not been reviewed by a lawyer. Replace the bracketed
          placeholders and have it reviewed before relying on it commercially.
        </p>
      </div>
    </div>
  );
}

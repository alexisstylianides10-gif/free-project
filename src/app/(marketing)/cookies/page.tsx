export const metadata = { title: "Cookies" };

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Cookies &amp; local storage</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">Last updated August 12, 2026</p>

      <div className="mt-8 space-y-6 text-[14.5px] leading-relaxed text-foreground">
        <p>Alxioum does not use advertising or tracking cookies. Here&apos;s everything your browser stores locally and why:</p>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-[13.5px]">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Storage</th>
                <th className="px-4 py-2.5 font-semibold">Purpose</th>
                <th className="px-4 py-2.5 font-semibold">Lifetime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-2.5">Supabase auth session (local storage)</td>
                <td className="px-4 py-2.5">Keeps you signed in between visits.</td>
                <td className="px-4 py-2.5">Until you sign out or it expires.</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5">Theme preference (local storage)</td>
                <td className="px-4 py-2.5">Remembers light/dark/system choice.</td>
                <td className="px-4 py-2.5">Until you change it.</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5">Service worker cache</td>
                <td className="px-4 py-2.5">Lets Alxioum be installed as an app and load its icon offline. Never caches your data.</td>
                <td className="px-4 py-2.5">Until updated or cleared.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>You can clear all of this at any time by clearing your browser&apos;s site data for Alxioum, or by signing out.</p>
      </div>
    </div>
  );
}

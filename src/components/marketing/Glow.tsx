export function Glow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={
        "pointer-events-none absolute rounded-full opacity-40 blur-[110px] " + (className ?? "")
      }
    />
  );
}

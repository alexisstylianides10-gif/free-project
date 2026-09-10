import Image from "next/image";
import { cn } from "@/lib/utils";

/** The Alxioum "A" brand mark, used across auth screens, the landing page,
 * and the loading screen wherever `branding.markLetter` used to render a
 * plain letter in a gradient box. */
export function LogoMark({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/branding/mark-256.png"
      alt=""
      width={256}
      height={256}
      priority
      className={cn("shrink-0 rounded-xl object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}

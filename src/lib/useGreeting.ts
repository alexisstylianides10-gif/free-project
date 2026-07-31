"use client";

import { useEffect, useState } from "react";

/** Starts with a neutral value so SSR and first client render match, then
 * swaps to a time-aware greeting after mount (avoids hydration mismatches
 * from server/client timezone differences). */
export function useGreeting(): string {
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  return greeting;
}

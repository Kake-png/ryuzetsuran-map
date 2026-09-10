"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * The site frame owns one scroll container for all public routes. Reset that
 * container when the route changes so a long guide page cannot make the next
 * page open halfway down. Query-only changes (map filters and selected pins)
 * intentionally keep their current position.
 */
export function ScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    const content = document.querySelector<HTMLElement>(".site-page-content");
    content?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

"use client";

import { ArrowLeft, BookOpenText, Flower2, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const pathname = usePathname();
  const onMap = pathname === "/";
  const spotId = pathname.match(/^\/spots\/([^/]+)$/)?.[1];
  const mapHref = spotId ? `/?spot=${encodeURIComponent(decodeURIComponent(spotId))}` : "/";

  return (
    <header className="site-header">
      <Link href="/" className="brand-lockup" aria-label="リュウゼツランマップの地図へ">
        <span className="brand-mark" aria-hidden="true"><Flower2 /></span>
        <span>
          <span className="brand-kicker">FIELD ATLAS · AGAVE AMERICANA</span>
          <strong>リュウゼツランマップ</strong>
        </span>
      </Link>
      <nav className="header-actions" aria-label="サイト内メニュー">
        {onMap ? (
          <>
            <Link href="/guide" className="header-guide-link" aria-label="観察・育成帖を見る"><BookOpenText aria-hidden="true" /><span>観察・育成帖</span></Link>
            <Button variant="ghost" onClick={() => window.dispatchEvent(new Event("ryuzetsuran:rules"))}>
              <ShieldCheck /><span className="desktop-label">掲載と見学のルール</span>
            </Button>
            <Button className="submit-button" onClick={() => window.dispatchEvent(new Event("ryuzetsuran:submit"))}>
              <Plus />
              <span className="submit-label-long">投稿する</span>
              <span className="submit-label-short">投稿</span>
            </Button>
          </>
        ) : (
          <Link href={mapHref} className="header-map-link"><ArrowLeft aria-hidden="true" />地図に戻る</Link>
        )}
      </nav>
    </header>
  );
}

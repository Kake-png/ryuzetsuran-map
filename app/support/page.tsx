import type { Metadata } from "next";
import { ArrowLeft, HeartHandshake } from "lucide-react";
import Link from "next/link";

import { SiteFooter } from "@/app/site-footer";

export const metadata: Metadata = {
  title: "運営を応援する",
  description: "リュウゼツランマップの運営について。",
  robots: { index: false, follow: true },
};

export default function SupportPage() {
  return (
    <main className="support-shell">
      <header className="spot-masthead">
        <Link href="/"><ArrowLeft aria-hidden="true" />地図へ戻る</Link>
        <span>ABOUT SUPPORT</span>
      </header>
      <section className="support-note">
        <HeartHandshake aria-hidden="true" />
        <p>FIELD ATLAS · SUPPORT</p>
        <h1>運営を応援する</h1>
        <p>地点情報の整理や写真の保管など、地図を長く続けるための応援窓口を準備しています。</p>
        <p>受付を始めたら、このページでお知らせします。</p>
        <Link href="/">リュウゼツランを地図で見る</Link>
      </section>
      <SiteFooter />
    </main>
  );
}

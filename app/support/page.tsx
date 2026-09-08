import type { Metadata } from "next";
import { ArrowUpRight, HeartHandshake } from "lucide-react";

export const metadata: Metadata = {
  title: "運営を応援する",
  description: "リュウゼツランマップの運営について。",
  robots: { index: false, follow: true },
};

export default function SupportPage() {
  return (
    <main className="support-shell">
      <section className="support-note">
        <HeartHandshake aria-hidden="true" />
        <p>FIELD ATLAS · SUPPORT</p>
        <h1>運営を応援する</h1>
        <p>地点情報の整理や写真の保管など、地図を長く続けるための運営費として使わせていただきます。</p>
        <p>支援の有無によって、地点の掲載や状態表示、修正・削除対応を変えることはありません。</p>
        <a href="https://ofuse.me/da117b13" target="_blank" rel="nofollow noopener noreferrer">
          OFUSEで応援する <ArrowUpRight aria-hidden="true" />
        </a>
      </section>
    </main>
  );
}

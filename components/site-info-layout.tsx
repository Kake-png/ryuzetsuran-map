import { ArrowLeft, Flower2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function SiteInfoLayout({
  kicker,
  title,
  lead,
  children,
}: {
  kicker: string;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <main className="info-shell">
      <header className="info-header">
        <Link href="/" className="info-brand" aria-label="リュウゼツランマップへ戻る">
          <span className="info-brand-mark" aria-hidden="true"><Flower2 /></span>
          <span>
            <small>RYUZETSU</small>
            <strong>リュウゼツランマップ</strong>
          </span>
        </Link>
        <Link href="/" className="info-back"><ArrowLeft />地図へ戻る</Link>
      </header>

      <div className="info-body">
        <section className="info-hero">
          <p>{kicker}</p>
          <h1>{title}</h1>
          <div>{lead}</div>
        </section>

        <div className="info-content">{children}</div>

        <footer className="info-footer">
          <nav aria-label="サイト情報">
            <Link href="/about">このサイトについて</Link>
            <Link href="/rules">利用ルール</Link>
            <Link href="/privacy">プライバシー</Link>
          </nav>
          <p>リュウゼツランマップは個人運営の情報共有サービスです。植物園・自治体などの公式サービスではありません。</p>
        </footer>
      </div>
    </main>
  );
}

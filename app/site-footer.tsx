import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-mini-footer">
      <span>リュウゼツランマップ</span>
      <nav aria-label="フッターメニュー">
        <Link href="/guide">観察・育成帖</Link>
        <Link href="/support">運営を応援する</Link>
      </nav>
    </footer>
  );
}

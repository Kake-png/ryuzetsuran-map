import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-mini-footer">
      <span>リュウゼツランマップ</span>
      <nav aria-label="フッターメニュー">
        <Link href="/guide">観察・育成帖</Link>
        <Link href="/grow">植物と育成用品</Link>
        <Link href="/support">運営を応援する</Link>
        <Link href="/policy">サイトポリシー</Link>
        <Link href="/privacy">プライバシー</Link>
      </nav>
    </footer>
  );
}

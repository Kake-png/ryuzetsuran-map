import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-mini-footer">
      <span>リュウゼツランマップ</span>
      <nav aria-label="フッターメニュー">
        <Link href="/guide"><span className="footer-label-long">観察・育成帖</span><span className="footer-label-short">観察帖</span></Link>
        <Link href="/grow"><span className="footer-label-long">植物と育成用品</span><span className="footer-label-short">育てる</span></Link>
        <Link href="/support"><span className="footer-label-long">運営を応援する</span><span className="footer-label-short">応援</span></Link>
        <Link href="/policy"><span className="footer-label-long">サイトポリシー</span><span className="footer-label-short">ポリシー</span></Link>
        <Link href="/privacy"><span className="footer-label-long">プライバシー</span><span className="footer-label-short">プライバシー</span></Link>
      </nav>
    </footer>
  );
}

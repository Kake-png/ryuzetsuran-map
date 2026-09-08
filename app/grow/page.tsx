import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, Box, Lightbulb, Sprout } from "lucide-react";
import Link from "next/link";

import { SiteFooter } from "@/app/site-footer";

export const metadata: Metadata = {
  title: "植物と育成用品",
  description: "小さな多肉植物と、鉢植えを始めるための道具の案内。",
};

const affiliateProducts = [
  {
    title: "ハオルチア",
    description: "丸みや透明感のある葉を、小さな鉢で楽しみたい人へ。",
    html: `<a href="https://hb.afl.rakuten.co.jp/ichiba/5751f097.1d8be35b.5751f098.1049a3b0/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fvistajapan%2F10000356%2F&link_type=pict&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0Iiwic2l6ZSI6IjI0MHgyNDAiLCJuYW0iOjEsIm5hbXAiOiJyaWdodCIsImNvbSI6MSwiY29tcCI6ImRvd24iLCJwcmljZSI6MCwiYm9yIjoxLCJjb2wiOjEsImJidG4iOjEsInByb2QiOjAsImFtcCI6ZmFsc2V9" target="_blank" rel="nofollow sponsored noopener" style="word-wrap:break-word;"><img src="https://hbb.afl.rakuten.co.jp/hgb/5751f097.1d8be35b.5751f098.1049a3b0/?me_id=1315485&item_id=10000368&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fvistajapan%2Fcabinet%2F13116663%2Fimgrc0126375865.jpg%3F_ex%3D240x240&s=240x240&t=pict" border="0" style="margin:2px" alt="" title=""></a>`,
  },
  {
    title: "アガベ・トウメヤナ・ベラ",
    description: "白い糸状の繊維が特徴的な、小型のアガベ。",
    html: `<a href="https://hb.afl.rakuten.co.jp/ichiba/57527bda.8a5da43e.57527bdb.7a24c51c/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fyukei%2Fs13233v%2F&link_type=pict&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0Iiwic2l6ZSI6IjI0MHgyNDAiLCJuYW0iOjEsIm5hbXAiOiJyaWdodCIsImNvbSI6MSwiY29tcCI6ImRvd24iLCJwcmljZSI6MCwiYm9yIjoxLCJjb2wiOjEsImJidG4iOjEsInByb2QiOjAsImFtcCI6ZmFsc2V9" target="_blank" rel="nofollow sponsored noopener" style="word-wrap:break-word;"><img src="https://hbb.afl.rakuten.co.jp/hgb/57527bda.8a5da43e.57527bdb.7a24c51c/?me_id=1223811&item_id=10041186&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fyukei%2Fcabinet%2Fyukei15%2Fs13233.jpg%3F_ex%3D240x240&s=240x240&t=pict" border="0" style="margin:2px" alt="" title=""></a>`,
  },
  {
    title: "小さな鉢に使いやすい細口じょうろ",
    description: "根元を狙って、少しずつ水を注ぎやすい小型の水差し。",
    html: `<a href="https://hb.afl.rakuten.co.jp/ichiba/575284b5.29312d7e.575284b6.57060614/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fasia-kobo%2F94838%2F&link_type=pict&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0Iiwic2l6ZSI6IjI0MHgyNDAiLCJuYW0iOjEsIm5hbXAiOiJyaWdodCIsImNvbSI6MSwiY29tcCI6ImRvd24iLCJwcmljZSI6MCwiYm9yIjoxLCJjb2wiOjEsImJidG4iOjEsInByb2QiOjAsImFtcCI6ZmFsc2V9" target="_blank" rel="nofollow sponsored noopener" style="word-wrap:break-word;"><img src="https://hbb.afl.rakuten.co.jp/hgb/575284b5.29312d7e.575284b6.57060614/?me_id=1201643&item_id=10025031&pc=https%3A%2F%2Fimage.rakuten.co.jp%2Fasia-kobo%2Fcabinet%2Fq007%2F94838_7.jpg%3F_ex%3D240x240&s=240x240&t=pict" border="0" style="margin:2px" alt="" title=""></a>`,
  },
];

const basics = [
  {
    icon: Box,
    title: "小さめの鉢",
    text: "根の量に合う、底穴のある鉢から。最初から大きすぎる鉢にせず、乾き方をつかむのを優先します。",
  },
  {
    icon: Sprout,
    title: "排水性のよい用土",
    text: "多肉植物用の土を基準に、季節や置き場に合わせて乾き方を調整します。水をため込む土は避けます。",
  },
  {
    icon: Lightbulb,
    title: "置き場に合わせた光",
    text: "まずは明るさと風通しを確保。室内だけで育てる場合は、植物用ライトを検討します。",
  },
];

export default function GrowPage() {
  return (
    <main className="grow-shell">
      <header className="spot-masthead">
        <Link href="/guide"><ArrowLeft aria-hidden="true" />観察・育成帖へ戻る</Link>
        <span>GROWING NOTES</span>
      </header>
      <article className="grow-page">
        <header>
          <p>SMALL PLANTS · GROWING TOOLS</p>
          <h1>小さな鉢から、<br />育ててみる。</h1>
          <p>ハオルチアや小型アガベと、育て始めるときに役立つ道具をまとめます。</p>
        </header>
        <div className="grow-basics">
          {basics.map((item) => (
            <section key={item.title}>
              <item.icon aria-hidden="true" />
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </section>
          ))}
        </div>
        <section className="grow-affiliate-note" aria-labelledby="affiliate-heading">
          <p>ADVERTISEMENT · 楽天アフィリエイト</p>
          <h2 id="affiliate-heading">植物と育成用品を探す</h2>
          <p>以下の画像リンクを経由して購入された場合、サイト運営者に紹介料が入ることがあります。</p>
          <div className="affiliate-product-grid">
            {affiliateProducts.map((product) => (
              <article className="affiliate-product-card" key={product.title}>
                <div className="affiliate-product-image" dangerouslySetInnerHTML={{ __html: product.html }} />
                <h3>{product.title}</h3>
                <p>{product.description}</p>
              </article>
            ))}
          </div>
          <Link href="/guide">観察・育成帖を読む <ArrowUpRight aria-hidden="true" /></Link>
        </section>
      </article>
      <SiteFooter />
    </main>
  );
}

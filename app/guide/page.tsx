import type { Metadata } from "next";
import {
  ArrowLeft,
  Camera,
  MapPinned,
  NotebookPen,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "観察・育成帖 | リュウゼツランマップ",
  description: "アオノリュウゼツランを安全に観察し、記録し、育てるための小さな案内。",
};

const chapters = [
  {
    id: "observe",
    number: "01",
    label: "FIELDWORK",
    title: "観察する",
    icon: MapPinned,
    text: "開花期は短く、現地の様子は日々変わります。地図の更新日を確かめ、公開された園路や公道から静かに観察してください。",
    points: [
      "敷地へ入らず、現地の掲示や開園時間を優先する",
      "長時間の路上駐車や、通行を妨げる撮影をしない",
      "位置が正しくても、訪問できる場所とは限らない",
    ],
  },
  {
    id: "record",
    number: "02",
    label: "FIELD NOTE",
    title: "記録する",
    icon: NotebookPen,
    text: "同じ株を継続して記録すると、花茎が伸びる速さや開花後の変化が見えてきます。見た事実と推測を分けるのが、後から役立つ記録のこつです。",
    points: [
      "観察日、状態、株数、変化した点を残す",
      "前回の記録と同じ構図の写真を一枚撮る",
      "投稿時に発行された管理キーは手元に保管する",
    ],
  },
  {
    id: "grow",
    number: "03",
    label: "CULTIVATION",
    title: "育てる",
    icon: Sprout,
    text: "アオノリュウゼツランは大きく育つため、将来の株幅と葉先の鋭さまで考えて置き場所を選びます。野外の株から子株や葉を持ち帰らず、流通している株を選んでください。",
    points: [
      "水はけのよい用土と、倒れにくい鉢を選ぶ",
      "人が通る場所から離し、葉先によるけがを防ぐ",
      "地域の気候に合わせ、寒さと過湿への対策をする",
    ],
  },
  {
    id: "photograph",
    number: "04",
    label: "PHOTOGRAPHY",
    title: "撮影する",
    icon: Camera,
    text: "写真は状態確認の大切な資料です。一方で、背景に人、表札、車両ナンバーや住居の様子が写ると、植物以外の情報まで公開してしまいます。",
    points: [
      "全体像と、変化が分かる部分を一枚ずつ撮る",
      "人物や生活情報が写っていないか送信前に確認する",
      "危険な位置取りや、撮影のための立ち入りをしない",
    ],
  },
];

export default function GuidePage() {
  return (
    <main className="guide-shell">
      <header className="guide-masthead">
        <Link href="/" className="guide-back-link"><ArrowLeft aria-hidden="true" />地図へ戻る</Link>
        <p>RYUZETSURAN FIELD ATLAS · NOTE 01</p>
      </header>

      <section className="guide-hero">
        <div className="guide-hero-copy">
          <p className="plate-number">SPECIES 01</p>
          <h1>アオノリュウゼツラン<br />観察・育成帖</h1>
          <p className="latin-name"><i>Agave americana</i></p>
          <p className="guide-lead">
            長い年月をかけて育ち、やがて高い花茎を伸ばすアオノリュウゼツラン。
            見つけた株を安全に観察し、次の人へ記録を渡すための案内です。
          </p>
          <dl className="species-summary">
            <div><dt>和名</dt><dd>アオノリュウゼツラン</dd></div>
            <div><dt>学名</dt><dd><i>Agave americana</i></dd></div>
            <div><dt>記録対象</dt><dd>開花前から、開花後・子株まで</dd></div>
          </dl>
        </div>
        <figure className="botanical-plate">
          <Image
            src="/agave-botanical-plate.webp"
            alt="花茎を伸ばしたアオノリュウゼツランをもとにした植物画"
            width={768}
            height={1152}
            priority
          />
          <figcaption>装飾用植物画／アオノリュウゼツランをもとにした図</figcaption>
        </figure>
      </section>

      <nav className="guide-index" aria-label="観察・育成帖の目次">
        {chapters.map((chapter) => (
          <a href={`#${chapter.id}`} key={chapter.id}>
            <span>{chapter.number}</span>{chapter.title}
          </a>
        ))}
      </nav>

      <article className="guide-chapters">
        {chapters.map((chapter) => (
          <section id={chapter.id} className="guide-chapter" key={chapter.id}>
            <header>
              <span className="chapter-number">{chapter.number}</span>
              <chapter.icon aria-hidden="true" />
              <div>
                <p>{chapter.label}</p>
                <h2>{chapter.title}</h2>
              </div>
            </header>
            <p>{chapter.text}</p>
            <ul>
              {chapter.points.map((point) => <li key={point}>{point}</li>)}
            </ul>
          </section>
        ))}
      </article>

      <section className="guide-commerce-note" aria-labelledby="commerce-heading">
        <div>
          <p className="plate-number">SITE POLICY</p>
          <h2 id="commerce-heading">道具の紹介と広告について</h2>
        </div>
        <div className="commerce-copy">
          <p>
            今後、この観察帖で鉢・用土・書籍・撮影用品などを紹介し、リンク先で購入された場合に運営へ紹介料が入ることがあります。その場合は、対象のリンク付近に広告・アフィリエイトであることを明記します。
          </p>
          <p>
            地図画面には広告を置きません。協賛や広告の有無によって、地点の掲載順位、植物の状態判定、修正・削除対応を変えることもありません。
          </p>
        </div>
      </section>

      <footer className="guide-footer">
        <div>
          <ShieldCheck aria-hidden="true" />
          <p>観察は、植物より先に周囲の安全と暮らしを確認してから。</p>
        </div>
        <Link href="/">地図で探す</Link>
      </footer>
    </main>
  );
}

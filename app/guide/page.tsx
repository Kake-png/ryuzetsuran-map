import type { Metadata } from "next";
import {
  ArrowLeft,
  Camera,
  Leaf,
  MapPinned,
  NotebookPen,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "観察帖と小さな多肉植物入門 | リュウゼツランマップ",
  description: "アオノリュウゼツランを安全に観察する方法と、小さな鉢で楽しめる多肉植物の入門案内。",
};

const fieldChapters = [
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
      "観察日、状態、株数、前回から変わった点を残す",
      "全体像と変化した部分を、同じ構図で一枚ずつ撮る",
      "人物、表札、車両ナンバーが写っていないか確認する",
    ],
  },
];

const smallPlants = [
  {
    name: "ハオルチア",
    latin: "Haworthia / Haworthiopsis",
    icon: Leaf,
    lead: "丸みや透明感のある葉を、小さな鉢で眺めたい人向け。アガベとは別の仲間ですが、室内で始めやすい選択肢です。",
    facts: [
      ["大きさ", "多くは小鉢で管理しやすい"],
      ["置き場", "明るい日陰や室内の窓辺"],
      ["寒さ", "強い霜や凍結を避けて室内へ"],
    ],
  },
  {
    name: "アガベ・笹の雪",
    latin: "Agave victoriae-reginae",
    icon: Sprout,
    lead: "整った白い模様が人気の小型アガベ。大型種より鉢で管理しやすく、リュウゼツランらしい姿も楽しめます。葉先は鋭いため置き場には注意が必要です。",
    facts: [
      ["大きさ", "多くのアガベより小型で鉢管理しやすい"],
      ["置き場", "日当たりと風通しのよい場所"],
      ["寒さ", "霜・凍結と冬の過湿を避ける"],
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

      <section className="guide-hero" id="americana">
        <div className="guide-hero-copy">
          <p className="plate-number">PART I · SPECIES 01</p>
          <h1>アオノリュウゼツラン<br />観察帖</h1>
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
          <img
            src="/agave-botanical-plate.webp"
            alt="花茎を伸ばしたアオノリュウゼツランをもとにした植物画"
            width={768}
            height={1152}
          />
          <figcaption>装飾用植物画／アオノリュウゼツランをもとにした図</figcaption>
        </figure>
      </section>

      <nav className="guide-index" aria-label="観察・育成帖の目次">
        <a href="#americana"><span>I</span>アオノリュウゼツラン</a>
        <a href="#observe"><span>01</span>観察する</a>
        <a href="#record"><span>02</span>記録する</a>
        <a href="#small-plants"><span>II</span>小さな多肉植物</a>
      </nav>

      <article className="guide-chapters">
        {fieldChapters.map((chapter) => (
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

      <section className="small-plant-section" id="small-plants">
        <header className="guide-part-heading">
          <div>
            <p className="plate-number">PART II · SMALL SUCCULENTS</p>
            <h2>小さな鉢から始める</h2>
          </div>
          <p>
            アオノリュウゼツランを家で再現しようとすると、株幅や鋭い葉先への備えが必要です。
            ここでは、鉢から大きく張り出しにくい植物を入り口にします。
          </p>
        </header>

        <div className="small-plant-grid">
          {smallPlants.map((plant) => (
            <article className="small-plant-card" key={plant.name}>
              <header>
                <plant.icon aria-hidden="true" />
                <div><h3>{plant.name}</h3><p><i>{plant.latin}</i></p></div>
              </header>
              <p>{plant.lead}</p>
              <dl>
                {plant.facts.map(([label, value]) => (
                  <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                ))}
              </dl>
            </article>
          ))}
        </div>

        <aside className="plant-choice-note">
          <Sprout aria-hidden="true" />
          <div>
            <h3>どちらを選ぶ？</h3>
            <p>丸い姿と室内での眺めやすさならハオルチア、リュウゼツランらしい姿を小さな鉢で楽しむなら笹の雪。小さい植物でも、品種・地域・置き場によって育ち方は変わります。</p>
          </div>
        </aside>
      </section>

      <section className="guide-commerce-note" aria-labelledby="commerce-heading">
        <div>
          <p className="plate-number">TOOLS &amp; SITE POLICY</p>
          <h2 id="commerce-heading">小さく始める道具</h2>
        </div>
        <div className="commerce-copy">
          <p>
            今後は小鉢、排水性のよい用土、記録用ラベル、室内用ライトなどを、この育成帖の内容に必要な範囲で紹介します。紹介料が入るリンクには、広告・アフィリエイトであることを明記します。
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
        <Link href="/"><Camera aria-hidden="true" />地図で探す</Link>
      </footer>
    </main>
  );
}

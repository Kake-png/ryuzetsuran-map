import type { Metadata } from "next";
import {
  CalendarDays,
  ExternalLink,
  History,
  MapPin,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  BLOOM_STATUSES,
  LOCATION_TYPES,
  type PhotoAttribution,
} from "@/lib/agave";
import { getPublicAgave } from "@/lib/public-agave";

import { ShareButton } from "./share-button";

type SpotPageProps = { params: Promise<{ id: string }> };

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function PhotoCredit({ attribution }: { attribution: PhotoAttribution | null }) {
  if (!attribution) return <p className="spot-photo-credit">投稿写真</p>;
  return (
    <div className="spot-photo-credit">
      <span>写真：{attribution.author} · {attribution.license}</span>
      {attribution.sourceUrl && (
        <a href={attribution.sourceUrl} target="_blank" rel="noreferrer">
          原典 <ExternalLink aria-hidden="true" />
        </a>
      )}
      {attribution.licenseUrl && (
        <a href={attribution.licenseUrl} target="_blank" rel="noreferrer">
          利用条件 <ExternalLink aria-hidden="true" />
        </a>
      )}
      {attribution.changes && <span>加工：{attribution.changes}</span>}
    </div>
  );
}

export async function generateMetadata({ params }: SpotPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getPublicAgave(id);
  if (result.state !== "ready") {
    return { title: "地点情報", robots: { index: false, follow: false } };
  }

  const { pin } = result;
  const status = BLOOM_STATUSES[pin.status].label;
  const privateLocation = pin.locationType === "private_authorized";
  const description = `${pin.municipality}で記録されたアオノリュウゼツラン。現在の状態は「${status}」、最終観察日は${formatDate(pin.observedAt)}です。`;

  return {
    title: `${pin.municipality}のアオノリュウゼツラン｜開花状況・観察記録`,
    description,
    openGraph: { title: pin.title, description, type: "article" },
    twitter: { card: "summary", title: pin.title, description },
    robots: privateLocation
      ? { index: false, follow: false, noarchive: true }
      : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  };
}

export default async function SpotPage({ params }: SpotPageProps) {
  const { id } = await params;
  const result = await getPublicAgave(id);
  if (result.state === "not-found") notFound();

  if (result.state === "unavailable") {
    return (
      <main className="spot-shell">
        <section className="spot-unavailable">
          <h1>地点情報を読み込めませんでした</h1>
          <p>時間をおいて、もう一度お試しください。</p>
        </section>
      </main>
    );
  }

  const { pin } = result;
  const history = pin.observations.length
    ? pin.observations
    : [{
        id: `${pin.id}-initial`,
        status: pin.status,
        observedAt: pin.observedAt,
        description: pin.description,
        photoUrl: pin.photoUrl,
        photoAlt: pin.photoAlt,
        photoAttribution: pin.photoAttribution,
        verifiedSubmitter: true,
      }];
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: pin.title,
    description: pin.description || `${pin.municipality}のアオノリュウゼツラン観察記録`,
    dateModified: pin.observedAt,
    inLanguage: "ja-JP",
    about: { "@type": "Taxon", name: "Agave americana", alternateName: "アオノリュウゼツラン" },
  };

  return (
    <main className="spot-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <article className="spot-record">
        <header className="spot-record-heading">
          <p>AGAVE AMERICANA · OBSERVATION</p>
          <div className="spot-title-row">
            <div>
              <span className="spot-status" style={{ "--spot-status": BLOOM_STATUSES[pin.status].color } as React.CSSProperties}>
                {BLOOM_STATUSES[pin.status].label}
              </span>
              <h1>{pin.title}</h1>
            </div>
            <ShareButton title={pin.title} />
          </div>
          <div className="spot-declaration">
            {LOCATION_TYPES[pin.locationType]} <b>投稿者申告</b>
          </div>
        </header>

        <div className="spot-overview">
          <div>
            {pin.photoUrl ? (
              <figure className="spot-main-photo">
                <img src={pin.photoUrl} alt={pin.photoAlt || `${pin.title}の投稿写真`} />
                <figcaption><PhotoCredit attribution={pin.photoAttribution} /></figcaption>
              </figure>
            ) : (
              <div className="spot-no-photo">写真はまだありません</div>
            )}
          </div>
          <div className="spot-summary">
            <dl>
              <div><dt><MapPin aria-hidden="true" />場所</dt><dd>{pin.municipality}</dd></div>
              <div><dt><CalendarDays aria-hidden="true" />最終観察</dt><dd>{formatDate(pin.observedAt)}</dd></div>
              <div><dt><RefreshCw aria-hidden="true" />前回の開花</dt><dd>{pin.previousBloomYear ? `${pin.previousBloomYear}年ごろ` : "記録なし"}</dd></div>
            </dl>
            {pin.description && <p className="spot-description">{pin.description}</p>}
            <aside className="spot-access-note">
              <ShieldCheck aria-hidden="true" />
              <div><strong>見学時の注意</strong><p>{pin.accessNote || "現地の案内と周囲の生活環境を優先してください。"}</p></div>
            </aside>
          </div>
        </div>

        <section className="spot-history" aria-labelledby="spot-history-heading">
          <header>
            <History aria-hidden="true" />
            <div><p>OBSERVATION LOG</p><h2 id="spot-history-heading">観察履歴</h2></div>
            <span>{history.length}件</span>
          </header>
          <ol>
            {history.map((observation) => (
              <li key={observation.id}>
                <div className="spot-history-date">
                  <time dateTime={observation.observedAt}>{formatDate(observation.observedAt)}</time>
                  <span style={{ "--spot-status": BLOOM_STATUSES[observation.status].color } as React.CSSProperties}>
                    {BLOOM_STATUSES[observation.status].label}
                  </span>
                </div>
                <div className="spot-history-body">
                  {observation.photoUrl && (
                    <figure>
                      <img src={observation.photoUrl} alt={observation.photoAlt || "観察時の写真"} />
                      <figcaption><PhotoCredit attribution={observation.photoAttribution} /></figcaption>
                    </figure>
                  )}
                  {observation.description && <p>{observation.description}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="spot-record-actions">
          <Link href={`/?spot=${encodeURIComponent(pin.id)}`}>地図で位置を確認する</Link>
          <p>修正・削除の依頼と観察記録の追加は、地図の地点欄から受け付けています。</p>
        </div>
      </article>

    </main>
  );
}

import { MapApp } from "./map-app";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "リュウゼツランマップ",
  alternateName: "アオノリュウゼツラン開花・観察マップ",
  description: "リュウゼツラン（アオノリュウゼツラン）の開花情報・見られる場所・観察履歴を地図で共有するサイト。",
  inLanguage: "ja-JP",
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <MapApp />
    </>
  );
}

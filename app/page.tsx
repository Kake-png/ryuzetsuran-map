import { MapApp } from "./map-app";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "リュウゼツランマップ",
  alternateName: "アオノリュウゼツラン開花マップ",
  description: "アオノリュウゼツランの開花中・開花前・枯死後の記録を、観察履歴と地図で共有するフィールドアトラス。",
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

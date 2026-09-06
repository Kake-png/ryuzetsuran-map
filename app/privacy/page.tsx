import type { Metadata } from "next";

import { SiteInfoLayout } from "@/components/site-info-layout";

export const metadata: Metadata = {
  title: "プライバシー | リュウゼツランマップ",
  description: "リュウゼツランマップで保存・利用する情報について。",
};

export default function PrivacyPage() {
  return (
    <SiteInfoLayout
      kicker="PRIVACY"
      title="プライバシーについて"
      lead="現在のサイトが保存する情報と、その用途を簡潔にまとめています。機能追加にあわせて内容も更新します。"
    >
      <section className="info-section">
        <h2>投稿時に保存する情報</h2>
        <p>
          地図上で選択した位置、自治体名、観察日、開花状況、場所の種類、投稿者と場所の関係、補足説明、見学時の注意、任意の写真などを保存します。
          公開中の投稿では、地図表示に必要な位置や観察情報が一般に表示されます。
        </p>
        <p>
          投稿時に発行する管理キーそのものはサーバーには保存せず、照合用のハッシュ値を保存します。
          管理キーは投稿完了時に表示され、対応するブラウザのローカルストレージにも保存されます。
        </p>
      </section>

      <section className="info-section">
        <h2>写真</h2>
        <p>
          投稿画像は送信前にブラウザ上でWebPへ再変換し、撮影位置などの画像メタデータを除去します。
          変換後の画像はCloudflare R2に保存します。写真に写り込んだ文字や人物など、画像そのものに見える情報は自動では消えないため、投稿前に確認してください。
        </p>
      </section>

      <section className="info-section">
        <h2>修正・削除依頼</h2>
        <p>
          修正・削除依頼では、ピンID、依頼内容、理由、詳細、任意の連絡先メールアドレスを保存する場合があります。
          これらは掲載内容の確認や対応のために利用します。
        </p>
      </section>

      <section className="info-section">
        <h2>不正利用対策</h2>
        <p>
          短時間の大量投稿や同一地点への繰り返し申告を抑えるため、アクセス時のIPアドレスとブラウザ情報を用いて、ソルト付きのハッシュ値や回数カウンターを生成します。
          アプリケーションのD1データベースには、レート制限用途として生のIPアドレスを保存しません。
        </p>
      </section>

      <section className="info-section">
        <h2>現在地について</h2>
        <p>
          現行版では端末のGPS現在地を自動取得・保存していません。投稿地点はユーザーが地図上で選択します。
          将来、現在地を使った周辺検索や現地確認機能を追加する場合は、取得方法・保存有無をこのページで明示します。
        </p>
      </section>

      <section className="info-section">
        <h2>利用している外部サービス</h2>
        <p>
          サイトの配信、データベース、画像保存にはCloudflareを利用しています。地図表示にはOpenFreeMapの地図タイルを利用しています。
          投稿地点から市区町村を補完する際は、国土地理院の逆ジオコーダーおよび市区町村データをサーバー側から利用します。
          これらのサービスでは、それぞれの提供者が通信情報等を処理する場合があります。
        </p>
      </section>

      <section className="info-section">
        <h2>アクセス解析・広告</h2>
        <p>
          現行版のアプリケーションには、独自のアクセス解析用Cookieや広告配信用Cookieを実装していません。
          今後、アクセス解析、広告、アフィリエイト等を導入する場合は、実際の利用状況に合わせてこのページを更新します。
        </p>
      </section>
    </SiteInfoLayout>
  );
}

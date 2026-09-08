import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "リュウゼツランマップにおける情報の取り扱い。",
};

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <article className="legal-page">
        <header><p>RYUZETSURAN MAP · PRIVACY</p><h1>プライバシーポリシー</h1><time dateTime="2026-09-08">制定：2026年9月8日</time></header>
        <section><h2>取得する情報</h2><p>投稿では、地点、観察日、状態、説明、写真、投稿者が選んだ場所区分を受け取ります。修正・削除依頼では、依頼内容と、任意で連絡先メールアドレスを受け取ります。投稿・依頼の不正利用防止のため、送信元情報から復元できない形式の識別子を作成し、回数制限に利用します。</p></section>
        <section><h2>利用目的</h2><p>受け取った情報は、地図と観察履歴の表示、投稿内容の確認、削除・修正依頼への対応、不正投稿の防止、サイトの改善に利用します。連絡先メールアドレスは、依頼への確認が必要な場合にのみ使用します。</p></section>
        <section><h2>保存と削除</h2><p>公開された投稿は、掲載終了または削除されるまで保存します。削除要請の記録は、同じ場所の再登録防止や対応経緯の確認のため、必要な範囲で保持します。解決から90日を過ぎた依頼の連絡先メールアドレスと送信元識別子は削除します。</p></section>
        <section><h2>外部サービス</h2><p>このサイトは、配信・データベース・写真保管にCloudflareを利用します。地図表示と市区町村の補完では外部の地図サービスを利用し、アクセス傾向の把握にCloudflare Web AnalyticsとGoogle Analyticsを利用します。Google Analyticsでは、Cookieなどを用いて閲覧ページや利用環境の情報を統計的に収集します。植物・育成用品のページでは楽天アフィリエイトの商品画像を表示し、応援ページからはOFUSEへ移動できます。これらの表示や利用に必要な範囲で、通信情報が各提供者に送信される場合があります。</p></section>
        <section><h2>第三者提供</h2><p>法令にもとづく場合を除き、個人を特定できる連絡先情報を販売・貸与・目的外利用しません。投稿した地点・文章・写真は、地図と観察履歴として公開されることがあります。</p></section>
        <section><h2>お問い合わせ</h2><p>掲載済み地点・写真に関する削除または修正は、地図上の「修正・削除を依頼」から受け付けます。</p></section>
      </article>
    </main>
  );
}

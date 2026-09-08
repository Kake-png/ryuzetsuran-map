import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { SiteFooter } from "@/app/site-footer";

export const metadata: Metadata = {
  title: "サイトポリシー",
  description: "リュウゼツランマップの掲載・投稿・利用に関する方針。",
};

export default function PolicyPage() {
  return (
    <main className="legal-shell">
      <header className="spot-masthead">
        <Link href="/"><ArrowLeft aria-hidden="true" />地図へ戻る</Link>
        <span>SITE POLICY</span>
      </header>
      <article className="legal-page">
        <header><p>RYUZETSURAN MAP · POLICY</p><h1>サイトポリシー</h1><time dateTime="2026-09-08">制定：2026年9月8日</time></header>
        <section><h2>このサイトについて</h2><p>リュウゼツランマップは、アオノリュウゼツランの生育・開花・開花後の変化を、地図と観察履歴で記録するためのサイトです。掲載情報は、投稿者の観察・申告にもとづく記録です。</p></section>
        <section><h2>見学と現地での行動</h2><p>地図への掲載は、敷地への立ち入り、駐車、撮影その他の行為を許可するものではありません。公道・公開エリアから観察し、施設の案内、通行人、近隣の生活と安全を最優先にしてください。</p></section>
        <section><h2>投稿と写真</h2><p>投稿者は、無断で敷地へ立ち入らず、事実と推測を分けて投稿してください。写真は自ら撮影したもの、または掲載権限を持つものに限ります。無関係な人、表札、車両ナンバーなど、生活情報を含む写真は投稿できません。</p></section>
        <section><h2>掲載の見直し・削除</h2><p>私有地、生活、安全、権利侵害、誤情報などに関する申告を受けた場合、運営は該当地点を一時非公開、掲載終了または削除とすることがあります。削除・修正を希望する方は、地図上の「修正・削除を依頼」からお知らせください。</p></section>
        <section><h2>情報の扱いと免責</h2><p>開花状況や見学可能性は短期間で変わります。運営は掲載情報の正確性、完全性、最新性、現地での安全を保証しません。このサイトの利用または現地での行動によって生じた損害について、運営は法令上認められる範囲で責任を負いません。</p></section>
        <section><h2>広告・アフィリエイト</h2><p>育成用品などを紹介する際、広告またはアフィリエイトリンクである場合は、そのことをリンクの近くに明記します。支援の有無や広告掲載の有無によって、地点の掲載、状態表示、修正・削除対応を変えることはありません。</p></section>
      </article>
      <SiteFooter />
    </main>
  );
}

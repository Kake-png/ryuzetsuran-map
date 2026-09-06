"use client";

import { Eye, KeyRound, MapPinned, ShieldCheck, Siren, UserRoundX } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const rules = [
  {
    icon: MapPinned,
    title: "位置は、正確に出すか、出さないか",
    text: "私有地だけ曖昧な円で残すことはしません。閲覧者に役立たず、悪意ある人だけが探せる状態を避けるためです。",
  },
  {
    icon: ShieldCheck,
    title: "投稿できる場所を限定",
    text: "公園・公道から確認できる場所・来訪可能な施設は投稿できます。個人宅など非公開の私有地は、所有者本人または明示的な掲載許可を得た場合だけを投稿対象にします。",
  },
  {
    icon: Eye,
    title: "許可は投稿者の申告",
    text: "運営が一件ずつ許可の真正性を確認したとは表示しません。場所の区分と投稿者の関係を保存し、申告に基づく情報だと明確に扱います。",
  },
  {
    icon: Siren,
    title: "問題があれば、ピン全体を止める",
    text: "無許可の私有地や安全上の申告を受けた場合は、その場でピンを一時非公開にします。運営確認後、削除または復帰を決めます。",
  },
  {
    icon: KeyRound,
    title: "アカウントなしでも本人が取り下げ可能",
    text: "投稿時に一度だけ管理キーを発行します。キーを持つ投稿者は、依頼フォームから自分のピンをすぐ非公開にできます。",
  },
  {
    icon: UserRoundX,
    title: "人や生活情報を写真に入れない",
    text: "無関係な人、表札、車両ナンバーなどを含む写真は禁止します。写真はブラウザで再変換し、撮影位置などのメタデータを除去します。",
  },
];

export function SafetyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rules-dialog sm:max-w-2xl">
        <DialogHeader>
          <p className="dialog-kicker">SAFETY & OPERATION</p>
          <DialogTitle>掲載と見学のルール</DialogTitle>
          <DialogDescription>
            正確な地図として役立つことと、暮らしている人の安全を両立するための運用方針です。
          </DialogDescription>
        </DialogHeader>
        <div className="rules-list">
          {rules.map((rule) => (
            <article key={rule.title}>
              <div><rule.icon /></div>
              <section>
                <h3>{rule.title}</h3>
                <p>{rule.text}</p>
              </section>
            </article>
          ))}
        </div>
        <div className="visitor-rule">
          <strong>見に行く方へ</strong>
          <p>地図への掲載は、敷地への立入許可や駐車許可を意味しません。現地の案内、通行人、近隣の生活を最優先にしてください。</p>
        </div>
        <section className="disclaimer-section" aria-labelledby="disclaimer-heading">
          <h3 id="disclaimer-heading">免責事項</h3>
          <p>掲載情報は投稿者の申告と観察時点の記録です。運営は、正確性・完全性・最新性を保証しません。開花状況は短期間で変化するため、訪問前には施設などの公式情報も確認してください。</p>
          <p>この地図の利用や現地での行動により生じた事故・損害・近隣トラブルについて、運営は法令上認められる範囲で責任を負いません。問題のある掲載は、申告に応じて一時非公開または削除する場合があります。</p>
        </section>
      </DialogContent>
    </Dialog>
  );
}

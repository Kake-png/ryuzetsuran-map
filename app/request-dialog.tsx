"use client";

import { AlertTriangle, Check, KeyRound, MessageSquareWarning } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type RequestResult = {
  requestId: string;
  withdrawn?: boolean;
  temporarilyHidden?: boolean;
  message: string;
};

export function ChangeRequestDialog({
  open,
  onOpenChange,
  initialPinId,
  onHidden,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPinId: string;
  onHidden: () => Promise<void>;
}) {
  const [pinId, setPinId] = useState(initialPinId);
  const [kind, setKind] = useState("correction");
  const [reason, setReason] = useState("wrong_info");
  const [managementKey, setManagementKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RequestResult | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    setPinId(initialPinId);
    setResult(null);
    setError(null);
    setStartedAt(Date.now());
    if (initialPinId) {
      try {
        setManagementKey(localStorage.getItem(`agave-management-${initialPinId}`) ?? "");
      } catch {
        setManagementKey("");
      }
    }
  }, [initialPinId, open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      pinId,
      kind,
      reason,
      details: String(form.get("details") ?? ""),
      contactEmail: String(form.get("contactEmail") ?? ""),
      managementKey,
      startedAt,
      website: "",
    };
    setSubmitting(true);
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as RequestResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "依頼を送信できませんでした。");
      setResult(data);
      if (data.withdrawn || data.temporarilyHidden) await onHidden();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "依頼を送信できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="form-dialog sm:max-w-xl">
        {result ? (
          <div className="submission-success">
            <div className="success-icon"><Check /></div>
            <DialogHeader>
              <DialogTitle>依頼を受け付けました</DialogTitle>
              <DialogDescription>{result.message}</DialogDescription>
            </DialogHeader>
            <div className="request-id-box">
              <span>受付ID</span>
              <code>{result.requestId}</code>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>閉じる</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <p className="dialog-kicker">CORRECTION / TAKEDOWN</p>
              <DialogTitle>情報の修正・削除を依頼</DialogTitle>
              <DialogDescription>
                投稿者でなくても送信できます。私有地・生活への影響や安全に関する申告では、位置をぼかさずピン全体を一時非公開にします。
              </DialogDescription>
            </DialogHeader>

            <div className="form-grid request-form-grid">
              <label className="field-group field-wide">
                <span className="field-label">ピンID <b>必須</b></span>
                <Input
                  value={pinId}
                  onChange={(event) => setPinId(event.target.value.toUpperCase())}
                  required
                  placeholder="AGV-XXXXXXXX"
                />
              </label>
              <div className="field-group">
                <span className="field-label">依頼の種類 <b>必須</b></span>
                <Select value={kind} onValueChange={(value) => value && setKind(value)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="correction">情報を修正してほしい</SelectItem>
                    <SelectItem value="removal">ピンを削除してほしい</SelectItem>
                    <SelectItem value="safety">安全上の問題がある</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="field-group">
                <span className="field-label">理由 <b>必須</b></span>
                <Select value={reason} onValueChange={(value) => value && setReason(value)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private_property">私有地・生活への影響</SelectItem>
                    <SelectItem value="no_permission">私有地への掲載に関する懸念</SelectItem>
                    <SelectItem value="dangerous">見学に危険がある</SelectItem>
                    <SelectItem value="location_name">地点名を変更したい</SelectItem>
                    <SelectItem value="wrong_info">内容が間違っている</SelectItem>
                    <SelectItem value="duplicate">同じピンが重複している</SelectItem>
                    <SelectItem value="other">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="field-group field-wide">
                <span className="field-label">詳しい内容 <b>必須</b></span>
                <Textarea name="details" required minLength={10} maxLength={1600} placeholder="どの情報に問題があるか、どう直すべきかを具体的に書いてください。" />
                <span className="field-help">再掲載の防止と対応履歴のため内容は保存します。氏名・住所・電話番号など、不要な個人情報は書かないでください。</span>
              </label>
              <label className="field-group field-wide">
                <span className="field-label">連絡先メール（任意・非公開）</span>
                <Input name="contactEmail" type="email" maxLength={200} autoComplete="email" placeholder="確認が必要な場合だけ使用します" />
                <span className="field-help">依頼の確認以外には使わず、処理完了から90日後を目安にメールアドレスだけを消去します。</span>
              </label>
              <label className="field-group field-wide">
                <span className="field-label"><KeyRound />投稿管理キー（投稿者のみ・任意）</span>
                <Input
                  type="password"
                  value={managementKey}
                  onChange={(event) => setManagementKey(event.target.value)}
                  autoComplete="off"
                  placeholder="本人確認できると、自分の投稿はすぐ取り下げられます"
                />
              </label>
            </div>

            {(kind === "safety" || ["private_property", "no_permission"].includes(reason)) && (
              <div className="auto-hide-notice">
                <AlertTriangle />
                <p><strong>送信と同時に一時非公開になります</strong><br />位置を曖昧に残すことはせず、確認が終わるまでピン全体を地図から外します。</p>
              </div>
            )}

            <label className="trap-field" aria-hidden="true">
              ウェブサイト<Input name="website" tabIndex={-1} autoComplete="off" />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <DialogFooter className="form-footer">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>キャンセル</Button>
              <Button type="submit" disabled={submitting}>
                <MessageSquareWarning />{submitting ? "送信しています…" : "依頼を送信"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

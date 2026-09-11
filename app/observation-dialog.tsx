"use client";

import { Camera, History, KeyRound, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BLOOM_STATUSES, type AgavePin } from "@/lib/agave";
import { sanitizePhoto } from "@/lib/client-photo";

export function ObservationDialog({
  open,
  onOpenChange,
  pin,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pin: AgavePin | null;
  onPublished: () => Promise<void>;
}) {
  const [status, setStatus] = useState("normal");
  const [managementKey, setManagementKey] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [preparing, setPreparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !pin) return;
    setStatus(pin.status);
    setStartedAt(Date.now());
    setRulesAccepted(false);
    setPhoto(null);
    setError(null);
    try { setManagementKey(localStorage.getItem(`agave-management-${pin.id}`) ?? ""); } catch { setManagementKey(""); }
  }, [open, pin]);

  useEffect(() => {
    if (!photo) { setPhotoPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function selectPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    if (!chosen) return;
    setPreparing(true);
    setError(null);
    try {
      setPhoto(await sanitizePhoto(chosen));
      toast.success("写真の位置情報などを除去しました");
    } catch (photoError) {
      setPhoto(null);
      setError(photoError instanceof Error ? photoError.message : "写真を変換できませんでした。");
    } finally {
      setPreparing(false);
      event.target.value = "";
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pin) return;
    setError(null);
    if (!rulesAccepted) { setError("写真と観察内容についての確認が必要です。"); return; }
    if (!managementKey && !photo) { setError("管理キーがない場合は、現地で撮影した写真が必要です。"); return; }
    const form = new FormData(event.currentTarget);
    form.set("pinId", pin.id);
    form.set("bloomStatus", status);
    form.set("managementKey", managementKey);
    form.set("rulesAccepted", "true");
    form.set("startedAt", String(startedAt));
    form.set("website", "");
    if (photo) form.set("photo", photo);
    setSubmitting(true);
    try {
      const response = await fetch("/api/observations", { method: "POST", body: form });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "観察記録を追加できませんでした。");
      await onPublished();
      toast.success(data.message || "観察記録を追加しました");
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "観察記録を追加できませんでした。");
    } finally { setSubmitting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="form-dialog sm:max-w-xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <p className="dialog-kicker">OBSERVATION</p>
            <DialogTitle>いまの様子を記録</DialogTitle>
            <DialogDescription>{pin?.municipality}の地点に、観察日・状態・写真を履歴として追加します。</DialogDescription>
          </DialogHeader>
          <div className="form-grid">
            <div className="field-group">
              <span className="field-label">状態 <b>必須</b></span>
              <Select value={status} onValueChange={(value) => value && setStatus(value)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(BLOOM_STATUSES).map(([value, item]) => <SelectItem key={value} value={value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <label className="field-group">
              <span className="field-label">観察日 <b>必須</b></span>
              <Input name="observedAt" type="date" required defaultValue={new Date().toLocaleDateString("sv-SE")} />
            </label>
            <label className="field-group field-wide">
              <span className="field-label">観察メモ</span>
              <Textarea name="description" maxLength={1200} placeholder="花茎の高さ、開花の進み方、子株の有無など" />
            </label>
          </div>
          <div className="photo-upload">
            <div className="photo-upload-copy"><Camera /><div><strong>今回の写真</strong><p>管理キーがない方の更新には、現地で撮影した写真が必要です。</p></div></div>
            <label className="photo-select-button"><Upload />{preparing ? "変換中…" : photo ? "写真を変更" : "写真を選ぶ"}<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" onChange={selectPhoto} disabled={preparing} /></label>
            {photoPreview && <img src={photoPreview} alt="観察写真の送信前プレビュー" className="photo-preview" />}
            <label className="field-group"><span className="field-label">写真の説明</span><Input name="photoAlt" maxLength={160} placeholder="例：歩道側から見た株元と子株" /></label>
          </div>
          <label className="field-group">
            <span className="field-label"><KeyRound />投稿管理キー（任意）</span>
            <Input type="password" value={managementKey} onChange={(event) => setManagementKey(event.target.value)} autoComplete="off" placeholder="最初の投稿者は写真なしでも更新できます" />
          </label>
          <label className="observation-check"><Checkbox checked={rulesAccepted} onCheckedChange={(value) => setRulesAccepted(value === true)} /><span>現地で確認した内容です。写真には無関係な人、表札、車両ナンバーなどを含めていません。</span></label>
          <label className="trap-field" aria-hidden="true">ウェブサイト<Input name="website" tabIndex={-1} autoComplete="off" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <DialogFooter className="form-footer"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>キャンセル</Button><Button type="submit" disabled={submitting || preparing}><History />{submitting ? "追加しています…" : "観察履歴に追加"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

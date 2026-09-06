"use client";

import {
  Camera,
  Check,
  Copy,
  KeyRound,
  LocateFixed,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { BLOOM_STATUSES, LOCATION_TYPES } from "@/lib/agave";

type Coordinates = { latitude: number; longitude: number } | null;

type SubmissionResult = {
  pinId: string;
  managementKey: string;
  message: string;
  published: boolean;
};

async function loadImage(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("この画像を読み込めませんでした。"));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function sanitizePhoto(file: File) {
  if (file.size > 12_000_000) {
    throw new Error("元の写真は12MB以下にしてください。");
  }
  if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
    throw new Error("JPEG・PNG・WebP形式の写真を選んでください。");
  }

  const image = await loadImage(file);
  const maximum = 1800;
  const scale = Math.min(1, maximum / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("写真を安全な形式へ変換できませんでした。");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.84, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (blob && blob.size <= 2_900_000) {
      return new File([blob], "agave-photo.webp", { type: "image/webp" });
    }
  }
  throw new Error("写真を3MB以下に変換できませんでした。別の写真を選んでください。");
}

export function SubmissionDialog({
  open,
  onOpenChange,
  coordinates,
  onPickLocation,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coordinates: Coordinates;
  onPickLocation: () => void;
  onPublished: () => Promise<void>;
}) {
  const [bloomStatus, setBloomStatus] = useState("flower_stalk");
  const [municipality, setMunicipality] = useState("");
  const [municipalityLoading, setMunicipalityLoading] = useState(false);
  const [locationType, setLocationType] = useState("public_space");
  const [submitterRelation, setSubmitterRelation] = useState("observer");
  const [permissionConfirmed, setPermissionConfirmed] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    if (!coordinates) return;
    const controller = new AbortController();
    setMunicipalityLoading(true);
    fetch(`/api/municipality?lat=${coordinates.latitude}&lon=${coordinates.longitude}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as { municipality?: string };
        if (response.ok && data.municipality) setMunicipality(data.municipality);
      })
      .catch(() => undefined)
      .finally(() => setMunicipalityLoading(false));
    return () => controller.abort();
  }, [coordinates]);

  async function selectPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    if (!chosen) return;
    setPreparingPhoto(true);
    setError(null);
    try {
      const safePhoto = await sanitizePhoto(chosen);
      setPhoto(safePhoto);
      toast.success("写真から位置情報などのメタデータを除去しました");
    } catch (photoError) {
      setPhoto(null);
      setError(photoError instanceof Error ? photoError.message : "写真を変換できませんでした。");
    } finally {
      setPreparingPhoto(false);
      event.target.value = "";
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!coordinates) {
      setError("地図上で投稿位置を選んでください。");
      return;
    }
    if (!rulesAccepted) {
      setError("掲載条件と見学ルールへの確認が必要です。");
      return;
    }
    if (locationType === "private_authorized" && !permissionConfirmed) {
      setError("非公開の私有地は、所有者本人または掲載許可を得た方だけ投稿できます。");
      return;
    }
    if (
      locationType === "private_authorized" &&
      !["owner", "authorized"].includes(submitterRelation)
    ) {
      setError("私有地との関係を「所有者・管理者本人」または「掲載許可を得た」にしてください。");
      return;
    }

    const form = new FormData(event.currentTarget);
    form.set("bloomStatus", bloomStatus);
    form.set("locationType", locationType);
    form.set("submitterRelation", submitterRelation);
    form.set("latitude", String(coordinates.latitude));
    form.set("longitude", String(coordinates.longitude));
    form.set("permissionConfirmed", locationType === "private_authorized" ? "true" : "false");
    form.set("rulesAccepted", "true");
    form.set("startedAt", String(startedAt));
    form.set("website", "");
    if (photo) form.set("photo", photo);

    setSubmitting(true);
    try {
      const response = await fetch("/api/agaves", { method: "POST", body: form });
      const data = (await response.json()) as SubmissionResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "投稿できませんでした。");
      setResult(data);
      try {
        localStorage.setItem(`agave-management-${data.pinId}`, data.managementKey);
      } catch {
        // The key remains visible for manual copying when storage is unavailable.
      }
      await onPublished();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "投稿できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyKey() {
    if (!result) return;
    await navigator.clipboard.writeText(result.managementKey);
    toast.success("管理キーをコピーしました");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="form-dialog sm:max-w-2xl">
        {result ? (
          <div className="submission-success">
            <div className="success-icon"><Check /></div>
            <DialogHeader>
              <DialogTitle>{result.published ? "投稿を公開しました" : "投稿を確認待ちで保存しました"}</DialogTitle>
              <DialogDescription>{result.message}</DialogDescription>
            </DialogHeader>
            <div className="result-identifiers">
              <div>
                <span>ピンID</span>
                <code>{result.pinId}</code>
              </div>
              <div>
                <span><KeyRound />管理キー（再表示できません）</span>
                <code>{result.managementKey}</code>
              </div>
            </div>
            <div className="key-warning">
              この端末にも保存しましたが、ブラウザのデータを消すと失われます。別の場所にも控えてください。
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={copyKey}><Copy />キーをコピー</Button>
              <Button onClick={() => onOpenChange(false)}>地図へ戻る</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <p className="dialog-kicker">NEW SIGHTING</p>
              <DialogTitle>アオノリュウゼツランを投稿</DialogTitle>
              <DialogDescription>
                公園・公道から見える場所・来訪可能な施設は、そのまま投稿できます。個人宅など非公開の私有地だけは、所有者本人または掲載許可を得た場合に限ります。
              </DialogDescription>
            </DialogHeader>

            <div className="form-section location-picker-section">
              <div>
                <span className="field-label">投稿位置 <b>必須</b></span>
                {coordinates ? (
                  <p className="coordinate-value">
                    <LocateFixed />緯度 {coordinates.latitude} / 経度 {coordinates.longitude}
                  </p>
                ) : (
                  <p className="field-help">まだ位置が選ばれていません。</p>
                )}
              </div>
              <Button type="button" variant="outline" onClick={onPickLocation}>
                <LocateFixed />地図から選ぶ
              </Button>
            </div>

            <div className="form-grid">
              <div className="field-group">
                <span className="field-label">現在の状態 <b>必須</b></span>
                <Select value={bloomStatus} onValueChange={(value) => value && setBloomStatus(value)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(BLOOM_STATUSES).map(([value, item]) => (
                      <SelectItem key={value} value={value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="field-group">
                <span className="field-label">観察日 <b>必須</b></span>
                <Input name="observedAt" type="date" required defaultValue={new Date().toLocaleDateString("sv-SE")} />
              </label>
              <label className="field-group">
                <span className="field-label">前回開花した年</span>
                <Input name="previousBloomYear" type="number" min={1900} max={new Date().getFullYear()} placeholder="不明なら空欄" />
              </label>
              <label className="field-group">
                <span className="field-label">株数</span>
                <Input name="plantCount" type="number" min={1} max={1000} placeholder="おおよそで可" />
              </label>
              <label className="field-group">
                <span className="field-label">市区町村 <b>必須</b></span>
                <Input name="municipality" required maxLength={80} value={municipality} onChange={(event) => setMunicipality(event.target.value)} placeholder={municipalityLoading ? "地図から取得しています…" : "例：千葉市美浜区"} />
                <span className="field-help">地図から自動入力します。境界付近などで違う場合は直せます。</span>
              </label>
              <div className="field-group field-wide">
                <span className="field-label">場所の種類 <b>必須</b></span>
                <Select value={locationType} onValueChange={(value) => value && setLocationType(value)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LOCATION_TYPES).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="field-group field-wide">
                <span className="field-label">あなたと場所の関係 <b>必須</b></span>
                <Select value={submitterRelation} onValueChange={(value) => value && setSubmitterRelation(value)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="observer">公道・公開エリアから確認した</SelectItem>
                    <SelectItem value="owner">土地・施設の所有者または管理者本人</SelectItem>
                    <SelectItem value="authorized">所有者・管理者から掲載許可を得た</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="field-group field-wide">
                <span className="field-label">見学時の注意</span>
                <Textarea name="accessNote" maxLength={500} placeholder="例：開園時間内のみ。歩道が狭いため立ち止まらないでください。" />
              </label>
              <label className="field-group field-wide">
                <span className="field-label">補足情報</span>
                <Textarea name="description" maxLength={1200} placeholder="株の大きさ、花茎の伸び方、情報源など" />
              </label>
            </div>

            <div className="photo-upload">
              <div className="photo-upload-copy">
                <Camera />
                <div>
                  <strong>写真（任意）</strong>
                  <p>JPEG・PNG・WebP、元画像12MBまで。位置情報を除去し、WebPへ変換してから送信します。</p>
                </div>
              </div>
              <label className="photo-select-button">
                <Upload />{preparingPhoto ? "変換中…" : photo ? "写真を変更" : "写真を選ぶ"}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} disabled={preparingPhoto} />
              </label>
              {photoPreview && <img src={photoPreview} alt="投稿前の写真プレビュー" className="photo-preview" />}
              <label className="field-group">
                <span className="field-label">写真の説明</span>
                <Input name="photoAlt" maxLength={160} placeholder="例：歩道側から見た、花茎が伸びた株" />
              </label>
            </div>

            <div className="declaration-box">
              <ShieldAlert aria-hidden="true" />
              <div className="declaration-items">
                {locationType === "private_authorized" && (
                  <label>
                    <Checkbox checked={permissionConfirmed} onCheckedChange={(value) => setPermissionConfirmed(value === true)} />
                    <span>私はこの土地・施設の所有者または管理者本人です、または正確な位置をこの地図に掲載する許可を得ています。</span>
                  </label>
                )}
                <label>
                  <Checkbox checked={rulesAccepted} onCheckedChange={(value) => setRulesAccepted(value === true)} />
                  <span>写真は自分が撮影したもの、または掲載権限のあるものです。無関係な人、表札、車両ナンバーなどを含めず、見学者に立入許可を与える投稿ではないことを確認しました。</span>
                </label>
                <p>公共の場所や公道から確認できる場所について、管理者への事前許可を求めるものではありません。私有地の無許可掲載や安全上の申告があったピンは、確認まで全体を非公開にします。</p>
              </div>
            </div>

            <label className="trap-field" aria-hidden="true">
              ウェブサイト<Input name="website" tabIndex={-1} autoComplete="off" />
            </label>

            {error && <p className="form-error" role="alert">{error}</p>}
            <DialogFooter className="form-footer">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>キャンセル</Button>
              <Button type="submit" disabled={submitting || preparingPhoto || !coordinates}>
                {submitting ? "公開しています…" : "確認事項に同意して公開"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

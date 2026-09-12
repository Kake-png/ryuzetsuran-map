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
import { sanitizePhoto } from "@/lib/client-photo";
import { formatCoordinates, parseCoordinates } from "@/lib/coordinates";
import { formatAgaveTitle } from "@/lib/location-title";

type Coordinates = { latitude: number; longitude: number } | null;

type SubmissionResult = {
  pinId: string;
  managementKey: string;
  message: string;
  published: boolean;
};

export function SubmissionDialog({
  open,
  onOpenChange,
  coordinates,
  onPickLocation,
  onPreviewLocation,
  onClearLocation,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coordinates: Coordinates;
  onPickLocation: () => void;
  onPreviewLocation: (coordinates: NonNullable<Coordinates>) => void;
  onClearLocation: () => void;
  onPublished: () => Promise<void>;
}) {
  const [bloomStatus, setBloomStatus] = useState("normal");
  const [municipality, setMunicipality] = useState("");
  const [locationName, setLocationName] = useState("");
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
  const [observedAt, setObservedAt] = useState("");
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [coordinateText, setCoordinateText] = useState("");
  const [coordinateError, setCoordinateError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    setObservedAt(now.toLocaleDateString("sv-SE"));
    setCurrentYear(now.getFullYear());
  }, []);

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
    setCoordinateText(formatCoordinates(coordinates));
    setCoordinateError(null);
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

  function changeCoordinateText(value: string) {
    setCoordinateText(value);
    setCoordinateError(null);
    if (coordinates) onClearLocation();
  }

  function previewCoordinateText() {
    const parsed = parseCoordinates(coordinateText);
    if (!parsed) {
      setCoordinateError("日本国内の緯度・経度を読み取れませんでした。Google Mapsからコピーした座標かURLを貼り付けてください。");
      return;
    }
    onPreviewLocation(parsed);
  }

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
    if (!permissionConfirmed || !rulesAccepted) {
      setError("掲載条件と見学ルールへの確認が必要です。");
      return;
    }

    const form = new FormData(event.currentTarget);
    form.set("bloomStatus", bloomStatus);
    form.set("locationType", locationType);
    form.set("submitterRelation", submitterRelation);
    form.set("latitude", String(coordinates.latitude));
    form.set("longitude", String(coordinates.longitude));
    form.set("permissionConfirmed", "true");
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
                正確な位置を公開します。公道・公開エリアから確認できる株を投稿できます。私有地内には立ち入らないでください。
              </DialogDescription>
            </DialogHeader>

            <div className="form-section location-picker-section">
              <label className="field-group location-coordinate-field">
                <span className="field-label">投稿位置（緯度・経度） <b>必須</b></span>
                <Input
                  value={coordinateText}
                  onChange={(event) => changeCoordinateText(event.target.value)}
                  inputMode="text"
                  autoComplete="off"
                  placeholder="例：35.768867, 139.342782"
                  aria-invalid={Boolean(coordinateError)}
                />
                <span className="field-help">Google Mapsからコピーした座標・URL、北緯／東経、度分秒にも対応します。</span>
                {coordinates && <span className="coordinate-confirmed"><LocateFixed />地図で選択済み</span>}
                {coordinateError && <span className="coordinate-error" role="alert">{coordinateError}</span>}
              </label>
              <div className="location-picker-actions">
                <Button type="button" variant="outline" onClick={previewCoordinateText} disabled={!coordinateText.trim()}>
                  入力した場所を地図で確認
                </Button>
                <Button type="button" variant="outline" onClick={onPickLocation}>
                  <LocateFixed />地図から選ぶ
                </Button>
              </div>
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
                <Input name="observedAt" type="date" required value={observedAt} onChange={(event) => setObservedAt(event.target.value)} />
              </label>
              <label className="field-group">
                <span className="field-label">前回開花した年</span>
                <Input name="previousBloomYear" type="number" min={1900} max={currentYear ?? 2100} placeholder="不明なら空欄" />
              </label>
              <label className="field-group">
                <span className="field-label">大型の株数</span>
                <Input name="plantCount" type="number" min={1} max={1000} placeholder="子株を除き、おおよそで可" />
              </label>
              <label className="field-group">
                <span className="field-label">市区町村 <b>必須</b></span>
                <Input name="municipality" required maxLength={80} value={municipality} onChange={(event) => setMunicipality(event.target.value)} placeholder={municipalityLoading ? "地図から取得しています…" : "例：千葉市美浜区"} />
                <span className="field-help">地図から自動入力します。境界付近などで違う場合は直せます。</span>
              </label>
              <label className="field-group field-wide">
                <span className="field-label">表示用の目印（任意）</span>
                <Input
                  name="locationName"
                  maxLength={60}
                  value={locationName}
                  onChange={(event) => setLocationName(event.target.value)}
                  placeholder="例：みずほエコパーク北側、○○駅近く、△△川沿い"
                />
                <span className="field-help">個人宅名、表札、番地、住人を特定できる表現は書かないでください。空欄の場合は市区町村名を使います。</span>
                {(municipality.trim() || locationName.trim()) && (
                  <span className="location-title-preview">表示名：{formatAgaveTitle(locationName, municipality)}</span>
                )}
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
                  <p>JPEG・PNG・WebP・HEIC、元画像12MBまで。位置情報を除去し、安全な形式へ変換してから送信します。</p>
                </div>
              </div>
              <label className="photo-select-button">
                <Upload />{preparingPhoto ? "変換中…" : photo ? "写真を変更" : "写真を選ぶ"}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" onChange={selectPhoto} disabled={preparingPhoto} />
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
                <label>
                  <Checkbox checked={permissionConfirmed} onCheckedChange={(value) => setPermissionConfirmed(value === true)} />
                  <span>投稿場所へ無断で立ち入りません。私有地の株は、公道・公開エリアから確認した情報、または自分が管理する場所・掲載許可を得た場所の情報です。</span>
                </label>
                <label>
                  <Checkbox checked={rulesAccepted} onCheckedChange={(value) => setRulesAccepted(value === true)} />
                  <span>写真は自分が撮影したもの、または掲載権限のあるものです。無関係な人、表札、車両ナンバーなどを含めず、見学者に立入許可を与える投稿ではないことを確認しました。</span>
                </label>
                <p>掲載許可や要請者の真正性を運営が事前確認するものではありません。私有地・生活への影響や安全に関する申告があったピンは、安全を優先して一時非公開にします。</p>
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

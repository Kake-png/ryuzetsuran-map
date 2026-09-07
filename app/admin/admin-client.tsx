"use client";

import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BLOOM_STATUSES } from "@/lib/agave";

type AdminPin = {
  public_id: string;
  title: string;
  species: string;
  bloom_status: keyof typeof BLOOM_STATUSES;
  observed_at: string;
  previous_bloom_year: number | null;
  plant_count: number | null;
  latitude: number;
  longitude: number;
  municipality: string;
  location_name: string;
  location_type: string;
  access_note: string;
  description: string;
  photo_url: string | null;
  photo_alt: string | null;
  submitter_relation: string;
  permission_confirmed: number;
  visibility: "approved" | "pending" | "hidden" | "rejected";
  created_at: string;
  observation_count: number;
};

type AdminRequest = {
  public_id: string;
  agave_public_id: string;
  kind: string;
  reason: string;
  details: string;
  contact_email: string | null;
  verified_submitter: number;
  status: string;
  outcome: string | null;
  restrict_location: number;
  created_at: string;
  hidden_at: string | null;
  resolved_at: string | null;
  contact_erased_at: string | null;
};

const reasonLabels: Record<string, string> = {
  private_property: "私有地・生活への影響",
  no_permission: "私有地への掲載に関する懸念",
  dangerous: "見学に危険がある",
  wrong_info: "内容が間違っている",
  duplicate: "重複している",
  other: "その他",
};

const visibilityLabels: Record<AdminPin["visibility"], string> = {
  approved: "公開中",
  pending: "確認待ち",
  hidden: "非公開",
  rejected: "掲載終了",
};

const outcomeLabels: Record<string, string> = {
  submitter_withdrawal: "投稿者による取り下げ",
  restored: "公開へ復帰",
  kept_hidden: "非公開を継続",
  no_change: "変更なし",
  deleted: "データを完全削除",
};

type DeleteTarget =
  | { kind: "pin"; id: string }
  | { kind: "request"; id: string; pinId: string };

export function AdminClient() {
  const [token, setToken] = useState("");
  const [pins, setPins] = useState<AdminPin[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [query, setQuery] = useState("");
  const [requestStatus, setRequestStatus] = useState("pending");
  const [reason, setReason] = useState("all");
  const [pinVisibility, setPinVisibility] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  async function load(candidate = token) {
    if (!candidate) return;
    setLoading(true);
    setError(null);
    try {
      const parameters = new URLSearchParams({ q: query, requestStatus, reason, pinVisibility });
      const response = await fetch(`/api/admin?${parameters}`, {
        headers: { Authorization: `Bearer ${candidate}` },
        cache: "no-store",
      });
      const data = (await response.json()) as {
        pins?: AdminPin[];
        requests?: AdminRequest[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "管理情報を取得できませんでした。");
      setPins(data.pins ?? []);
      setRequests(data.requests ?? []);
      setAuthenticated(true);
      sessionStorage.setItem("ryuzetsuran-admin-token", candidate);
    } catch (loadError) {
      setAuthenticated(false);
      setError(loadError instanceof Error ? loadError.message : "管理情報を取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("ryuzetsuran-admin-token");
    if (stored) {
      setToken(stored);
      void load(stored);
    }
  }, []);

  async function act(payload: Record<string, string>) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "操作を完了できませんでした。");
      await load();
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "操作を完了できませんでした。");
      setLoading(false);
      return false;
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const completed = deleteTarget.kind === "pin"
      ? await act({ action: "delete", pinId: deleteTarget.id })
      : await act({ action: "delete_and_resolve", requestId: deleteTarget.id });
    if (completed) setDeleteTarget(null);
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <Link href="/" className="back-link"><ArrowLeft />地図へ戻る</Link>
          <p className="dialog-kicker">MODERATION</p>
          <h1>運営確認箱</h1>
          <p>普段の投稿は自動公開。私有地・生活や安全に関する申告は一時非公開とし、内容と再公開の根拠を記録して対応します。</p>
        </div>
        <ShieldCheck aria-hidden="true" />
      </header>

      {!authenticated ? (
        <section className="admin-login">
          <KeyRound />
          <h2>管理キーを入力</h2>
          <p>キーはURLに含めず、このタブの間だけブラウザに保持します。</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void load();
            }}
          >
            <Input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              autoComplete="current-password"
              placeholder="管理キー"
              required
            />
            <Button type="submit" disabled={loading}>{loading ? "確認中…" : "開く"}</Button>
          </form>
          {error && <p className="form-error" role="alert">{error}</p>}
        </section>
      ) : (
        <div className="admin-content">
          <form className="admin-filters" onSubmit={(event) => { event.preventDefault(); void load(); }}>
            <label><span>検索</span><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ピンID・受付ID・市区町村・依頼内容" /></label>
            <label><span>依頼の状態</span><select value={requestStatus} onChange={(event) => setRequestStatus(event.target.value)}><option value="pending">未処理</option><option value="resolved">解決済み</option><option value="all">すべて</option></select></label>
            <label><span>依頼理由</span><select value={reason} onChange={(event) => setReason(event.target.value)}><option value="all">すべて</option>{Object.entries(reasonLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span>ピンの状態</span><select value={pinVisibility} onChange={(event) => setPinVisibility(event.target.value)}><option value="all">すべて</option><option value="approved">公開中</option><option value="pending">確認待ち</option><option value="hidden">非公開</option><option value="rejected">掲載終了</option></select></label>
            <Button type="submit" disabled={loading}><Search />検索・更新</Button>
          </form>
          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <p className="eyebrow">REQUESTS</p>
                <h2>修正・削除依頼の記録</h2>
              </div>
              <Badge variant={requests.length ? "destructive" : "outline"}>{requests.length}件</Badge>
            </div>
            {requests.length === 0 ? (
              <p className="admin-empty"><Check />条件に一致する依頼はありません。</p>
            ) : (
              <div className="admin-card-grid">
                {requests.map((item) => (
                  <article className="admin-card report-card" key={item.public_id}>
                    <div className="admin-card-topline">
                      <Badge variant="outline">{reasonLabels[item.reason] ?? item.reason}</Badge>
                      {item.verified_submitter ? <Badge>投稿者確認済み</Badge> : null}
                      <Badge variant={item.status === "pending" ? "destructive" : "outline"}>{item.status === "pending" ? "未処理" : "解決済み"}</Badge>
                    </div>
                    <h3>{item.agave_public_id}</h3>
                    <p>{item.details}</p>
                    <dl>
                      <div><dt>受付ID</dt><dd>{item.public_id}</dd></div>
                      <div><dt>種類</dt><dd>{item.kind}</dd></div>
                      <div><dt>受信</dt><dd>{item.created_at}</dd></div>
                      {item.outcome && <div><dt>処理結果</dt><dd>{outcomeLabels[item.outcome] ?? item.outcome}</dd></div>}
                      {item.resolved_at && <div><dt>処理日時</dt><dd>{item.resolved_at}</dd></div>}
                      {item.restrict_location ? <div><dt>再登録</dt><dd>近接投稿を確認待ちにする</dd></div> : null}
                      {item.contact_email && <div><dt>連絡先</dt><dd>{item.contact_email}</dd></div>}
                      {item.contact_erased_at && <div><dt>連絡先</dt><dd>{item.contact_erased_at} に消去済み</dd></div>}
                    </dl>
                    {item.status === "pending" && <div className="admin-actions">
                      <Button
                        variant="destructive"
                        disabled={loading}
                        onClick={() => void act({ action: "hide_and_resolve", requestId: item.public_id })}
                      ><EyeOff />非公開を確定</Button>
                      <Button
                        variant="destructive"
                        disabled={loading}
                        onClick={() => setDeleteTarget({ kind: "request", id: item.public_id, pinId: item.agave_public_id })}
                      ><Trash2 />完全削除して完了</Button>
                      <Button
                        variant="outline"
                        disabled={loading}
                        onClick={() => void act({ action: "restore_and_resolve", requestId: item.public_id })}
                      ><RotateCcw />復帰して完了</Button>
                      <Button
                        variant="ghost"
                        disabled={loading}
                        onClick={() => void act({ action: "resolve_request", requestId: item.public_id })}
                      >ピンはそのまま完了</Button>
                    </div>}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <p className="eyebrow">RECENT PINS</p>
                <h2>地点・掲載状態</h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
                <RotateCcw />再読込
              </Button>
            </div>
            <div className="admin-card-grid">
              {pins.map((pin) => (
                <article className="admin-card" key={pin.public_id}>
                  <div className="admin-card-topline">
                    <span className="status-label" style={{ "--status-color": BLOOM_STATUSES[pin.bloom_status].color } as React.CSSProperties}>
                      {BLOOM_STATUSES[pin.bloom_status].label}
                    </span>
                    <Badge variant={pin.visibility === "approved" ? "outline" : "destructive"}>
                      {visibilityLabels[pin.visibility]}
                    </Badge>
                  </div>
                  <h3>{pin.title}</h3>
                  <p>{pin.location_name}<br /><small>{pin.municipality}</small></p>
                  {pin.photo_url && <img src={pin.photo_url} alt={pin.photo_alt || "投稿写真"} />}
                  <dl>
                    <div><dt>ピンID</dt><dd>{pin.public_id}</dd></div>
                    <div><dt>場所区分</dt><dd>{pin.location_type}</dd></div>
                    <div><dt>投稿者関係</dt><dd>{pin.submitter_relation}</dd></div>
                    <div><dt>観察日</dt><dd>{pin.observed_at}</dd></div>
                  </dl>
                  <a
                    className="coordinate-link"
                    href={`https://www.openstreetmap.org/?mlat=${pin.latitude}&mlon=${pin.longitude}#map=18/${pin.latitude}/${pin.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >位置を別地図で確認 <ExternalLink /></a>
                  <div className="admin-actions">
                    {pin.observation_count > 1 && (
                      <Button variant="outline" disabled={loading} onClick={() => void act({ action: "undo_latest_observation", pinId: pin.public_id })}>
                        <RotateCcw />最新の観察を取り消す
                      </Button>
                    )}
                    {pin.visibility === "approved" ? (
                      <Button variant="destructive" disabled={loading} onClick={() => void act({ action: "hide", pinId: pin.public_id })}>
                        <EyeOff />非公開
                      </Button>
                    ) : pin.visibility !== "rejected" ? (
                      <Button variant="outline" disabled={loading} onClick={() => void act({ action: "approve", pinId: pin.public_id })}>
                        <Eye />公開する
                      </Button>
                    ) : null}
                    <Button variant="ghost" disabled={loading} onClick={() => void act({ action: "reject", pinId: pin.public_id })}>
                      <EyeOff />掲載終了
                    </Button>
                    <Button variant="destructive" disabled={loading} onClick={() => setDeleteTarget({ kind: "pin", id: pin.public_id })}>
                      <Trash2 />完全削除
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
      )}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>この投稿データを完全に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              地点データ、観察履歴、R2に保存された写真を削除します。元に戻せません。削除要請から実行する場合は、要請記録と再登録制限だけが運営用に残ります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>キャンセル</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={loading} onClick={() => void confirmDelete()}>
              {loading ? "削除中…" : "完全に削除する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

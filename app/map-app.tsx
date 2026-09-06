"use client";

import maplibregl, {
  type Map as MapLibreMap,
  type MapMouseEvent,
  type Marker,
} from "maplibre-gl";
import {
  AlertTriangle,
  Binoculars,
  CalendarDays,
  ChevronRight,
  Flower2,
  History,
  ImageOff,
  Info,
  LocateFixed,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  BLOOM_STATUSES,
  LOCATION_TYPES,
  type AgavePin,
  type BloomStatus,
} from "@/lib/agave";

import { ChangeRequestDialog } from "./request-dialog";
import { ObservationDialog } from "./observation-dialog";
import { SafetyDialog } from "./safety-dialog";
import { SubmissionDialog } from "./submission-dialog";

type Filter = "blooming" | "changing" | "all";

function ageInDays(date: string) {
  return Math.max(
    0,
    Math.floor((Date.now() - Date.parse(`${date}T00:00:00`)) / 86_400_000),
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function StatusLabel({ status }: { status: BloomStatus }) {
  const item = BLOOM_STATUSES[status];
  return (
    <span
      className="status-label"
      style={{ "--status-color": item.color } as CSSProperties}
    >
      {item.label}
    </span>
  );
}

export function MapApp() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [pins, setPins] = useState<AgavePin[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [dataUnavailable, setDataUnavailable] = useState(false);
  const [filter, setFilter] = useState<Filter>("changing");
  const [showDead, setShowDead] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [observationOpen, setObservationOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  async function loadPins() {
    setLoading(true);
    try {
      const response = await fetch("/api/agaves", { cache: "no-store" });
      const data = (await response.json()) as {
        pins?: AgavePin[];
        demoMode?: boolean;
        unavailable?: boolean;
      };
      if (!data.pins) throw new Error("地図情報を読み込めませんでした。");
      setPins(data.pins);
      setDemoMode(Boolean(data.demoMode));
      setDataUnavailable(Boolean(data.unavailable));
      setSelectedId((current) => current ?? data.pins?.find((pin) => pin.status !== "dead")?.id ?? data.pins?.[0]?.id ?? null);
    } catch {
      setDataUnavailable(true);
      toast.error("ピン情報を読み込めませんでした。時間をおいて再読み込みしてください。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPins();
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let map: MapLibreMap | null = null;
    let timeout: number | null = null;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [137.7, 36.2],
        zoom: 4.25,
        minZoom: 2.8,
        maxZoom: 18,
        attributionControl: false,
      });
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        "bottom-left",
      );
      map.on("load", () => {
        setMapReady(true);
        setMapFailed(false);
      });
      timeout = window.setTimeout(() => {
        if (!map?.loaded()) setMapFailed(true);
      }, 12_000);
      mapRef.current = map;
    } catch (error) {
      console.error("Map initialization failed", error);
      setMapFailed(true);
    }
    return () => {
      if (timeout !== null) window.clearTimeout(timeout);
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  const visiblePins = useMemo(() => {
    const live = pins.filter((pin) => pin.status !== "dead");
    const matches = filter === "all"
      ? live
      : filter === "blooming"
        ? live.filter((pin) => pin.status === "blooming" && ageInDays(pin.observedAt) <= 45)
        : live.filter((pin) => ["blooming", "flower_stalk", "likely", "pups"].includes(pin.status) && ageInDays(pin.observedAt) <= 45);
    return showDead ? [...matches, ...pins.filter((pin) => pin.status === "dead")] : matches;
  }, [filter, pins, showDead]);

  const selected = pins.find((pin) => pin.id === selectedId) ?? null;
  const selectedHistory = selected
    ? selected.observations.length
      ? selected.observations
      : [{ id: `${selected.id}-initial`, status: selected.status, observedAt: selected.observedAt, description: selected.description, photoUrl: selected.photoUrl, photoAlt: selected.photoAlt, verifiedSubmitter: true }]
    : [];

  useEffect(() => {
    if (selectedId && !visiblePins.some((pin) => pin.id === selectedId)) {
      setSelectedId(visiblePins[0]?.id ?? null);
    }
  }, [selectedId, visiblePins]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = visiblePins.map((pin) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `agave-marker${pin.id === selectedId ? " is-selected" : ""}`;
      button.style.setProperty("--marker-color", BLOOM_STATUSES[pin.status].color);
      button.setAttribute(
        "aria-label",
        `${pin.title}、${BLOOM_STATUSES[pin.status].label}`,
      );
      const center = document.createElement("span");
      center.textContent = "✦";
      center.setAttribute("aria-hidden", "true");
      button.appendChild(center);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setSelectedId(pin.id);
      });
      return new maplibregl.Marker({ element: button, anchor: "bottom" })
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(mapRef.current as MapLibreMap);
    });
  }, [mapReady, selectedId, visiblePins]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pickingLocation) return;
    map.getCanvas().classList.add("is-picking-location");
    const choose = (event: MapMouseEvent) => {
      setPickedLocation({
        latitude: Number(event.lngLat.lat.toFixed(6)),
        longitude: Number(event.lngLat.lng.toFixed(6)),
      });
      setPickingLocation(false);
      setSubmissionOpen(true);
      toast.success("投稿位置を選びました");
    };
    map.once("click", choose);
    return () => {
      map.getCanvas().classList.remove("is-picking-location");
      map.off("click", choose);
    };
  }, [pickingLocation]);

  function focusPin(pin: AgavePin) {
    setSelectedId(pin.id);
    mapRef.current?.flyTo({
      center: [pin.longitude, pin.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 11),
      essential: true,
    });
  }

  function beginLocationPick() {
    setSubmissionOpen(false);
    setPickingLocation(true);
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <Flower2 />
          </div>
          <div>
            <p className="brand-kicker">RYUZETSU</p>
            <h1>リュウゼツランマップ</h1>
          </div>
        </div>
        <div className="header-actions">
          <Button variant="ghost" onClick={() => setSafetyOpen(true)}>
            <ShieldCheck />
            <span className="desktop-label">掲載と見学のルール</span>
          </Button>
          <Button className="submit-button" onClick={() => setSubmissionOpen(true)}>
            <Plus />
            投稿する
          </Button>
        </div>
      </header>

      <div className="safety-strip">
        <Info aria-hidden="true" />
        <span>見学は公道・公開エリアから。私有地への立ち入りや、路上駐車はしないでください。</span>
      </div>

      <div className="map-workspace">
        <aside className="map-sidebar" aria-label="リュウゼツラン情報">
          <div className="sidebar-controls">
            <div>
              <p className="eyebrow">STATUS</p>
              <h2>いまの様子から探す</h2>
            </div>
            <div className="filter-row" role="group" aria-label="開花状況で絞り込む">
              {(
                [
                  ["blooming", "開花中"],
                  ["changing", "変化あり"],
                  ["all", "現存株"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={filter === value ? "filter-pill is-active" : "filter-pill"}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className={showDead ? "dead-toggle is-active" : "dead-toggle"} onClick={() => setShowDead((value) => !value)}>
              枯死も表示
            </button>
          </div>

          {demoMode && (
            <div className="demo-notice">
              <Binoculars aria-hidden="true" />
              <div>
                <strong>現在は操作確認用のデモ表示です</strong>
                <p>3件とも架空の場所です。実際の投稿がひとつ公開されると自動で置き換わります。</p>
              </div>
            </div>
          )}

          {dataUnavailable && (
            <div className="service-notice">
              <AlertTriangle aria-hidden="true" />
              保存データを取得できないため、デモだけを表示しています。
            </div>
          )}

          <div className="sidebar-scroll">
            {selected && (
              <article className="selected-card">
                <div className="selected-card-topline">
                  <StatusLabel status={selected.status} />
                  <span className={ageInDays(selected.observedAt) > 45 ? "freshness is-old" : "freshness"}>
                    {ageInDays(selected.observedAt) === 0
                      ? "本日確認"
                      : `${ageInDays(selected.observedAt)}日前に確認`}
                  </span>
                </div>
                <h2>{selected.title}</h2>
                <div className="location-declaration">
                  <span>{LOCATION_TYPES[selected.locationType]}</span>
                  <b>投稿者申告</b>
                </div>

                {selected.photoUrl ? (
                  <img
                    className="pin-photo"
                    src={selected.photoUrl}
                    alt={selected.photoAlt || `${selected.title}の投稿写真`}
                  />
                ) : (
                  <div className="photo-placeholder">
                    <ImageOff aria-hidden="true" />
                    <span>写真はまだありません</span>
                  </div>
                )}

                <dl className="pin-facts">
                  <div>
                    <dt><MapPin />場所</dt>
                    <dd>{selected.municipality}</dd>
                  </div>
                  <div>
                    <dt><CalendarDays />観察日</dt>
                    <dd>{formatDate(selected.observedAt)}</dd>
                  </div>
                  <div>
                    <dt><RefreshCw />前回の開花</dt>
                    <dd>{selected.previousBloomYear ? `${selected.previousBloomYear}年ごろ` : "記録なし"}</dd>
                  </div>
                </dl>

                {selected.description && <p className="pin-description">{selected.description}</p>}
                <div className="observation-heading">
                  <div><History /><strong>観察履歴</strong><span>{selectedHistory.length}件</span></div>
                  <Button size="sm" variant="outline" disabled={Boolean(selected.demo)} onClick={() => setObservationOpen(true)}>いまの様子を追加</Button>
                </div>
                {selected.demo && (
                  <p className="demo-observation-note">デモでは履歴の表示だけ確認できます。実際の投稿では、ここから日時・状態・写真を追加できます。</p>
                )}
                <ol className="observation-list">
                  {selectedHistory.map((observation) => (
                    <li key={observation.id}>
                      <div>
                        <div className="history-topline"><StatusLabel status={observation.status} /><time>{formatDate(observation.observedAt)}</time></div>
                        {observation.photoUrl && <img src={observation.photoUrl} alt={observation.photoAlt || "観察時の写真"} />}
                        {observation.description && <p>{observation.description}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="access-note">
                  <ShieldCheck aria-hidden="true" />
                  <div>
                    <strong>見学時の注意</strong>
                    <p>{selected.accessNote || "現地の案内と周囲の生活環境を優先してください。"}</p>
                  </div>
                </div>
                <div className="selected-footer">
                  <span>ピンID {selected.id}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={Boolean(selected.demo)}
                    onClick={() => setRequestOpen(true)}
                  >
                    修正・削除を依頼
                    <ChevronRight />
                  </Button>
                </div>
              </article>
            )}

            <div className="list-heading">
              <h3>表示中のピン</h3>
              <span>{visiblePins.length}件</span>
            </div>
            <div className="pin-list">
              {loading && <p className="empty-message">ピンを読み込んでいます…</p>}
              {!loading && visiblePins.length === 0 && (
                <p className="empty-message">この状態のピンはまだありません。</p>
              )}
              {visiblePins.map((pin) => (
                <button
                  type="button"
                  key={pin.id}
                  className={pin.id === selectedId ? "pin-list-item is-selected" : "pin-list-item"}
                  onClick={() => focusPin(pin)}
                >
                  <span className="pin-list-copy">
                    <strong>{pin.title}</strong>
                    <small>{pin.municipality}・{formatDate(pin.observedAt)}</small>
                  </span>
                  <span
                    className="pin-list-status"
                    style={{ "--status-color": BLOOM_STATUSES[pin.status].color } as CSSProperties}
                  >
                    {BLOOM_STATUSES[pin.status].label}
                  </span>
                  <ChevronRight aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="map-stage" aria-label="地図">
          <div ref={containerRef} className="map-canvas" />
          <div className="map-filter-mobile" aria-label="開花状況で絞り込む">
            <button
              type="button"
              className={filter === "blooming" ? "is-active" : ""}
              onClick={() => setFilter("blooming")}
            >開花中</button>
            <button
              type="button"
              className={filter === "changing" ? "is-active" : ""}
              onClick={() => setFilter("changing")}
            >変化あり</button>
            <button
              type="button"
              className={filter === "all" ? "is-active" : ""}
              onClick={() => setFilter("all")}
            >現存株</button>
            <button type="button" className={showDead ? "is-active" : ""} onClick={() => setShowDead((value) => !value)}>枯死も</button>
          </div>
          {pickingLocation && (
            <div className="pick-location-banner">
              <LocateFixed aria-hidden="true" />
              <span>リュウゼツランの位置を地図上でクリック</span>
              <button type="button" onClick={() => setPickingLocation(false)}>キャンセル</button>
            </div>
          )}
          {mapFailed && (
            <div className="map-error">
              <AlertTriangle />
              <strong>地図を読み込めませんでした</strong>
              <span>一覧から情報を見ることはできます。</span>
            </div>
          )}
          <div className="map-legend" aria-label="凡例">
            {Object.entries(BLOOM_STATUSES).map(([value, item]) => (
              <span key={value}>
                <i style={{ background: item.color }} />{item.label}
              </span>
            ))}
          </div>
        </section>
      </div>

      <SubmissionDialog
        open={submissionOpen}
        onOpenChange={setSubmissionOpen}
        coordinates={pickedLocation}
        onPickLocation={beginLocationPick}
        onPublished={loadPins}
      />
      <ChangeRequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        initialPinId={selected?.demo ? "" : selected?.id ?? ""}
        onHidden={loadPins}
      />
      <ObservationDialog open={observationOpen} onOpenChange={setObservationOpen} pin={selected?.demo ? null : selected} onPublished={loadPins} />
      <SafetyDialog open={safetyOpen} onOpenChange={setSafetyOpen} />
      <Toaster position="top-center" richColors />
    </main>
  );
}

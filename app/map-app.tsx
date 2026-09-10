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
  ExternalLink,
  History,
  ImageOff,
  Info,
  LocateFixed,
  MapPin,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import {
  BLOOM_STATUSES,
  LOCATION_TYPES,
  type AgavePin,
  type BloomStatus,
  type PhotoAttribution,
} from "@/lib/agave";

import { ChangeRequestDialog } from "./request-dialog";
import { ObservationDialog } from "./observation-dialog";
import { SafetyDialog } from "./safety-dialog";
import { SubmissionDialog } from "./submission-dialog";

type Filter = "blooming" | "changing" | "all";

type OpenedPhoto = {
  url: string;
  alt: string;
  attribution: PhotoAttribution | null;
};

type LocationSearchResult = {
  name: string;
  latitude: number;
  longitude: number;
  type: string;
};

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
  const deepLinkedIdRef = useRef<string | null>(null);
  const mapNavigationRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [pins, setPins] = useState<AgavePin[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [dataUnavailable, setDataUnavailable] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [showDead, setShowDead] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [observationOpen, setObservationOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [openedPhoto, setOpenedPhoto] = useState<OpenedPhoto | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState<LocationSearchResult[]>([]);
  const [mapSearchLoading, setMapSearchLoading] = useState(false);
  const [mapSearchError, setMapSearchError] = useState<string | null>(null);

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
      const requestedId = new URLSearchParams(window.location.search).get("spot")?.toUpperCase() ?? null;
      const requestedPin = data.pins.find((pin) => pin.id === requestedId && !pin.demo);
      if (requestedPin) {
        deepLinkedIdRef.current = requestedPin.id;
        setSelectedId(requestedPin.id);
        if (requestedPin.status === "dead") setShowDead(true);
        if (!["blooming", "flower_stalk", "likely", "pups"].includes(requestedPin.status)) setFilter("all");
      } else {
        setSelectedId((current) => current ?? data.pins?.find((pin) => pin.status !== "dead")?.id ?? data.pins?.[0]?.id ?? null);
      }
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
    const openSubmission = () => setSubmissionOpen(true);
    const openRules = () => setSafetyOpen(true);
    window.addEventListener("ryuzetsuran:submit", openSubmission);
    window.addEventListener("ryuzetsuran:rules", openRules);
    return () => {
      window.removeEventListener("ryuzetsuran:submit", openSubmission);
      window.removeEventListener("ryuzetsuran:rules", openRules);
    };
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
        map?.getCanvas().addEventListener("pointerdown", () => {
          mapNavigationRef.current = true;
        }, { once: true });
        if (!new URLSearchParams(window.location.search).has("spot") && "geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (mapNavigationRef.current) return;
              map?.flyTo({
                center: [position.coords.longitude, position.coords.latitude],
                zoom: 10.5,
                essential: true,
              });
            },
            () => undefined,
            { enableHighAccuracy: false, timeout: 6_000, maximumAge: 600_000 },
          );
        }
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
  const selectedLatest = selected
    ? selected.observations[0] ?? {
        id: `${selected.id}-initial`,
        status: selected.status,
        observedAt: selected.observedAt,
        description: selected.description,
        photoUrl: selected.photoUrl,
        photoAlt: selected.photoAlt,
        photoAttribution: selected.photoAttribution,
        verifiedSubmitter: true,
      }
    : null;
  const selectedLatestPhoto = selected
    ? selected.observations.find((observation) => observation.photoUrl) ??
      (selected.photoUrl
        ? {
            photoUrl: selected.photoUrl,
            photoAlt: selected.photoAlt,
            photoAttribution: selected.photoAttribution,
          }
        : null)
    : null;
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
    if (!mapReady || !mapRef.current || !deepLinkedIdRef.current) return;
    const pin = pins.find((item) => item.id === deepLinkedIdRef.current);
    if (!pin) return;
    mapRef.current.flyTo({
      center: [pin.longitude, pin.latitude],
      zoom: 13,
      essential: true,
    });
    deepLinkedIdRef.current = null;
  }, [mapReady, pins]);

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
    mapNavigationRef.current = true;
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

  function previewLocation(coordinates: { latitude: number; longitude: number }) {
    mapNavigationRef.current = true;
    setPickedLocation(null);
    setSubmissionOpen(false);
    setPickingLocation(true);
    mapRef.current?.flyTo({
      center: [coordinates.longitude, coordinates.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 15),
      essential: true,
    });
  }

  async function searchMap(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = mapSearchQuery.trim();
    if (query.length < 2) {
      setMapSearchError("地名や住所を2文字以上で入力してください。");
      return;
    }
    setMapSearchLoading(true);
    setMapSearchError(null);
    try {
      const response = await fetch(`/api/location-search?q=${encodeURIComponent(query)}`);
      const data = await response.json() as { results?: LocationSearchResult[]; error?: string };
      if (!response.ok) throw new Error(data.error || "場所を検索できませんでした。");
      const results = data.results ?? [];
      setMapSearchResults(results);
      if (results.length === 0) setMapSearchError("該当する場所が見つかりませんでした。");
    } catch (searchError) {
      setMapSearchResults([]);
      setMapSearchError(searchError instanceof Error ? searchError.message : "場所を検索できませんでした。");
    } finally {
      setMapSearchLoading(false);
    }
  }

  function showSearchResult(result: LocationSearchResult) {
    mapNavigationRef.current = true;
    mapRef.current?.flyTo({
      center: [result.longitude, result.latitude],
      zoom: 14,
      essential: true,
    });
    setMapSearchResults([]);
    setMapSearchError(null);
  }

  function openPhoto(url: string, alt: string | null, attribution: PhotoAttribution | null) {
    setOpenedPhoto({
      url,
      alt: alt || "投稿写真",
      attribution,
    });
  }

  return (
    <main className="app-shell">
      <div className="safety-strip">
        <Info aria-hidden="true" />
        <span>見学は公道・公開エリアから。私有地への立ち入りや、路上駐車はしないでください。</span>
      </div>

      <div className="map-workspace">
        <aside className="map-sidebar" aria-label="リュウゼツラン情報">
          <div className="sidebar-controls">
            <div>
              <p className="eyebrow">OBSERVATION INDEX</p>
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
                  <StatusLabel status={selectedLatest?.status ?? selected.status} />
                  <span className={ageInDays(selectedLatest?.observedAt ?? selected.observedAt) > 45 ? "freshness is-old" : "freshness"}>
                    {ageInDays(selectedLatest?.observedAt ?? selected.observedAt) === 0
                      ? "本日確認"
                      : `${ageInDays(selectedLatest?.observedAt ?? selected.observedAt)}日前に確認`}
                  </span>
                </div>
                <h2>{selected.title}</h2>
                <div className="location-declaration">
                  <span>{LOCATION_TYPES[selected.locationType]}</span>
                  <b>投稿者申告</b>
                </div>

                {selectedLatestPhoto?.photoUrl ? (
                  <button
                    type="button"
                    className="pin-photo-button"
                    onClick={() => openPhoto(selectedLatestPhoto.photoUrl as string, selectedLatestPhoto.photoAlt, selectedLatestPhoto.photoAttribution)}
                    aria-label="写真を開く"
                  >
                    <img
                      className="pin-photo"
                      src={selectedLatestPhoto.photoUrl}
                      alt={selectedLatestPhoto.photoAlt || `${selected.title}の直近の投稿写真`}
                    />
                  </button>
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
                    <dd>{formatDate(selectedLatest?.observedAt ?? selected.observedAt)}</dd>
                  </div>
                  <div>
                    <dt><RefreshCw />前回の開花</dt>
                    <dd>{selected.previousBloomYear ? `${selected.previousBloomYear}年ごろ` : "記録なし"}</dd>
                  </div>
                </dl>

                {selectedLatest?.description && <p className="pin-description">{selectedLatest.description}</p>}
                <div className="observation-heading latest-observation-actions">
                  <div><History /><strong>最新の観察</strong></div>
                  <Button size="sm" variant="outline" disabled={Boolean(selected.demo)} onClick={() => setObservationOpen(true)}>いまの様子を追加</Button>
                </div>
                {selected.demo && (
                  <p className="demo-observation-note">デモでは履歴の表示だけ確認できます。実際の投稿では、ここから日時・状態・写真を追加できます。</p>
                )}
                <div className="access-note">
                  <ShieldCheck aria-hidden="true" />
                  <div>
                    <strong>見学時の注意</strong>
                    <p>{selected.accessNote || "現地の案内と周囲の生活環境を優先してください。"}</p>
                  </div>
                </div>
                <div className="selected-footer">
                  <span>ピンID {selected.id}</span>
                  <div>
                    {!selected.demo && (
                      <Link href={`/spots/${encodeURIComponent(selected.id)}`} className="spot-page-link">
                        <Share2 aria-hidden="true" />地点ページを見る
                      </Link>
                    )}
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
          <div className="map-search-panel">
            <form className="map-search-form" onSubmit={searchMap} role="search">
              <Search aria-hidden="true" />
              <label htmlFor="map-place-search" className="sr-only">地名や住所で地図を検索</label>
              <input
                id="map-place-search"
                value={mapSearchQuery}
                onChange={(event) => {
                  setMapSearchQuery(event.target.value);
                  setMapSearchError(null);
                }}
                placeholder="市区町村・住所・施設名を検索"
                maxLength={100}
              />
              <button type="submit" disabled={mapSearchLoading}>
                {mapSearchLoading ? "検索中" : "検索"}
              </button>
            </form>
            {(mapSearchResults.length > 0 || mapSearchError) && (
              <div className="map-search-results" aria-live="polite">
                {mapSearchError && <p>{mapSearchError}</p>}
                {mapSearchResults.map((result) => (
                  <button
                    type="button"
                    key={`${result.latitude}-${result.longitude}-${result.name}`}
                    onClick={() => showSearchResult(result)}
                  >
                    <MapPin aria-hidden="true" />
                    <span>{result.name}</span>
                  </button>
                ))}
                {mapSearchResults.length > 0 && <small>検索データ © OpenStreetMap contributors</small>}
              </div>
            )}
          </div>
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
              <span>リュウゼツランの位置を地図上でクリックまたはタップ</span>
              <button type="button" onClick={() => { setPickingLocation(false); setSubmissionOpen(true); }}>キャンセル</button>
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
        onPreviewLocation={previewLocation}
        onClearLocation={() => setPickedLocation(null)}
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
      <Dialog open={Boolean(openedPhoto)} onOpenChange={(open) => { if (!open) setOpenedPhoto(null); }}>
        <DialogContent className="photo-dialog sm:max-w-3xl">
          {openedPhoto && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>投稿写真</DialogTitle>
                <DialogDescription>写真の権利情報</DialogDescription>
              </DialogHeader>
              <img className="photo-dialog-image" src={openedPhoto.url} alt={openedPhoto.alt} />
              {openedPhoto.attribution ? (
                <div className="photo-attribution">
                  <p>写真：{openedPhoto.attribution.author} · {openedPhoto.attribution.license}</p>
                  <details>
                    <summary>写真情報</summary>
                    <dl>
                      <div>
                        <dt>原典</dt>
                        <dd>{openedPhoto.attribution.sourceUrl ? <a href={openedPhoto.attribution.sourceUrl} target="_blank" rel="noreferrer">掲載元を開く <ExternalLink aria-hidden="true" /></a> : "記録なし"}</dd>
                      </div>
                      <div>
                        <dt>ライセンス</dt>
                        <dd>{openedPhoto.attribution.licenseUrl ? <a href={openedPhoto.attribution.licenseUrl} target="_blank" rel="noreferrer">{openedPhoto.attribution.license} <ExternalLink aria-hidden="true" /></a> : openedPhoto.attribution.license}</dd>
                      </div>
                      <div>
                        <dt>加工</dt>
                        <dd>{openedPhoto.attribution.changes || "原図をそのまま掲載"}</dd>
                      </div>
                    </dl>
                  </details>
                </div>
              ) : <p className="photo-submission-label">投稿写真</p>}
            </>
          )}
        </DialogContent>
      </Dialog>
      <Toaster position="top-center" richColors />
    </main>
  );
}

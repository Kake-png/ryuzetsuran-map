export const BLOOM_STATUSES = {
  blooming: { label: "開花中", color: "#d84a4a" },
  flower_stalk: { label: "花茎が伸びている", color: "#e59b2f" },
  likely: { label: "開花が近そう", color: "#8a6ec8" },
  normal: { label: "平常", color: "#287a76" },
  pups: { label: "子株・再生あり", color: "#398b55" },
  dead: { label: "枯死・再生未確認", color: "#595f61" },
  unknown: { label: "状態不明", color: "#70777b" },
} as const;

export type BloomStatus = keyof typeof BLOOM_STATUSES;

export const LOCATION_TYPES = {
  public_space: "公共の場所・公道から見える場所",
  visitor_facility: "植物園・店舗など来訪を受け入れる施設",
  private_authorized: "私有地（所有者本人または掲載許可あり）",
} as const;

export type LocationType = keyof typeof LOCATION_TYPES;

export type AgavePin = {
  id: string;
  title: string;
  species: string;
  status: BloomStatus;
  observedAt: string;
  previousBloomYear: number | null;
  plantCount: number | null;
  latitude: number;
  longitude: number;
  municipality: string;
  locationName: string;
  locationType: LocationType;
  accessNote: string;
  description: string;
  photoUrl: string | null;
  photoAlt: string | null;
  observations: AgaveObservation[];
  demo?: boolean;
};

export type AgaveObservation = {
  id: string;
  status: BloomStatus;
  observedAt: string;
  description: string;
  photoUrl: string | null;
  photoAlt: string | null;
  verifiedSubmitter: boolean;
};

export const DEMO_PINS: AgavePin[] = [
  {
    id: "DEMO-001",
    title: "デモ：潮風植物園の大株",
    species: "アオノリュウゼツラン",
    status: "blooming",
    observedAt: "2026-08-28",
    previousBloomYear: null,
    plantCount: 1,
    latitude: 35.6284,
    longitude: 139.7785,
    municipality: "東京都湾岸部（架空）",
    locationName: "潮風植物園・南門付近（架空）",
    locationType: "visitor_facility",
    accessNote: "デモ用の架空地点です。実在の植物や施設を示しません。",
    description: "花茎の上部まで咲き進んでいる、という想定の表示例です。",
    photoUrl: null,
    photoAlt: null,
    observations: [
      {
        id: "DEMO-OBS-003",
        status: "blooming",
        observedAt: "2026-08-28",
        description: "花茎の上部まで咲き進んだ、という想定の最新記録です。",
        photoUrl: null,
        photoAlt: null,
        verifiedSubmitter: true,
      },
      {
        id: "DEMO-OBS-002",
        status: "flower_stalk",
        observedAt: "2026-08-12",
        description: "花茎が大きく伸び始めた、という想定の記録です。",
        photoUrl: null,
        photoAlt: null,
        verifiedSubmitter: false,
      },
      {
        id: "DEMO-OBS-001",
        status: "likely",
        observedAt: "2026-07-30",
        description: "株の中央に変化が見られた、という想定の初回記録です。",
        photoUrl: null,
        photoAlt: null,
        verifiedSubmitter: false,
      },
    ],
    demo: true,
  },
  {
    id: "DEMO-002",
    title: "デモ：海浜公園のリュウゼツラン",
    species: "アオノリュウゼツラン",
    status: "flower_stalk",
    observedAt: "2026-09-02",
    previousBloomYear: 1998,
    plantCount: 3,
    latitude: 35.4437,
    longitude: 139.6528,
    municipality: "神奈川県沿岸部（架空）",
    locationName: "海浜公園・公開園路沿い（架空）",
    locationType: "public_space",
    accessNote: "園路から観察し、植栽帯には入らないでください。",
    description: "中央の株から花茎が伸びてきた、という想定の表示例です。",
    photoUrl: null,
    photoAlt: null,
    observations: [],
    demo: true,
  },
  {
    id: "DEMO-003",
    title: "デモ：駅前広場の大株",
    species: "アオノリュウゼツラン",
    status: "normal",
    observedAt: "2026-07-11",
    previousBloomYear: null,
    plantCount: 2,
    latitude: 35.6074,
    longitude: 140.1065,
    municipality: "千葉県内（架空）",
    locationName: "駅前広場の植栽（架空）",
    locationType: "public_space",
    accessNote: "デモ用の架空地点です。",
    description: "平常時のピンがどう見えるかを確認するための表示例です。",
    photoUrl: null,
    photoAlt: null,
    observations: [],
    demo: true,
  },
];

export type Coordinates = {
  latitude: number;
  longitude: number;
};

function inJapan(latitude: number, longitude: number) {
  return latitude >= 20 && latitude <= 46 && longitude >= 122 && longitude <= 154;
}

function asJapanCoordinates(first: number, second: number): Coordinates | null {
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
  if (inJapan(first, second)) return { latitude: first, longitude: second };
  if (inJapan(second, first)) return { latitude: second, longitude: first };
  return null;
}

function decimalFromDms(degrees: number, minutes: number, seconds: number, direction?: string) {
  if (minutes >= 60 || seconds >= 60) return null;
  const absolute = degrees + minutes / 60 + seconds / 3600;
  return ["S", "W"].includes(direction?.toUpperCase() ?? "") ? -absolute : absolute;
}

function extractDms(value: string) {
  const matches = [...value.matchAll(
    /([NSEW])?\s*(\d{1,3})\s*(?:°|度)\s*(\d{1,2})\s*(?:'|′|分)\s*(\d{1,2}(?:\.\d+)?)\s*(?:"|″|秒)?\s*([NSEW])?/gi,
  )];
  if (matches.length < 2) return null;

  let latitude: number | null = null;
  let longitude: number | null = null;
  const unassigned: number[] = [];
  for (const match of matches) {
    const direction = (match[1] || match[5] || "").toUpperCase();
    const decimal = decimalFromDms(Number(match[2]), Number(match[3]), Number(match[4]), direction);
    if (decimal === null) continue;
    if (["N", "S"].includes(direction)) latitude = decimal;
    else if (["E", "W"].includes(direction)) longitude = decimal;
    else unassigned.push(decimal);
  }
  if (latitude === null) latitude = unassigned.shift() ?? null;
  if (longitude === null) longitude = unassigned.shift() ?? null;
  return latitude === null || longitude === null ? null : asJapanCoordinates(latitude, longitude);
}

function extractDirectedDecimals(value: string) {
  const matches = [...value.matchAll(
    /(?:([NSEW])\s*([+-]?\d{1,3}(?:\.\d+))|([+-]?\d{1,3}(?:\.\d+))\s*°?\s*([NSEW]))/gi,
  )];
  let latitude: number | null = null;
  let longitude: number | null = null;
  for (const match of matches) {
    const direction = (match[1] || match[4]).toUpperCase();
    let decimal = Number(match[2] || match[3]);
    if (["S", "W"].includes(direction)) decimal = -Math.abs(decimal);
    if (["N", "S"].includes(direction)) latitude = decimal;
    if (["E", "W"].includes(direction)) longitude = decimal;
  }
  return latitude === null || longitude === null ? null : asJapanCoordinates(latitude, longitude);
}

function extractDecimalPair(value: string) {
  const numbers = value.match(/[+-]?\d{1,3}(?:\.\d+)/g)?.map(Number) ?? [];
  if (numbers.length < 2) return null;
  for (let index = 0; index < numbers.length - 1; index += 1) {
    const parsed = asJapanCoordinates(numbers[index], numbers[index + 1]);
    if (parsed) return parsed;
  }
  return null;
}

export function parseCoordinates(input: string): Coordinates | null {
  const decoded = (() => {
    try {
      return decodeURIComponent(input.trim());
    } catch {
      return input.trim();
    }
  })();
  if (!decoded) return null;

  const normalized = decoded
    .replaceAll("北緯", "N")
    .replaceAll("南緯", "S")
    .replaceAll("東経", "E")
    .replaceAll("西経", "W")
    .replace(/[，、]/g, ",");

  const googleAt = normalized.match(/@([+-]?\d{1,2}(?:\.\d+)),([+-]?\d{1,3}(?:\.\d+))/i);
  if (googleAt) {
    const parsed = asJapanCoordinates(Number(googleAt[1]), Number(googleAt[2]));
    if (parsed) return parsed;
  }

  const googleData = normalized.match(/!3d([+-]?\d{1,2}(?:\.\d+))!4d([+-]?\d{1,3}(?:\.\d+))/i);
  if (googleData) {
    const parsed = asJapanCoordinates(Number(googleData[1]), Number(googleData[2]));
    if (parsed) return parsed;
  }

  const dms = extractDms(normalized);
  if (dms) return dms;
  const directed = extractDirectedDecimals(normalized);
  if (directed) return directed;
  return extractDecimalPair(normalized);
}

export function formatCoordinates(coordinates: Coordinates) {
  return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
}

const AGAVE_TITLE_SUFFIX = "アオノリュウゼツラン";

export function cleanLocationName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function formatAgaveTitle(locationName: string, municipality: string) {
  const base = cleanLocationName(locationName) || cleanLocationName(municipality);
  if (!base) return AGAVE_TITLE_SUFFIX;
  if (base.endsWith(AGAVE_TITLE_SUFFIX)) return base;
  return base.endsWith("の")
    ? `${base}${AGAVE_TITLE_SUFFIX}`
    : `${base}の${AGAVE_TITLE_SUFFIX}`;
}

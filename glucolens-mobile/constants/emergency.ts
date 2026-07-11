/**
 * Country-aware emergency contact data.
 *
 * Ported from the GlucoseMate countries reference, trimmed to the emergency
 * essentials for the countries GlucoLens currently recognises. When the
 * user's country isn't covered we fall back to 112, which connects to local
 * emergency services in many countries worldwide.
 */

export interface EmergencyCountry {
  /** ISO 3166-1 alpha-2 code (plus common aliases handled in the lookup). */
  code: string;
  name: string;
  flag: string;
  /** Primary all-purpose emergency number. */
  number: string;
  /** Dedicated ambulance / medical number when it differs from the primary. */
  ambulance?: string;
  note?: string;
}

export const EMERGENCY_COUNTRIES: EmergencyCountry[] = [
  {
    code: "ZA",
    name: "South Africa",
    flag: "🇿🇦",
    number: "112",
    ambulance: "10177",
    note: "112 from any mobile; 10177 for ambulance from a landline.",
  },
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    number: "911",
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    number: "999",
    note: "112 also works from mobiles. Call 111 for non-emergency NHS advice.",
  },
  {
    code: "AU",
    name: "Australia",
    flag: "🇦🇺",
    number: "000",
    note: "112 also works from mobiles.",
  },
  {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    number: "112",
    ambulance: "108",
  },
  {
    code: "CA",
    name: "Canada",
    flag: "🇨🇦",
    number: "911",
  },
];

export const GENERIC_EMERGENCY: EmergencyCountry = {
  code: "",
  name: "International",
  flag: "🌍",
  number: "112",
  note: "112 works in many countries. Check your local emergency number.",
};

/** Find country emergency info by code (accepts UK/GB aliases) or name. */
export function getEmergencyCountry(
  countryCode?: string,
  countryName?: string
): EmergencyCountry {
  let code = (countryCode ?? "").toUpperCase();
  if (code === "UK") code = "GB";
  if (code === "USA") code = "US";
  const byCode = EMERGENCY_COUNTRIES.find((c) => c.code === code);
  if (byCode) return byCode;
  const name = (countryName ?? "").trim().toLowerCase();
  if (name) {
    const byName = EMERGENCY_COUNTRIES.find((c) => c.name.toLowerCase() === name);
    if (byName) return byName;
  }
  return GENERIC_EMERGENCY;
}

import { mergeStore, readStore } from "./links";

// Personal details live in the same data/links.json as the personal links.
export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string; // full mobile number, e.g. +94706585632
  country: string; // e.g. "Sri Lanka"
}

/** Add more countries here as sites need them. */
const COUNTRIES: Record<string, { iso: string; dial: string }> = {
  "sri lanka": { iso: "LK", dial: "94" },
};

const countryInfo = (name: string) => COUNTRIES[name.trim().toLowerCase()] ?? null;

export async function getProfile(): Promise<Profile> {
  const s = await readStore();
  const str = (k: string) => String(s[k] ?? "");
  return {
    firstName: str("firstName"),
    lastName: str("lastName"),
    email: str("email"),
    phone: str("phone"),
    country: str("country"),
  };
}

/** Strip spaces/dashes/brackets from a phone number; turn a leading 00 into +. */
export function normalizePhone(v: unknown) {
  const s = String(v ?? "").replace(/[\s\-().]/g, "");
  return s.startsWith("00") ? `+${s.slice(2)}` : s;
}

export async function saveProfile(input: Partial<Record<keyof Profile, unknown>>): Promise<Profile> {
  const clean = (v: unknown) => String(v ?? "").trim();
  await mergeStore({
    firstName: clean(input.firstName),
    lastName: clean(input.lastName),
    email: clean(input.email),
    phone: normalizePhone(input.phone),
    country: clean(input.country),
  });
  return getProfile();
}

export interface PhoneParts {
  /** Full international number, e.g. "+94706585632" ("" if it cannot be determined). */
  full: string;
  /** Country calling code with +, e.g. "+94" ("" if unknown). */
  dial: string;
  /** Number without country code or leading 0, e.g. "706585632". */
  national: string;
  /** Local format with trunk 0, e.g. "0706585632". */
  nationalWithZero: string;
  /** ISO country code of the profile's country, e.g. "LK" ("" if unknown). */
  iso: string;
}

/** Split the stored phone into the pieces different sites ask for. */
export function phoneParts(profile: Pick<Profile, "phone" | "country">): PhoneParts {
  const info = countryInfo(profile.country);
  const phone = normalizePhone(profile.phone);
  const none: PhoneParts = { full: "", dial: "", national: "", nationalWithZero: "", iso: info?.iso ?? "" };

  let dial = "";
  let national = "";
  if (phone.startsWith("+")) {
    if (info && phone.startsWith(`+${info.dial}`)) {
      dial = `+${info.dial}`;
      national = phone.slice(dial.length);
    } else {
      return { ...none, full: /^\+\d{7,15}$/.test(phone) ? phone : "" };
    }
  } else if (info && /^\d{6,}$/.test(phone)) {
    dial = `+${info.dial}`;
    national = phone.replace(/^0+/, "");
  } else {
    return none;
  }
  national = national.replace(/^0+/, "");
  return { full: `${dial}${national}`, dial, national, nationalWithZero: `0${national}`, iso: info?.iso ?? "" };
}

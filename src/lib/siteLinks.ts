import crypto from "crypto";
import { mergeStore, readStore } from "./links";

export interface SiteLink {
  id: string;
  name: string;
  url: string;
}

// Used until the user saves their own list (stored under "siteLinks" in data/links.json).
const DEFAULTS: SiteLink[] = [
  {
    id: "rooster-sri-lanka-full-time",
    name: "Rooster · Sri Lanka · Full-time",
    url: "https://rooster.jobs/?query=&limit=20&page=1&filters.country=Sri%20Lanka&filters.jobTypes=full-time",
  },
  {
    id: "topjobs-sdq",
    name: "TopJobs · SDQ",
    url: "https://www.topjobs.lk/applicant/vacancybyfunctionalarea.jsp?FA=SDQ",
  },
  {
    id: "xpress-jobs",
    name: "Xpress.jobs · Sectors 41, 30, 139",
    url: "https://xpress.jobs/jobs?Sectors=41%2C30%2C139&page=1",
  },
  { id: "itpro-lk", name: "ITPro.lk", url: "https://itpro.lk/" },
  { id: "eight5-lk", name: "Eight5.lk", url: "https://eight5.lk/" },
  { id: "vacancyfinder", name: "VacancyFinder", url: "https://vacancyfinder.github.io/jobs/" },
];

export class SiteLinkError extends Error {}

export async function getSiteLinks(): Promise<SiteLink[]> {
  const s = await readStore();
  return Array.isArray(s.siteLinks) ? (s.siteLinks as SiteLink[]) : DEFAULTS;
}

/** Validate and normalise a list from the client, then store it. */
export async function saveSiteLinks(input: unknown): Promise<SiteLink[]> {
  if (!Array.isArray(input)) throw new SiteLinkError("Expected a list of links");
  const links = input.map((raw): SiteLink => {
    const r = (raw ?? {}) as Record<string, unknown>;
    let url = String(r.url ?? "").trim();
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new SiteLinkError(`Invalid link: ${String(r.url ?? "")}`);
    }
    return {
      id: typeof r.id === "string" && r.id ? r.id : crypto.randomUUID(),
      name: String(r.name ?? "").trim() || parsed.hostname,
      url: parsed.toString(),
    };
  });
  await mergeStore({ siteLinks: links });
  return links;
}

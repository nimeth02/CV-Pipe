import { promises as fs } from "fs";
import path from "path";

export interface Links {
  linkedin: string;
  github: string;
  portfolio: string;
}

const LINKS_FILE = path.join(process.cwd(), "data", "links.json");
const EMPTY: Links = { linkedin: "", github: "", portfolio: "" };

export async function getLinks(): Promise<Links> {
  try {
    return { ...EMPTY, ...JSON.parse(await fs.readFile(LINKS_FILE, "utf8")) };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return { ...EMPTY };
    throw err;
  }
}

/** Add https:// when a bare domain like "github.com/me" is entered. */
const toUrl = (v: unknown) => {
  const s = String(v ?? "").trim();
  return s && !/^https?:\/\//i.test(s) ? `https://${s}` : s;
};

export async function saveLinks(input: Partial<Record<keyof Links, unknown>>): Promise<Links> {
  const links: Links = {
    linkedin: toUrl(input.linkedin),
    github: toUrl(input.github),
    portfolio: toUrl(input.portfolio),
  };
  await fs.mkdir(path.dirname(LINKS_FILE), { recursive: true });
  await fs.writeFile(LINKS_FILE, JSON.stringify(links, null, 2), "utf8");
  return links;
}

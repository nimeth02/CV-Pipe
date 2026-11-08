import { promises as fs } from "fs";
import path from "path";

export interface Links {
  linkedin: string;
  github: string;
  portfolio: string;
}

// One JSON file holds both the personal links and the personal details (see profile.ts).
export const LINKS_FILE = path.join(process.cwd(), "data", "links.json");

export async function readStore(): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await fs.readFile(LINKS_FILE, "utf8"));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
}

// Serialize writes; merge into the file so links and details never overwrite each other.
let queue: Promise<unknown> = Promise.resolve();
export function mergeStore(patch: Record<string, unknown>): Promise<Record<string, unknown>> {
  const run = queue.then(async () => {
    const next = { ...(await readStore()), ...patch };
    await fs.mkdir(path.dirname(LINKS_FILE), { recursive: true });
    await fs.writeFile(LINKS_FILE, JSON.stringify(next, null, 2), "utf8");
    return next;
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function getLinks(): Promise<Links> {
  const s = await readStore();
  return {
    linkedin: String(s.linkedin ?? ""),
    github: String(s.github ?? ""),
    portfolio: String(s.portfolio ?? ""),
  };
}

/** Add https:// when a bare domain like "github.com/me" is entered. */
const toUrl = (v: unknown) => {
  const s = String(v ?? "").trim();
  return s && !/^https?:\/\//i.test(s) ? `https://${s}` : s;
};

export async function saveLinks(input: Partial<Record<keyof Links, unknown>>): Promise<Links> {
  await mergeStore({
    linkedin: toUrl(input.linkedin),
    github: toUrl(input.github),
    portfolio: toUrl(input.portfolio),
  });
  return getLinks();
}

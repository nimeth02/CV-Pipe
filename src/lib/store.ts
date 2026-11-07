import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export const STATUSES = ["Draft", "Applied", "Interview", "Offer", "Rejected"] as const;
export type Status = (typeof STATUSES)[number];

export interface Application {
  id: string;
  company: string;
  position: string;
  email: string;
  subject: string;
  message: string;
  status: Status;
  notes: string;
  cvFile: string | null; // file name inside data/cv (overrides the role CV)
  roleId?: string | null; // role whose latest CV is attached when cvFile is null
  createdAt: string;
  sentAt: string | null;
  sendCount: number;
  lastError: string | null;
}

export interface Settings {
  defaultSubject: string;
  defaultMessage: string;
  defaultCv: string | null;
}

interface Db {
  applications: Application[];
  settings: Settings;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const CV_DIR = path.join(DATA_DIR, "cv");

const DEFAULT_DB: Db = {
  applications: [],
  settings: {
    defaultSubject: "Application for {position} position",
    defaultMessage:
      "Dear Hiring Team at {company},\n\nI am writing to apply for the {position} position. Please find my CV attached.\n\nThank you for your time and consideration. I look forward to hearing from you.\n\nKind regards,",
    defaultCv: null,
  },
};

async function readDb(): Promise<Db> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const db = JSON.parse(raw) as Db;
    return { ...DEFAULT_DB, ...db, settings: { ...DEFAULT_DB.settings, ...db.settings } };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(DEFAULT_DB);
    throw err;
  }
}

async function writeDb(db: Db) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_FILE);
}

// Serialize all mutations so concurrent requests cannot overwrite each other.
let queue: Promise<unknown> = Promise.resolve();
function mutate<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function listApplications() {
  const db = await readDb();
  return [...db.applications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getApplication(id: string) {
  const db = await readDb();
  return db.applications.find((a) => a.id === id) ?? null;
}

export function createApplication(
  input: Omit<Application, "id" | "createdAt" | "sentAt" | "sendCount" | "lastError">,
) {
  return mutate((db) => {
    const app: Application = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      sentAt: null,
      sendCount: 0,
      lastError: null,
    };
    db.applications.push(app);
    return app;
  });
}

export function updateApplication(id: string, patch: Partial<Application>) {
  return mutate((db) => {
    const app = db.applications.find((a) => a.id === id);
    if (!app) return null;
    Object.assign(app, patch, { id: app.id, createdAt: app.createdAt });
    return app;
  });
}

export function deleteApplication(id: string) {
  return mutate((db) => {
    const before = db.applications.length;
    db.applications = db.applications.filter((a) => a.id !== id);
    return db.applications.length !== before;
  });
}

export async function getSettings() {
  return (await readDb()).settings;
}

export function updateSettings(patch: Partial<Settings>) {
  return mutate((db) => {
    db.settings = { ...db.settings, ...patch };
    return db.settings;
  });
}

/** Save an uploaded file into data/cv and return the stored file name. */
export async function saveCv(file: File): Promise<string> {
  await fs.mkdir(CV_DIR, { recursive: true });
  const safe = path.basename(file.name).replace(/[^\w.\- ]+/g, "_");
  const name = `${Date.now()}-${safe}`;
  await fs.writeFile(path.join(CV_DIR, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export function cvPath(name: string) {
  return path.join(CV_DIR, path.basename(name));
}

/** Original file name without the timestamp prefix. */
export function cvDisplayName(name: string) {
  return name.replace(/^\d+-/, "");
}

export function fillTemplate(text: string, app: Pick<Application, "company" | "position">) {
  return text.replaceAll("{company}", app.company).replaceAll("{position}", app.position);
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

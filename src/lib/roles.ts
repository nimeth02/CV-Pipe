import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export interface Role {
  id: string;
  name: string;
  subject: string;
  body: string;
  cvFile: string | null; // file name inside /assets, always "<role name>.pdf"
  createdAt: string;
  updatedAt: string;
}

export type RoleInput = Pick<Role, "name" | "subject" | "body">;

const ROLES_FILE = path.join(process.cwd(), "data", "roles.json");
export const ASSETS_DIR = path.join(process.cwd(), "assets");

export class RoleError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

async function readRoles(): Promise<Role[]> {
  try {
    return JSON.parse(await fs.readFile(ROLES_FILE, "utf8")) as Role[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeRoles(roles: Role[]) {
  await fs.mkdir(path.dirname(ROLES_FILE), { recursive: true });
  const tmp = ROLES_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(roles, null, 2), "utf8");
  await fs.rename(tmp, ROLES_FILE);
}

// Serialize mutations so concurrent requests cannot clobber the file.
let queue: Promise<unknown> = Promise.resolve();
function mutate<T>(fn: (roles: Role[]) => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const roles = await readRoles();
    const result = await fn(roles);
    await writeRoles(roles);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

/** Turn a role name into a Windows/Unix-safe PDF file name. */
export function cvFileName(roleName: string) {
  const base = roleName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/[. ]+$/, "")
    .trim();
  return `${base || "cv"}.pdf`;
}

export function roleCvPath(file: string) {
  return path.join(ASSETS_DIR, path.basename(file));
}

async function readPdf(file: File): Promise<Buffer> {
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new RoleError("CV must be a PDF file");
  }
  return buf;
}

function validate(input: RoleInput, roles: Role[], selfId?: string) {
  if (!input.name) throw new RoleError("Role name is required");
  const file = cvFileName(input.name).toLowerCase();
  const clash = roles.find(
    (r) => r.id !== selfId && (r.name.toLowerCase() === input.name.toLowerCase() || cvFileName(r.name).toLowerCase() === file),
  );
  if (clash) throw new RoleError(`A role named "${clash.name}" already exists`, 409);
}

export async function listRoles() {
  return (await readRoles()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getRole(id: string) {
  return (await readRoles()).find((r) => r.id === id) ?? null;
}

export function createRole(input: RoleInput, cv: File | null) {
  return mutate(async (roles) => {
    validate(input, roles);
    const now = new Date().toISOString();
    const role: Role = { ...input, id: crypto.randomUUID(), cvFile: null, createdAt: now, updatedAt: now };
    if (cv) {
      const buf = await readPdf(cv);
      await fs.mkdir(ASSETS_DIR, { recursive: true });
      role.cvFile = cvFileName(role.name);
      await fs.writeFile(roleCvPath(role.cvFile), buf);
    }
    roles.push(role);
    return role;
  });
}

export function updateRole(id: string, input: RoleInput, cv: File | null, removeCv = false) {
  return mutate(async (roles) => {
    const role = roles.find((r) => r.id === id);
    if (!role) throw new RoleError("Role not found", 404);
    validate(input, roles, id);

    const newFile = cvFileName(input.name);
    const pdf = cv ? await readPdf(cv) : null;
    await fs.mkdir(ASSETS_DIR, { recursive: true });

    if (pdf) {
      // New upload: write under the (possibly new) name, drop the old file if the name changed.
      await fs.writeFile(roleCvPath(newFile), pdf);
      if (role.cvFile && role.cvFile !== newFile) await fs.rm(roleCvPath(role.cvFile), { force: true });
      role.cvFile = newFile;
    } else if (removeCv && role.cvFile) {
      await fs.rm(roleCvPath(role.cvFile), { force: true });
      role.cvFile = null;
    } else if (role.cvFile && role.cvFile !== newFile) {
      // Role renamed: rename the CV so it keeps matching the role name.
      await fs.rename(roleCvPath(role.cvFile), roleCvPath(newFile));
      role.cvFile = newFile;
    }

    Object.assign(role, input, { updatedAt: new Date().toISOString() });
    return role;
  });
}

export function deleteRole(id: string) {
  return mutate(async (roles) => {
    const i = roles.findIndex((r) => r.id === id);
    if (i === -1) throw new RoleError("Role not found", 404);
    const [role] = roles.splice(i, 1);
    if (role.cvFile) await fs.rm(roleCvPath(role.cvFile), { force: true });
    return true;
  });
}

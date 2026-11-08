"use client";

import { useRef, useState } from "react";
import { Field, btnDanger, btnGhost, btnPrimary, card, input, type Role } from "./ui";

export default function RolesTab({
  roles,
  setRoles,
  notify,
}: {
  roles: Role[];
  setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
  notify: (kind: "ok" | "err", text: string) => void;
}) {
  // null = closed, "new" = create form, otherwise the id of the role being edited
  const [editing, setEditing] = useState<string | null>(null);

  const sorted = (list: Role[]) => [...list].sort((a, b) => a.name.localeCompare(b.name));

  async function save(form: FormData, role?: Role) {
    const res = await fetch(role ? `/api/roles/${role.id}` : "/api/roles", {
      method: role ? "PUT" : "POST",
      body: form,
    });
    const data = await res.json();
    if (!res.ok) return notify("err", data.error ?? "Failed to save role");
    setRoles((prev) => sorted(role ? prev.map((r) => (r.id === role.id ? data.role : r)) : [...prev, data.role]));
    setEditing(null);
    notify("ok", role ? `Role "${data.role.name}" updated` : `Role "${data.role.name}" created`);
  }

  async function remove(role: Role) {
    if (!confirm(`Delete role "${role.name}" and its CV?`)) return;
    const res = await fetch(`/api/roles/${role.id}`, { method: "DELETE" });
    if (!res.ok) return notify("err", (await res.json()).error);
    setRoles((prev) => prev.filter((r) => r.id !== role.id));
    notify("ok", `Role "${role.name}" deleted`);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">Roles</h2>
          <p className="text-sm text-zinc-400">
            Reusable email subjects, cover letters and CVs per job role. CVs are saved as{" "}
            <code className="break-all text-zinc-300">assets/&lt;role name&gt;.pdf</code>.
          </p>
        </div>
        {editing !== "new" && (
          <button className={`${btnPrimary} shrink-0`} onClick={() => setEditing("new")}>
            + New role
          </button>
        )}
      </div>

      {editing === "new" && <RoleForm onSubmit={(f) => save(f)} onCancel={() => setEditing(null)} />}

      {roles.length === 0 && editing !== "new" ? (
        <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
          No roles yet. Create one to reuse its email and CV across applications.
        </p>
      ) : (
        <ul className="grid gap-3">
          {roles.map((role) =>
            editing === role.id ? (
              <li key={role.id}>
                <RoleForm role={role} onSubmit={(f) => save(f, role)} onCancel={() => setEditing(null)} />
              </li>
            ) : (
              <li key={role.id} className={`${card} p-4 transition hover:border-white/20`}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
                    <div className="font-medium break-words text-zinc-100">{role.name}</div>
                    <div className="truncate text-sm text-zinc-500">Subject: {role.subject || "—"}</div>
                    <div className="mt-1 text-sm">
                      {role.cvFile ? (
                        <a
                          className="break-all text-indigo-300 hover:text-indigo-200 hover:underline"
                          href={`/api/roles/${role.id}/cv?v=${encodeURIComponent(role.updatedAt)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {role.cvFile}
                        </a>
                      ) : (
                        <span className="text-amber-400">No CV uploaded</span>
                      )}
                      <span className="block text-zinc-500 sm:inline"><span className="hidden sm:inline"> · </span>Updated {new Date(role.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <CopyButton
                    text={role.body}
                    label="Copy cover letter"
                    className={`${btnGhost} px-3`}
                    notify={notify}
                  />
                  <button className={`${btnGhost} flex-1 sm:flex-none`} onClick={() => setEditing(role.id)}>
                    Edit
                  </button>
                  <button className={`${btnDanger} flex-1 sm:flex-none`} onClick={() => remove(role)}>
                    Delete
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}

function RoleForm({
  role,
  onSubmit,
  onCancel,
}: {
  role?: Role;
  onSubmit: (form: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  async function handle(form: FormData, extra?: Record<string, string>) {
    for (const [k, v] of Object.entries(extra ?? {})) form.set(k, v);
    setSaving(true);
    await onSubmit(form);
    setSaving(false);
  }

  return (
    <form
      className={`${card} grid gap-4 border-indigo-500/30 p-4 sm:p-5 md:grid-cols-2`}
      onSubmit={(e) => {
        e.preventDefault();
        handle(new FormData(e.currentTarget));
      }}
    >
      <Field label="Role name *">
        <input name="name" required className={input} defaultValue={role?.name} placeholder="Frontend Developer" />
      </Field>
      <Field label={role?.cvFile ? `CV (PDF) — current: ${role.cvFile}. Upload to replace.` : "CV (PDF)"}>
        <input name="cv" type="file" accept="application/pdf,.pdf" className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-100 hover:file:bg-white/15" />
      </Field>
      <Field label="Email subject *" className="md:col-span-2">
        <input name="subject" required className={input} defaultValue={role?.subject} />
      </Field>
      <div className="md:col-span-2">
        <Field label="Cover letter *">
          <textarea ref={bodyRef} name="body" required rows={10} className={input} defaultValue={role?.body} />
        </Field>
        <div className="mt-2 flex justify-end">
          <CopyButton text={() => bodyRef.current?.value ?? ""} label="Copy cover letter" className={`${btnGhost} px-3`} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <button className={btnPrimary} disabled={saving}>
          {saving ? "Saving…" : role ? "Save changes" : "Create role"}
        </button>
        <button type="button" className={btnGhost} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        {role?.cvFile && (
          <button
            type="button"
            className={`${btnDanger} ml-auto`}
            disabled={saving}
            onClick={(e) => handle(new FormData(e.currentTarget.form!), { removeCv: "true" })}
          >
            Remove CV
          </button>
        )}
      </div>
    </form>
  );
}

async function copyText(text: string) {
  // navigator.clipboard needs HTTPS/localhost; fall back for plain-HTTP access (e.g. phone on LAN).
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  if (!ok) throw new Error("Copy failed");
}

function CopyButton({
  text,
  label,
  className,
  notify,
}: {
  text: string | (() => string);
  label: string;
  className: string;
  notify?: (kind: "ok" | "err", text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      title={copied ? "Copied" : label}
      aria-label={copied ? "Copied" : label}
      onClick={async () => {
        const value = typeof text === "function" ? text() : text;
        if (!value) return notify?.("err", "Cover letter is empty");
        try {
          await copyText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          notify?.("err", "Could not copy to clipboard");
        }
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={copied ? "text-emerald-400" : ""}
      >
        {copied ? (
          <path d="M20 6 9 17l-5-5" />
        ) : (
          <>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </>
        )}
      </svg>
    </button>
  );
}

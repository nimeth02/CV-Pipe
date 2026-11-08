"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LinksCard from "./LinksCard";
import RolesTab from "./RolesTab";
import SitesTab from "./SitesTab";
import { Field, btnPrimary, card, input, type Role } from "./ui";

interface Application {
  id: string;
  position: string; // role name at the time of sending
  email: string;
  roleId?: string | null;
  sentAt: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

type Tab = "send" | "sent" | "roles" | "sites";
type Toast = { kind: "ok" | "err"; text: string } | null;

export default function Dashboard() {
  const [apps, setApps] = useState<Application[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [smtp, setSmtp] = useState<{ smtpConfigured: boolean; fromAddress: string | null } | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [tab, setTab] = useState<Tab>("send");

  const notify = useCallback((kind: "ok" | "err", text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 6000);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/applications").then((r) => r.json()),
      fetch("/api/roles").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([a, ro, s]) => {
      setApps(a);
      setRoles(ro);
      setSmtp(s);
    });
  }, []);

  const sent = useMemo(
    () => apps.filter((a) => a.sentAt).sort((a, b) => b.sentAt!.localeCompare(a.sentAt!)),
    [apps],
  );

  const tabs: [Tab, string, number | null][] = [
    ["send", "Send", null],
    ["sent", "Sent", sent.length],
    ["roles", "Roles", roles.length],
    ["sites", "Sites", null],
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-60 -right-40 h-[360px] w-[360px] rounded-full bg-violet-600/10 blur-[100px]" />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/70 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-sm font-bold shadow-lg shadow-indigo-500/30">
              CV
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight">CV Application Manager</h1>
              <p className="truncate text-xs text-zinc-500">
                {smtp?.smtpConfigured ? `Sending as ${smtp.fromAddress}` : "Email not configured"}
              </p>
            </div>
          </div>
          <nav className="flex w-full rounded-xl sm:w-auto border border-white/10 bg-white/[0.03] p-1">
            {tabs.map(([key, label, n]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 rounded-lg px-2 py-2 text-sm sm:flex-none sm:px-4 sm:py-1.5 font-medium transition ${
                  tab === key ? "bg-white/10 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {label}
                {n !== null && <span className="ml-1.5 text-xs text-zinc-500">{n}</span>}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl space-y-4 px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:space-y-6 sm:px-6 sm:py-8">
        {smtp && !smtp.smtpConfigured && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Email is not configured. Copy <code className="text-amber-100">.env.example</code> to{" "}
            <code className="text-amber-100">.env.local</code>, fill in your SMTP details, then restart the server.
          </div>
        )}

        {tab === "send" && (
          <>
          <SendForm
            roles={roles}
            onGoToRoles={() => setTab("roles")}
            onDone={(created, failed, unsaved) => {
              setApps((prev) => [...created, ...prev]);
              const ok = created.length;
              const note = unsaved ? " (history could not be saved on this server)" : "";
              if (failed.length === 0) notify("ok", `Sent to ${ok} address${ok === 1 ? "" : "es"}${note}`);
              else
                notify(
                  "err",
                  `${ok} sent${note}, ${failed.length} failed: ${failed.map((f) => `${f.email} (${f.error})`).join("; ")}`,
                );
            }}
            onError={(e) => notify("err", e)}
          />
          <LinksCard notify={notify} />
          </>
        )}

        {tab === "sent" && (
          <section className={`${card} overflow-hidden`}>
            {sent.length === 0 ? (
              <p className="p-8 text-center text-sm text-zinc-500">Nothing sent yet.</p>
            ) : (
              <>
              <ul className="divide-y divide-white/5 sm:hidden">
                {sent.map((a) => (
                  <li key={a.id} className="space-y-1.5 px-4 py-3">
                    <div className="truncate text-sm font-medium text-zinc-100">{a.email}</div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 font-medium text-indigo-300 ring-1 ring-indigo-500/30">
                        {roles.find((r) => r.id === a.roleId)?.name ?? a.position}
                      </span>
                      <span>{fmt(a.sentAt!)}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <table className="hidden w-full text-left text-sm sm:table">
                <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Sent</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sent.map((a) => (
                    <tr key={a.id} className="transition hover:bg-white/[0.02]">
                      <td className="px-5 py-3 font-medium break-all text-zinc-100">{a.email}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-zinc-400">{fmt(a.sentAt!)}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-300 ring-1 ring-indigo-500/30">
                          {roles.find((r) => r.id === a.roleId)?.name ?? a.position}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            )}
          </section>
        )}

        {tab === "roles" && <RolesTab roles={roles} setRoles={setRoles} notify={notify} />}

        {tab === "sites" && <SitesTab roles={roles} notify={notify} />}
      </main>

      {toast && (
        <div
          className={`fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 break-words sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-md rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${
            toast.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
              : "border-rose-500/30 bg-rose-500/15 text-rose-200"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

function SendForm({
  roles,
  onDone,
  onError,
  onGoToRoles,
}: {
  roles: Role[];
  onDone: (created: Application[], failed: { email: string; error: string }[], unsaved: number) => void;
  onError: (e: string) => void;
  onGoToRoles: () => void;
}) {
  const [roleId, setRoleId] = useState("");
  const [raw, setRaw] = useState("");
  const [sending, setSending] = useState(false);

  const emails = useMemo(() => {
    const seen = new Set<string>();
    return raw
      .split(/[\s,;]+/)
      .map((e) => e.trim())
      .filter((e) => e && !seen.has(e.toLowerCase()) && seen.add(e.toLowerCase()));
  }, [raw]);
  const invalid = emails.filter((e) => !EMAIL_RE.test(e));
  const role = roles.find((r) => r.id === roleId);
  const canSend = role && emails.length > 0 && invalid.length === 0 && !sending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId, emails }),
    });
    const data = await res.json();
    setSending(false);
    if (data.applications) {
      onDone(data.applications, data.failed ?? [], data.unsaved ?? 0);
      if (!data.failed?.length) setRaw("");
    } else onError(data.error);
  }

  if (roles.length === 0) {
    return (
      <section className={`${card} p-6 text-center sm:p-8`}>
        <h2 className="text-lg font-semibold">Create a role first</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-zinc-400">
          A role holds the email subject, body and CV that get sent.
        </p>
        <button className={`${btnPrimary} mt-4`} onClick={onGoToRoles}>
          Go to Roles
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className={`${card} p-4 sm:p-5`}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight">Send application</h2>
        <p className="text-sm text-zinc-400">Pick a role and enter one or more email addresses.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <Field label="Role">
          <select className={input} value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
            <option value="">Select a role…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.cvFile ? "" : " (no CV)"}
              </option>
            ))}
          </select>
          {role && (
            <p className={`mt-2 text-xs ${role.cvFile ? "text-zinc-500" : "text-amber-400"}`}>
              {role.cvFile ? `Attaches ${role.cvFile}` : "This role has no CV — email will be sent without one."}
            </p>
          )}
        </Field>

        <Field label={`Email addresses${emails.length ? ` · ${emails.length}` : ""}`}>
          <textarea
            className={`${input} min-h-[46px] resize-y`}
            rows={2}
            placeholder="hr@company.com, jobs@another.com"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
          {emails.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {emails.map((e) => (
                <span
                  key={e}
                  className={`max-w-full truncate rounded-md px-2 py-0.5 text-xs ring-1 ${
                    EMAIL_RE.test(e)
                      ? "bg-white/[0.05] text-zinc-300 ring-white/10"
                      : "bg-rose-500/10 text-rose-300 ring-rose-500/30"
                  }`}
                >
                  {e}
                </span>
              ))}
            </div>
          )}
        </Field>
      </div>

      {role && (
        <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-4 text-sm">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Preview</div>
          <div className="mt-1 font-medium break-words text-zinc-200">
            {role.subject || role.name}
          </div>
          <p className="mt-2 line-clamp-4 whitespace-pre-line break-words text-zinc-400">
            {role.body || "(empty body)"}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        {invalid.length > 0 && <span className="text-center text-xs text-rose-400">Fix invalid addresses</span>}
        <button className={`${btnPrimary} py-2.5 sm:py-2`} disabled={!canSend}>
          {sending ? "Sending…" : `Send${emails.length > 1 ? ` to ${emails.length}` : ""}`}
        </button>
      </div>
    </form>
  );
}

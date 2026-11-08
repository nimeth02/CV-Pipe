"use client";

import { useEffect, useState } from "react";
import { Field, btnPrimary, card, input, type Role } from "./ui";

interface SiteInfo {
  id: string;
  name: string;
  exampleUrl: string;
}

interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
}

const PROFILE_FIELDS: [keyof Profile, string, string, string][] = [
  ["firstName", "First name", "Jane", "given-name"],
  ["lastName", "Last name", "Doe", "family-name"],
  ["email", "Email", "jane@example.com", "email"],
  ["phone", "Mobile phone", "+94706585632", "tel"],
  ["country", "Country", "Sri Lanka", "country-name"],
];

export default function SitesTab({
  roles,
  notify,
}: {
  roles: Role[];
  notify: (kind: "ok" | "err", text: string) => void;
}) {
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [siteId, setSiteId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [url, setUrl] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((list: SiteInfo[]) => {
        setSites(list);
        if (list[0]) {
          setSiteId(list[0].id);
          setUrl(list[0].exampleUrl);
        }
      });
  }, []);

  const site = sites.find((s) => s.id === siteId);
  const role = roles.find((r) => r.id === roleId);
  const canRun = Boolean(site && role && url.trim() && !running);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!canRun) return;
    setRunning(true);
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, roleId, url }),
      });
      const data = await res.json();
      if (!res.ok) return notify("err", data.error ?? "Failed to open site");
      notify(
        "ok",
        `Filled ${data.filled.join(", ")}${data.cvAttached ? "" : " (role has no CV)"}. Review the browser window, then click Submit.`,
      );
    } catch {
      notify("err", "Failed to open site");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <form onSubmit={run} className={`${card} p-4 sm:p-5`}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Apply on a job site</h2>
          <p className="text-sm text-zinc-400">
            Opens the job link in a browser window and fills the form. It does not submit — you review and click Submit.
            The window opens on the computer running this app.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Job site">
            <select
              className={input}
              value={siteId}
              onChange={(e) => {
                setSiteId(e.target.value);
                const next = sites.find((s) => s.id === e.target.value);
                if (next && !url.trim()) setUrl(next.exampleUrl);
              }}
              required
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

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
                {role.cvFile ? `Uploads ${role.cvFile}` : "This role has no CV — the form will be filled without one."}
              </p>
            )}
          </Field>

          <Field label="Job link" className="md:col-span-2">
            <input
              type="url"
              inputMode="url"
              className={input}
              value={url}
              placeholder={site?.exampleUrl ?? "https://"}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-col items-stretch sm:flex-row sm:justify-end">
          <button className={`${btnPrimary} py-2.5 sm:py-2`} disabled={!canRun}>
            {running ? "Opening…" : "Open & fill form"}
          </button>
        </div>
      </form>

      <ProfileCard notify={notify} />
    </div>
  );
}

function ProfileCard({ notify }: { notify: (kind: "ok" | "err", text: string) => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(setProfile);
  }, []);

  if (!profile) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaving(false);
    if (!res.ok) return notify("err", "Failed to save details");
    setProfile(await res.json());
    notify("ok", "Details saved");
  }

  return (
    <form onSubmit={save} className={`${card} p-4 sm:p-5`}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">My details</h3>
        <p className="text-xs text-zinc-500">Used to fill application forms. Saved on this computer only.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {PROFILE_FIELDS.map(([k, label, placeholder, autoComplete]) => (
          <Field key={k} label={label}>
            <input
              className={input}
              type={k === "email" ? "email" : k === "phone" ? "tel" : "text"}
              autoComplete={autoComplete}
              value={profile[k]}
              placeholder={placeholder}
              onChange={(e) => setProfile({ ...profile, [k]: e.target.value })}
            />
          </Field>
        ))}
      </div>
      <div className="mt-4 flex flex-col items-stretch sm:flex-row sm:justify-end">
        <button className={`${btnPrimary} py-2.5 sm:py-2`} disabled={saving}>
          {saving ? "Saving…" : "Save details"}
        </button>
      </div>
    </form>
  );
}

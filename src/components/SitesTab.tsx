"use client";

import { useEffect, useState } from "react";
import SiteLinksCard from "./SiteLinksCard";
import { Field, btnPrimary, card, input } from "./ui";

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

export default function SitesTab({ notify }: { notify: (kind: "ok" | "err", text: string) => void }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <SiteLinksCard notify={notify} />
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

"use client";

import { useEffect, useState } from "react";
import { Field, btnGhost, btnPrimary, card, input } from "./ui";

interface Links {
  linkedin: string;
  github: string;
  portfolio: string;
}

const FIELDS: [keyof Links, string, string][] = [
  ["linkedin", "LinkedIn", "linkedin.com/in/you"],
  ["github", "GitHub", "github.com/you"],
  ["portfolio", "Portfolio", "you.dev"],
];

export default function LinksCard({ notify }: { notify: (kind: "ok" | "err", text: string) => void }) {
  const [links, setLinks] = useState<Links | null>(null);
  const [draft, setDraft] = useState<Links | null>(null); // non-null while editing
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/links")
      .then((r) => r.json())
      .then(setLinks);
  }, []);

  if (!links) return null;
  const filled = FIELDS.filter(([k]) => links[k]);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/links", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSaving(false);
    if (!res.ok) return notify("err", "Failed to save links");
    setLinks(await res.json());
    setDraft(null);
    notify("ok", "Links saved");
  }

  return (
    <section className={`${card} p-5`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">My links</h3>
        {!draft && (
          <div className="flex gap-2">
            {filled.length > 1 && (
              <CopyButton text={filled.map(([k, label]) => `${label}: ${links[k]}`).join("\n")} label="Copy all" />
            )}
            <button type="button" className={`${btnGhost} px-3 py-1 text-xs`} onClick={() => setDraft(links)}>
              Edit
            </button>
          </div>
        )}
      </div>

      {draft ? (
        <div className="grid gap-4 md:grid-cols-3">
          {FIELDS.map(([k, label, placeholder]) => (
            <Field key={k} label={label}>
              <input
                className={input}
                value={draft[k]}
                placeholder={placeholder}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
              />
            </Field>
          ))}
          <div className="flex gap-2 md:col-span-3">
            <button type="button" className={btnPrimary} disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" className={btnGhost} disabled={saving} onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : filled.length === 0 ? (
        <p className="text-sm text-zinc-500">No links yet. Click Edit to add your LinkedIn, GitHub and portfolio.</p>
      ) : (
        <ul className="space-y-2">
          {filled.map(([k, label]) => (
            <li key={k} className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2">
              <span className="w-20 shrink-0 text-xs font-medium tracking-wide text-zinc-500 uppercase">{label}</span>
              <a
                href={links[k]}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-sm text-indigo-300 hover:underline"
              >
                {links[k]}
              </a>
              <CopyButton text={links[k]} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`${btnGhost} px-3 py-1 text-xs ${copied ? "border-emerald-500/40 text-emerald-300" : ""}`}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

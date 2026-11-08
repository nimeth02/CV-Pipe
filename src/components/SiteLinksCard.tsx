"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "./LinksCard";
import { Field, btnDanger, btnGhost, btnPrimary, card, input } from "./ui";

interface SiteLink {
  id: string;
  name: string;
  url: string;
}

export default function SiteLinksCard({ notify }: { notify: (kind: "ok" | "err", text: string) => void }) {
  const [links, setLinks] = useState<SiteLink[] | null>(null);
  // null = closed, "new" = add form, otherwise the id being edited
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", url: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/site-links")
      .then((r) => r.json())
      .then(setLinks);
  }, []);

  if (!links) return null;

  async function persist(next: { id: string; name: string; url: string }[], okMessage: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/site-links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return notify("err", data?.error ?? "Failed to save links");
      setLinks(data);
      setEditing(null);
      notify("ok", okMessage);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(link?: SiteLink) {
    setDraft(link ? { name: link.name, url: link.url } : { name: "", url: "" });
    setEditing(link?.id ?? "new");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next =
      editing === "new"
        ? [...links!, { id: "", ...draft }]
        : links!.map((l) => (l.id === editing ? { ...l, ...draft } : l));
    persist(next, editing === "new" ? "Link added" : "Link updated");
  }

  const form = (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-xl border border-indigo-500/30 bg-black/20 p-3 md:grid-cols-[1fr_2fr]"
    >
      <Field label="Name">
        <input
          className={input}
          value={draft.name}
          placeholder="Rooster · Sri Lanka"
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </Field>
      <Field label="Link">
        <input
          type="url"
          inputMode="url"
          required
          className={input}
          value={draft.url}
          placeholder="https://"
          onChange={(e) => setDraft({ ...draft, url: e.target.value })}
        />
      </Field>
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <button className={btnPrimary} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" className={btnGhost} disabled={saving} onClick={() => setEditing(null)}>
          Cancel
        </button>
      </div>
    </form>
  );

  return (
    <section className={`${card} p-4 sm:p-5`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Job site links</h3>
          <p className="text-xs text-zinc-500">Saved search pages, one tap away.</p>
        </div>
        {editing !== "new" && (
          <button type="button" className={`${btnGhost} px-3 py-1 text-xs`} onClick={() => startEdit()}>
            + Add
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {editing === "new" && <li>{form}</li>}
        {links.map((l) =>
          editing === l.id ? (
            <li key={l.id}>{form}</li>
          ) : (
            <li key={l.id} className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
              <div className="flex items-center gap-2">
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-sm font-medium text-indigo-300 hover:underline"
                >
                  {l.name}
                </a>
                <a href={l.url} target="_blank" rel="noreferrer" className={`${btnGhost} px-3 py-1 text-xs`}>
                  Open
                </a>
                <CopyButton text={l.url} />
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">{l.url}</span>
                <button
                  type="button"
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                  onClick={() => startEdit(l)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={`${btnDanger} px-2 py-0.5 text-xs`}
                  disabled={saving}
                  onClick={() =>
                    confirm(`Remove "${l.name}"?`) &&
                    persist(
                      links.filter((x) => x.id !== l.id),
                      "Link removed",
                    )
                  }
                >
                  Remove
                </button>
              </div>
            </li>
          ),
        )}
        {links.length === 0 && editing !== "new" && (
          <li className="text-sm text-zinc-500">No links yet. Click + Add.</li>
        )}
      </ul>
    </section>
  );
}

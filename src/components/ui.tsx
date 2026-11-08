export const input =
  "w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-base text-zinc-100 sm:text-sm placeholder:text-zinc-500 outline-none transition focus:border-indigo-400/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-indigo-500/15";
export const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
export const btnPrimary = `${btn} bg-linear-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 hover:brightness-110`;
export const btnGhost = `${btn} border border-white/10 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]`;
export const btnDanger = `${btn} text-rose-400 hover:bg-rose-500/10`;
export const card = "rounded-2xl border border-white/10 bg-zinc-900/60 shadow-xl shadow-black/20 backdrop-blur";

export interface Role {
  id: string;
  name: string;
  subject: string;
  body: string;
  cvFile: string | null;
  createdAt: string;
  updatedAt: string;
}

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

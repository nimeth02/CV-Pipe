import type { RoleInput } from "@/lib/roles";

export function parseRoleForm(form: FormData) {
  const str = (k: string) => String(form.get(k) ?? "").trim();
  const input: RoleInput = {
    name: str("name"),
    subject: str("subject"),
    body: str("body"),
    coverLetter: str("coverLetter"),
  };
  const file = form.get("cv");
  const cv = file instanceof File && file.size > 0 ? file : null;
  return { input, cv, removeCv: str("removeCv") === "true" };
}

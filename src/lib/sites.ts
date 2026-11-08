import type { Page } from "playwright-core";
import type { PhoneParts, Profile } from "./profile";

export interface FillContext {
  profile: Profile;
  /** Phone split into full / +code / national forms, since sites ask for it differently. */
  phone: PhoneParts;
  cvPath: string | null;
}

export interface Site {
  id: string;
  name: string;
  /** Hostnames (and their subdomains) this site handles. */
  hosts: string[];
  exampleUrl: string;
  /** Profile fields the site's form needs. */
  requires: (keyof Profile)[];
  /** Fill the form on an already-loaded page. Never submits. Returns labels of fields filled. */
  fill: (page: Page, ctx: FillContext) => Promise<string[]>;
}

const rooster: Site = {
  id: "rooster",
  name: "Rooster",
  hosts: ["rooster.jobs"],
  exampleUrl: "https://rooster.jobs/jobs/443690",
  requires: ["firstName", "lastName", "email", "phone"],
  async fill(page, { profile, phone, cvPath }) {
    const filled: string[] = [];
    const first = page.locator('input[name="firstName"]');

    if (!(await first.isVisible().catch(() => false))) {
      await page.getByRole("button", { name: /apply for this job/i }).first().click().catch(() => {});
    }
    await first.waitFor({ state: "visible", timeout: 20_000 });

    if (cvPath) {
      await page.locator('input[type="file"]').first().setInputFiles(cvPath);
      filled.push("CV");
    }
    await first.fill(profile.firstName);
    await page.locator('input[name="lastName"]').fill(profile.lastName);
    filled.push("name");
    await page.locator('input[name="email"]').fill(profile.email);
    filled.push("email");
    // International format is parsed reliably regardless of the dropdown's default country.
    await page.locator('select[aria-label="Phone number country"]').selectOption("ZZ");
    await page.locator('input[type="tel"]').fill(phone.full);
    filled.push("phone");
    return filled;
  },
};

export const SITES: Site[] = [rooster];

export const getSite = (id: string) => SITES.find((s) => s.id === id) ?? null;

export function urlMatchesSite(url: URL, site: Site) {
  return site.hosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
}

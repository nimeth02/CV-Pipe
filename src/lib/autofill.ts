import { chromium, type Browser, type Page } from "playwright-core";

// Keep one visible browser alive across requests so the user can review and submit.
const g = globalThis as unknown as { __autofillBrowser?: Promise<Browser> };

async function launch(): Promise<Browser> {
  const errors: string[] = [];
  for (const channel of ["chrome", "msedge"]) {
    try {
      const browser = await chromium.launch({ channel, headless: false });
      browser.on("disconnected", () => {
        g.__autofillBrowser = undefined;
      });
      return browser;
    } catch (err) {
      errors.push(`${channel}: ${err instanceof Error ? err.message.split("\n")[0] : err}`);
    }
  }
  throw new Error(`No Chrome or Edge found to open. ${errors.join(" | ")}`);
}

async function getBrowser(): Promise<Browser> {
  if (g.__autofillBrowser) {
    const b = await g.__autofillBrowser.catch(() => null);
    if (b?.isConnected()) return b;
  }
  g.__autofillBrowser = launch();
  g.__autofillBrowser.catch(() => {
    g.__autofillBrowser = undefined;
  });
  return g.__autofillBrowser;
}

/** Open `url` in a new visible browser window. The window is left open for the user. */
export async function openPage(url: string): Promise<Page> {
  const browser = await getBrowser();
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  return page;
}

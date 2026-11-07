"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";

/**
 * Mobile-only banner that offers to install the app (adds it to the home
 * screen / app drawer). Android/Chromium uses the native install prompt;
 * iOS Safari has no prompt API, so we show Share > Add to Home Screen steps.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const mobile = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {}
    if (standalone || !mobile || dismissed) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios) {
      // iOS never fires beforeinstallprompt; show manual instructions instead.
      const t = setTimeout(() => {
        setIsIOS(true);
        setVisible(true);
      }, 0);
      return () => clearTimeout(t);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  async function install() {
    if (isIOS) {
      setShowIOSHelp((v) => !v);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setVisible(false);
  }

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-white/10 bg-zinc-900/95 p-4 text-zinc-100 shadow-2xl backdrop-blur-xl pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install CV Manager</p>
          <p className="text-xs text-zinc-400">Add it to your home screen as an app.</p>
        </div>
        <button
          onClick={install}
          className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-indigo-400"
        >
          Install
        </button>
        <button onClick={dismiss} aria-label="Dismiss" className="px-1 text-lg leading-none text-zinc-500 hover:text-zinc-300">
          ×
        </button>
      </div>
      {isIOS && showIOSHelp && (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-zinc-300">
          <li>
            Tap the <span className="font-semibold">Share</span> button in Safari&apos;s toolbar.
          </li>
          <li>
            Choose <span className="font-semibold">Add to Home Screen</span>.
          </li>
          <li>
            Tap <span className="font-semibold">Add</span>.
          </li>
        </ol>
      )}
    </div>
  );
}

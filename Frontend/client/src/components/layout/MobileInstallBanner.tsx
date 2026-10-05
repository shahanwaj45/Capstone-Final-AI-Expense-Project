import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share, PlusSquare, Smartphone } from "lucide-react";

export default function MobileInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed PWA)
    const checkStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    // Check if dismissed previously within 3 days
    const dismissedTime = localStorage.getItem("pwa_install_dismissed");
    if (dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 3 * 24 * 60 * 60 * 1000) {
      setIsDismissed(true);
    }

    // Check iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Capture Chrome/Android PWA install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setDeferredPrompt(null);
        setIsDismissed(true);
      }
    } else if (isIOS) {
      setShowIOSTip(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("pwa_install_dismissed", Date.now().toString());
  };

  // Do not show if already in standalone app mode or dismissed or not installable
  if (isStandalone || isDismissed) {
    return null;
  }

  // Only show if prompt is available, or if on iOS browser
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed bottom-18 lg:bottom-5 left-4 right-4 z-40 mx-auto max-w-md"
      >
        <div className="relative overflow-hidden rounded-2xl bg-[#172532] p-4 text-white shadow-[0_12px_36px_rgba(23,37,50,.35)] border border-[#2c4052]">
          {/* Subtle glow accent */}
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#7BE2BE]/15 blur-xl pointer-events-none" />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-[#38EF7D] to-[#00F2FE] p-1.5 shadow-md">
                <Smartphone size={20} className="text-[#172532]" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-white">
                  Install Mobile App
                </p>
                <p className="truncate text-[11px] text-[#9db1a7]">
                  Fast camera scan, offline & native full-screen
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 rounded-xl bg-[#7BE2BE] px-3.5 py-2 text-[12px] font-bold text-[#172532] shadow-sm transition hover:bg-[#6be0b7] active:scale-95"
              >
                <Download size={13} />
                Install
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-lg p-1.5 text-[#86998f] hover:bg-white/10 hover:text-white transition"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* iOS Safari instructions tooltip */}
          {showIOSTip && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 border-t border-white/10 pt-3 text-[11px] text-[#c2d4cb]"
            >
              <p className="flex items-center gap-1.5">
                1. Tap the <Share size={13} className="text-[#7BE2BE] inline" /> Share button in Safari toolbar.
              </p>
              <p className="mt-1 flex items-center gap-1.5">
                2. Scroll down and tap <PlusSquare size={13} className="text-[#7BE2BE] inline" /> <strong>"Add to Home Screen"</strong>.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

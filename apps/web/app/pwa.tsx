"use client";
import { useEffect, useState } from "react";
import { useI18n } from "./i18n";

export default function Pwa() {
  const { t } = useI18n();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    const change = () => setOffline(!navigator.onLine);
    change();
    window.addEventListener("online", change);
    window.addEventListener("offline", change);
    return () => {
      window.removeEventListener("online", change);
      window.removeEventListener("offline", change);
    };
  }, []);
  return offline ? (
    <div className="offline-banner" role="status">
      {t("pwa.offline")}
    </div>
  ) : null;
}

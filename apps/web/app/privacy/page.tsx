"use client";
import Link from "next/link";
import { LanguageSwitcher, useI18n } from "../i18n";

export default function Privacy() {
  const { t } = useI18n();
  return (
    <main className="legal">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 8,
        }}
      >
        <Link href="/">{t("privacy.back")}</Link>
        <LanguageSwitcher />
      </div>
      <h1>{t("privacy.title")}</h1>
      <p>{t("privacy.p1")}</p>
      <h2>{t("privacy.h2Visit")}</h2>
      <p>{t("privacy.p2")}</p>
      <h2>{t("privacy.h2Info")}</h2>
      <p>{t("privacy.p3")}</p>
      <h2>{t("privacy.h2Access")}</h2>
      <p>{t("privacy.p4")}</p>
      <p className="notice">{t("privacy.notice")}</p>
    </main>
  );
}

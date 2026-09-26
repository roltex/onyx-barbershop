"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "../lib";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { LanguageSwitcher, useI18n } from "../i18n";
import BrandMark from "../BrandMark";

export default function Login() {
  const { t, te } = useI18n();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(f)),
      });
      location.href = "/dashboard";
    } catch (e) {
      setError(te((e as Error).message));
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <div className="login-art">
        <BrandMark size="lg" />
        <h1>
          {t("login.title1")}
          <br />
          {t("login.title2")}
          <br />
          <em>{t("login.title3")}</em>
        </h1>
        <p>{t("login.subtitle")}</p>
      </div>
      <section className="login-form">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Link href="/" className="muted">
            ← {t("common.backStudio")}
          </Link>
          <LanguageSwitcher />
        </div>
        <div className="login-box">
          <LockKeyhole size={30} />
          <p className="eyebrow">{t("login.eyebrow")}</p>
          <h2>{t("login.welcome")}</h2>
          <p className="muted">{t("login.signInLead")}</p>
          <form onSubmit={submit}>
            <label>
              {t("login.email")}
              <input
                required
                type="email"
                name="email"
                autoComplete="username"
                placeholder={t("login.emailPh")}
              />
            </label>
            <label>
              {t("login.password")}
              <input
                required
                type="password"
                name="password"
                autoComplete="current-password"
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="button dark" disabled={busy}>
              {busy ? t("login.signingIn") : t("login.signIn")}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="hint">{t("login.hint")}</p>
        </div>
      </section>
    </main>
  );
}

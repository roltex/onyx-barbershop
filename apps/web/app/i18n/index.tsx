"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import en, { type Messages } from "./en";
import ka from "./ka";
import type { Locale as AppLocale } from "../lib";

export type Locale = AppLocale;
const STORAGE_KEY = "onyx-locale";
const catalogs: Record<Locale, Messages> = { en, ka };

type Vars = Record<string, string | number>;

function getByPath(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

function interpolate(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] != null ? String(vars[key]) : `{${key}}`,
  );
}

function detectLocale(): Locale {
  if (typeof window === "undefined") return "ka";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "ka") return saved;
  } catch {}
  const nav = navigator.language?.toLowerCase() || "";
  return nav.startsWith("ka") ? "ka" : "ka";
}

type I18nValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string, vars?: Vars) => string;
  tx: (text: string) => string;
  te: (error: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ka");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocaleState(detectLocale());
    setReady(true);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
  }, [locale, ready]);

  const messages = catalogs[locale];

  const t = useCallback(
    (path: string, vars?: Vars) => {
      const value =
        getByPath(messages, path) ?? getByPath(en, path) ?? path;
      return interpolate(value, vars);
    },
    [messages],
  );

  const tx = useCallback(
    (text: string) => {
      if (!text) return text;
      const fromContent = (messages.content as Record<string, string>)[text];
      if (fromContent) return fromContent;
      const fromCategory = (messages.category as Record<string, string>)[text];
      if (fromCategory && text !== "All") return fromCategory;
      return text;
    },
    [messages],
  );

  const te = useCallback(
    (error: string) => {
      if (!error) return error;
      const mapped = (messages.errors as Record<string, string>)[error];
      return mapped || error;
    },
    [messages],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, tx, te }),
    [locale, setLocale, t, tx, te],
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LocaleProvider");
  return ctx;
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      className={"lang-switch " + className}
      role="group"
      aria-label={t("common.switchLang")}
    >
      <button
        type="button"
        className={locale === "ka" ? "active" : ""}
        onClick={() => setLocale("ka")}
        aria-pressed={locale === "ka"}
      >
        {t("common.langKa")}
      </button>
      <button
        type="button"
        className={locale === "en" ? "active" : ""}
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
      >
        {t("common.langEn")}
      </button>
    </div>
  );
}

export function localeTag(locale: Locale) {
  return locale === "ka" ? "ka-GE" : "en";
}

export function dateLocale(locale: Locale) {
  return locale === "ka" ? "ka-GE" : "en-GB";
}

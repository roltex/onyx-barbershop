export type Locale = "en" | "ka";

export async function api(path: string, options: RequestInit = {}) {
  const res = await fetch("/api" + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await res
    .json()
    .catch(() => ({ error: "The server is unavailable." }));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function money(
  value: number,
  currency = "GEL",
  locale: Locale | string = "en",
) {
  const tag = locale === "ka" || locale === "ka-GE" ? "ka-GE" : "en";
  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function localDate(zone = "Asia/Tbilisi") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function dateTime(
  value: string,
  zone = "Asia/Tbilisi",
  locale: Locale | string = "en",
) {
  const tag = locale === "ka" || locale === "ka-GE" ? "ka-GE" : "en-GB";
  return new Intl.DateTimeFormat(tag, {
    timeZone: zone,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export type Service = {
  id: string;
  name: string;
  category: string;
  description: string;
  duration: number;
  price: number;
  active: boolean;
};
export type Staff = {
  id: string;
  name: string;
  title: string;
  bio: string;
  color: string;
  serviceIds: string[];
  schedule: Record<string, { start: string; end: string }>;
  active: boolean;
};
export type Settings = {
  name: string;
  timezone: string;
  currency: string;
  address: string;
  phone: string;
  email: string;
  instagram: string;
  leadMinutes: number;
  horizonDays: number;
  cancelHours: number;
  notice: string;
};
export type Catalog = {
  services: Service[];
  staff: Staff[];
  settings: Settings;
};

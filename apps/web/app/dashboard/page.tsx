"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Scissors,
  UserRound,
  Package,
  ChartNoAxesCombined,
  Settings,
  ShieldCheck,
  Mail,
  LogOut,
  Plus,
  Search,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Menu,
  Clock,
  CircleDollarSign,
  ChevronRight,
  Download,
  Pencil,
  CalendarOff,
} from "lucide-react";
import { api, money, dateTime, localDate, Catalog } from "../lib";
import { LanguageSwitcher, dateLocale, useI18n } from "../i18n";
import BrandMark from "../BrandMark";
type Row = Record<string, any>;
const navigation = [
  ["overview", LayoutDashboard],
  ["bookings", CalendarDays],
  ["customers", Users],
  ["services", Scissors],
  ["staff", UserRound],
  ["inventory", Package],
  ["reports", ChartNoAxesCombined],
  ["outbox", Mail],
  ["settings", Settings],
  ["users", ShieldCheck],
  ["audit", Clock],
] as const;
const defaults: Record<string, Row> = {
  services: {
    name: "",
    category: "Barber",
    description: "",
    duration: 45,
    price: 0,
    active: true,
  },
  customers: { name: "", email: "", phone: "", notes: "", marketing: false },
  inventory: { name: "", sku: "", quantity: 0, threshold: 5, price: 0 },
  staff: {
    name: "",
    title: "Barber",
    color: "#bd8d62",
    bio: "",
    serviceIds: [],
    schedule: {
      1: { start: "10:00", end: "19:00" },
      2: { start: "10:00", end: "19:00" },
      3: { start: "10:00", end: "19:00" },
      4: { start: "10:00", end: "19:00" },
      5: { start: "10:00", end: "19:00" },
      6: { start: "10:00", end: "18:00" },
    },
    active: true,
  },
  users: { name: "", email: "", password: "", role: "manager" },
};
const dayKeys = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const entityKey: Record<string, string> = {
  customers: "customer",
  services: "service",
  staff: "team member",
  inventory: "product",
  users: "user",
};
const addKey: Record<string, string> = {
  customers: "dash.addCustomer",
  services: "dash.addService",
  staff: "dash.addStaff",
  inventory: "dash.addProduct",
  users: "dash.addUser",
};
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => {
      ref.current?.close();
    };
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose} className="modal">
      <div className="modal-header">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function Dashboard() {
  const { t, tx, te, locale } = useI18n();
  const [session, setSession] = useState<Row>();
  const [catalog, setCatalog] = useState<Catalog>();
  const [tab, setTab] = useState("overview");
  const [rows, setRows] = useState<Row[]>([]);
  const [overview, setOverview] = useState<Row>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [day, setDay] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState("list");
  const [sidebar, setSidebar] = useState(false);
  const [edit, setEdit] = useState<Row | null>(null);
  const [modal, setModal] = useState("");
  const [selected, setSelected] = useState<Row>();
  const [history, setHistory] = useState<Row[]>([]);
  const [off, setOff] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<Row>();
  const currency = catalog?.settings.currency || "GEL",
    zone = catalog?.settings.timezone || "Asia/Tbilisi";
  const navLabel = (key: string) => t("dash.nav." + key);
  async function mutate(path: string, body: Row = {}, method = "POST") {
    return api("/admin" + path, {
      method,
      headers: { "x-csrf-token": session?.csrf || "" },
      body: JSON.stringify(body),
    });
  }
  const requestVersion = useRef(0);
  async function refresh(current = tab) {
    const version = ++requestVersion.current;
    setError("");
    setLoading(true);
    try {
      const c = await api("/public/catalog");
      let nextRows: Row[] = [],
        nextOverview: Row | undefined,
        nextSettings: Row | undefined,
        nextOff: Row[] = [];
      if (current === "overview" || current === "reports") {
        [nextOverview, nextRows] = await Promise.all([
          api("/admin/overview"),
          api(
            "/admin/bookings" +
              (current === "overview"
                ? "?date=" + localDate(c.settings.timezone)
                : ""),
          ),
        ]);
      } else if (current === "settings") {
        nextSettings = await api("/admin/settings");
      } else {
        nextRows = await api(
          "/admin/" +
            current +
            (current === "bookings" && day ? "?date=" + day : ""),
        );
        if (current === "staff") nextOff = await api("/admin/timeoff");
      }
      if (version !== requestVersion.current) return;
      setCatalog(c);
      setRows(nextRows);
      if (nextOverview) setOverview(nextOverview);
      if (nextSettings) setSettings(nextSettings);
      setOff(nextOff);
    } catch (e) {
      if (version === requestVersion.current) setError(te((e as Error).message));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }
  useEffect(() => {
    api("/auth/me")
      .then(setSession)
      .catch(() => location.assign("/login"));
  }, []);
  useEffect(() => {
    if (session) refresh();
  }, [session, tab, day]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  function go(next: string) {
    if (next === tab) {
      setSidebar(false);
      return;
    }
    requestVersion.current += 1;
    setLoading(true);
    setRows([]);
    setTab(next);
    setQuery("");
    setStatus("all");
    setSidebar(false);
    setNotice("");
  }
  async function action(fn: () => Promise<any>, message: string) {
    setBusy(true);
    setError("");
    try {
      await fn();
      setNotice(message);
      await refresh();
      return true;
    } catch (e) {
      setError(te((e as Error).message));
      return false;
    } finally {
      setBusy(false);
    }
  }
  function openEditor(row?: Row) {
    setEdit(structuredClone(row || defaults[tab]));
    setModal("edit");
    setError("");
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const b = { ...edit };
    delete b.id;
    delete b.createdAt;
    const ok = await action(
      () =>
        mutate(
          "/" + tab + (edit.id ? "/" + edit.id : ""),
          b,
          edit.id ? "PUT" : "POST",
        ),
      t("dash.saved"),
    );
    if (ok) {
      setModal("");
      setEdit(null);
    }
  }
  function field(key: string, label: string, type = "text", required = true) {
    return (
      <label key={key}>
        {label}
        <input
          type={type}
          required={required}
          value={edit?.[key] ?? ""}
          min={type === "number" ? 0 : undefined}
          minLength={key === "password" ? 12 : undefined}
          onChange={(e) =>
            setEdit({
              ...edit,
              [key]:
                type === "number" ? Number(e.target.value) : e.target.value,
            })
          }
        />
      </label>
    );
  }
  function exportCsv() {
    const fields =
      tab === "customers"
        ? ["name", "email", "phone", "marketing"]
        : [
            "reference",
            "customerName",
            "serviceName",
            "staffName",
            "start",
            "status",
            "price",
            "paymentStatus",
          ];
    const safe = (v: any) => {
      let s = String(v ?? "");
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    };
    const blob = new Blob(
      [
        "\uFEFF" +
          [
            fields.join(","),
            ...filtered.map((r) => fields.map((k) => safe(r[k])).join(",")),
          ].join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `onyx-${tab}-${localDate(zone)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const filtered = rows.filter(
    (r) =>
      JSON.stringify(r).toLowerCase().includes(query.toLowerCase()) &&
      (status === "all" || r.status === status),
  );
  const today = rows.filter(
    (r) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(
        new Date(r.start || 0),
      ) === localDate(zone),
  );
  function bookingTable(list: Row[]) {
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("dash.thCustomer")}</th>
              <th>{t("dash.thService")}</th>
              <th>{t("dash.thSpecialist")}</th>
              <th>{t("dash.thAppointment")}</th>
              <th>{t("dash.thStatus")}</th>
              <th>{t("dash.thTotal")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.id}>
                <td>
                  <strong>{b.customerName}</strong>
                  <small>{b.reference}</small>
                </td>
                <td>{tx(b.serviceName)}</td>
                <td>
                  <span className="staff-label">
                    <i style={{ background: b.color }} />
                    {tx(b.staffName)}
                  </span>
                </td>
                <td>{dateTime(b.start, zone, locale)}</td>
                <td>
                  <span className={"badge " + b.status}>
                    {t("status." + b.status)}
                  </span>
                </td>
                <td>
                  {money(b.price, currency, locale)}
                  <small>{t("status." + b.paymentStatus)}</small>
                </td>
                <td>
                  <button
                    className="icon-button"
                    onClick={() => {
                      setSelected(b);
                      setModal("booking");
                    }}
                    aria-label={t("common.manage", { ref: b.reference })}
                  >
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && (
          <div className="empty">
            <CalendarDays size={28} />
            <h3>{t("dash.emptyApptsTitle")}</h3>
            <p>{t("dash.emptyApptsBody")}</p>
            <button
              className="button dark small"
              onClick={() => setModal("newBooking")}
            >
              {t("dash.addAppointment")}
            </button>
          </div>
        )}
      </div>
    );
  }
  if (!session)
    return <main className="loading-page">{t("dash.opening")}</main>;
  return (
    <div className="dashboard">
      <aside className={"sidebar " + (sidebar ? "is-open" : "")}>
        <BrandMark size="sm" variant="stacked" className="sidebar-brand" />
        <p className="nav-label">{t("dash.navLabel")}</p>
        <nav>
          {navigation
            .filter(
              ([key]) =>
                session.user.role === "owner" ||
                !["users", "audit"].includes(key),
            )
            .map(([key, Icon]) => (
              <button
                key={key}
                className={tab === key ? "active" : ""}
                onClick={() => go(key)}
              >
                <Icon size={19} />
                {navLabel(key)}
                {key === "bookings" && overview?.confirmed > 0 && (
                  <span className="nav-count">{overview?.confirmed}</span>
                )}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" target="_blank">
            {t("dash.viewWebsite")} <ArrowUpRight size={17} />
          </Link>
          <div className="user-profile">
            <span className="avatar">{session.user.name.slice(0, 1)}</span>
            <div>
              <strong>{session.user.name}</strong>
              <small>{t("role." + session.user.role)}</small>
            </div>
            <button
              className="icon-button"
              aria-label={t("dash.signOut")}
              onClick={async () => {
                await api("/auth/logout", {
                  method: "POST",
                  headers: { "x-csrf-token": session.csrf },
                  body: "{}",
                });
                location.assign("/login");
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      {sidebar && (
        <button
          className="sidebar-scrim"
          aria-label={t("dash.closeNav")}
          onClick={() => setSidebar(false)}
        />
      )}
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <button
              className="mobile-menu icon-button"
              aria-label={t("dash.openNav")}
              onClick={() => setSidebar(true)}
            >
              <Menu />
            </button>
            <span className="muted">{t("dash.workspace")}</span>
            <ChevronRight size={14} />
            <strong>{navLabel(tab)}</strong>
          </div>
          <span className="header-date">
            {new Intl.DateTimeFormat(dateLocale(locale), {
              timeZone: zone,
              weekday: "short",
              day: "numeric",
              month: "long",
            }).format(new Date())}
          </span>
          <LanguageSwitcher />
          <Link className="header-booking" href="/book" target="_blank">
            {t("dash.bookingPage")} <ArrowUpRight size={16} />
          </Link>
        </header>
        <main className="dashboard-content">
          <div className="dashboard-title">
            <div>
              <p className="eyebrow">
                {tab === "overview"
                  ? t("dash.overviewEyebrow")
                  : t("common.brand") + " / " + tab.toUpperCase()}
              </p>
              <h1>
                {tab === "overview"
                  ? t("dash.hello", {
                      name: session.user.name.split(" ")[0],
                    })
                  : navLabel(tab)}
              </h1>
              <p className="muted">{t("dash.subtitle." + tab)}</p>
            </div>
            {["overview", "bookings"].includes(tab) ? (
              <button
                className="button dark"
                onClick={() => setModal("newBooking")}
              >
                <Plus size={18} /> {t("dash.newAppt")}
              </button>
            ) : defaults[tab] ? (
              <button className="button dark" onClick={() => openEditor()}>
                <Plus size={18} /> {t(addKey[tab])}
              </button>
            ) : null}
          </div>
          {notice && (
            <div className="success-notice" role="status">
              <Check size={17} />
              {notice}
            </div>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {loading ? (
            <div className="skeleton">{t("dash.loadingData")}</div>
          ) : (
            <>
              {tab === "overview" && (
                <>
                  <div className="stats-grid">
                    {[
                      [
                        t("dash.statToday"),
                        overview?.today,
                        CalendarDays,
                        t("dash.statTodaySub"),
                      ],
                      [
                        t("dash.statComing"),
                        overview?.confirmed,
                        Clock,
                        t("dash.statComingSub"),
                      ],
                      [
                        t("dash.statCollected"),
                        money(overview?.revenue || 0, currency, locale),
                        CircleDollarSign,
                        t("dash.statCollectedSub"),
                      ],
                      [
                        t("dash.statCustomers"),
                        overview?.customers,
                        Users,
                        t("dash.statCustomersSub"),
                      ],
                    ].map(([label, value, Icon, sub]: any) => (
                      <div className="stat-card" key={label}>
                        <div>
                          <span>{label}</span>
                          <Icon size={19} />
                        </div>
                        <strong>{value}</strong>
                        <small>{sub}</small>
                      </div>
                    ))}
                  </div>
                  <div className="overview-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>{t("dash.todayAppts")}</h2>
                          <p className="muted">{t("dash.prepDay")}</p>
                        </div>
                        <button
                          className="text-link"
                          onClick={() => {
                            setDay(localDate(zone));
                            go("bookings");
                          }}
                        >
                          {t("dash.viewAll")} <ArrowRight size={16} />
                        </button>
                      </div>
                      {bookingTable(
                        today
                          .slice()
                          .sort((a, b) => a.start.localeCompare(b.start)),
                      )}
                    </section>
                    <aside className="day-panel">
                      <div className="day-panel-top">
                        <Scissors size={26} />
                        <p className="eyebrow">{t("dash.dayPanelEyebrow")}</p>
                        <h2>
                          {t("dash.dayPanelTitle1")}
                          <br />
                          {t("dash.dayPanelTitle2")}
                        </h2>
                        <button
                          className="button copper"
                          onClick={() => setModal("newBooking")}
                        >
                          {t("dash.bookCustomer")} <Plus size={17} />
                        </button>
                      </div>
                      <div className="stock-summary">
                        <h3>{t("dash.shelfCheck")}</h3>
                        {overview?.lowStock.length ? (
                          overview.lowStock.map((i: Row) => (
                            <p key={i.id}>
                              <span>{tx(i.name)}</span>
                              <b>{t("common.left", { n: i.quantity })}</b>
                            </p>
                          ))
                        ) : (
                          <p className="muted">{t("dash.stockGood")}</p>
                        )}
                        <button
                          className="text-link"
                          onClick={() => go("inventory")}
                        >
                          {t("dash.manageInventory")} <ArrowRight size={16} />
                        </button>
                      </div>
                    </aside>
                  </div>
                </>
              )}
              {tab === "bookings" && (
                <section className="panel">
                  <div className="toolbar">
                    <div className="search-field">
                      <Search size={17} />
                      <input
                        aria-label={t("dash.searchAppts")}
                        placeholder={t("dash.searchApptsPh")}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <input
                      aria-label={t("dash.filterDate")}
                      type="date"
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                    />
                    <button
                      className="button outline small"
                      onClick={() => setDay("")}
                    >
                      {t("dash.allDates")}
                    </button>
                    <select
                      aria-label={t("dash.filterStatus")}
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {[
                        "all",
                        "confirmed",
                        "completed",
                        "cancelled",
                        "no_show",
                      ].map((v) => (
                        <option key={v} value={v}>
                          {t("status." + v)}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label={t("dash.apptView")}
                      value={view}
                      onChange={(e) => {
                        setView(e.target.value);
                        if (e.target.value === "agenda" && !day)
                          setDay(localDate(zone));
                      }}
                    >
                      <option value="list">{t("dash.listView")}</option>
                      <option value="agenda">{t("dash.teamAgenda")}</option>
                    </select>
                    <button
                      className="icon-button"
                      onClick={exportCsv}
                      aria-label={t("dash.exportAppts")}
                    >
                      <Download size={18} />
                    </button>
                  </div>
                  {view === "agenda" ? (
                    <div className="agenda-grid">
                      {catalog?.staff.map((s) => (
                        <div className="agenda-column" key={s.id}>
                          <h3>
                            <span
                              className="avatar"
                              style={{ background: s.color }}
                            >
                              {s.name[0]}
                            </span>
                            {tx(s.name)}
                          </h3>
                          {filtered
                            .filter((b) => b.staffId === s.id)
                            .sort((a, b) => a.start.localeCompare(b.start))
                            .map((b) => (
                              <button
                                key={b.id}
                                className="agenda-booking"
                                style={{ borderLeftColor: s.color }}
                                onClick={() => {
                                  setSelected(b);
                                  setModal("booking");
                                }}
                              >
                                <span>{dateTime(b.start, zone, locale)}</span>
                                <strong>{b.customerName}</strong>
                                <p>{tx(b.serviceName)}</p>
                                <small className={"badge " + b.status}>
                                  {t("status." + b.status)}
                                </small>
                              </button>
                            ))}
                          {!filtered.some((b) => b.staffId === s.id) && (
                            <p className="hint">{t("dash.noAppts")}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    bookingTable(filtered)
                  )}
                </section>
              )}
              {["customers", "inventory", "users"].includes(tab) && (
                <section className="panel">
                  <div className="toolbar">
                    <div className="search-field">
                      <Search size={17} />
                      <input
                        placeholder={t("dash.searchTab", {
                          tab: navLabel(tab),
                        })}
                        aria-label={t("dash.searchTab", {
                          tab: navLabel(tab),
                        })}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    {tab === "customers" && (
                      <button
                        className="button outline small"
                        onClick={exportCsv}
                      >
                        <Download size={16} /> {t("dash.exportCsv")}
                      </button>
                    )}
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          {(tab === "customers"
                            ? [
                                t("dash.thCustomer"),
                                t("dash.thEmail"),
                                t("dash.thPhone"),
                                t("dash.thMarketing"),
                                "",
                              ]
                            : tab === "inventory"
                              ? [
                                  t("dash.thProduct"),
                                  t("dash.thSku"),
                                  t("dash.thInStock"),
                                  t("dash.thPrice"),
                                  "",
                                ]
                              : [
                                  t("dash.thName"),
                                  t("dash.thEmail"),
                                  t("dash.thRole"),
                                  t("dash.thAccess"),
                                  "",
                                ]
                          ).map((h, i) => (
                            <th key={i}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <strong>
                                {tab === "inventory" ? tx(r.name) : r.name}
                              </strong>
                              {tab === "inventory" &&
                                r.quantity <= r.threshold && (
                                  <span className="badge no_show">
                                    {t("dash.lowStock")}
                                  </span>
                                )}
                            </td>
                            {tab === "customers" ? (
                              <>
                                <td>{r.email}</td>
                                <td>{r.phone}</td>
                                <td>
                                  {r.marketing
                                    ? t("dash.optedIn")
                                    : t("dash.notOptedIn")}
                                </td>
                              </>
                            ) : tab === "inventory" ? (
                              <>
                                <td>{r.sku}</td>
                                <td>
                                  {r.quantity}
                                  <small>
                                    {t("dash.alertAt", { n: r.threshold })}
                                  </small>
                                </td>
                                <td>{money(r.price, currency, locale)}</td>
                              </>
                            ) : (
                              <>
                                <td>{r.email}</td>
                                <td>{t("role." + r.role)}</td>
                                <td>
                                  <span
                                    className={
                                      "badge " +
                                      (r.active ? "confirmed" : "cancelled")
                                    }
                                  >
                                    {r.active
                                      ? t("common.active")
                                      : t("common.disabled")}
                                  </span>
                                </td>
                              </>
                            )}
                            <td>
                              <div className="row-actions">
                                {tab === "customers" && (
                                  <button
                                    className="text-link"
                                    onClick={async () => {
                                      try {
                                        setSelected(r);
                                        setHistory(
                                          await api(
                                            "/admin/customers/" +
                                              r.id +
                                              "/history",
                                          ),
                                        );
                                        setModal("history");
                                      } catch (e) {
                                        setError(te((e as Error).message));
                                      }
                                    }}
                                  >
                                    {t("common.history")}
                                  </button>
                                )}
                                {tab === "users" ? (
                                  r.id !== session.user.id && (
                                    <button
                                      className="button outline small"
                                      disabled={busy}
                                      onClick={() =>
                                        action(
                                          () =>
                                            mutate(
                                              "/users/" + r.id,
                                              { active: !r.active },
                                              "PATCH",
                                            ),
                                          t("dash.accessUpdated"),
                                        )
                                      }
                                    >
                                      {r.active
                                        ? t("common.disable")
                                        : t("common.enable")}
                                    </button>
                                  )
                                ) : (
                                  <button
                                    className="icon-button"
                                    aria-label={t("common.edit", {
                                      name: r.name,
                                    })}
                                    onClick={() => openEditor(r)}
                                  >
                                    <Pencil size={17} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!filtered.length && (
                      <div className="empty">
                        {t("dash.emptyRecords", {
                          entity:
                            tab === "customers"
                              ? t("dash.entity.customer")
                              : tab === "inventory"
                                ? t("dash.entity.product")
                                : t("dash.entity.user"),
                        })}
                      </div>
                    )}
                  </div>
                </section>
              )}
              {tab === "services" && (
                <div className="admin-card-grid">
                  {rows.map((s) => (
                    <article className="panel admin-service" key={s.id}>
                      <div className="card-top">
                        <span className="service-icon">
                          <Scissors />
                        </span>
                        <span
                          className={
                            "badge " + (s.active ? "confirmed" : "cancelled")
                          }
                        >
                          {s.active ? t("common.active") : t("common.archived")}
                        </span>
                        <button
                          className="icon-button"
                          aria-label={t("common.edit", { name: s.name })}
                          onClick={() => openEditor(s)}
                        >
                          <Pencil size={17} />
                        </button>
                      </div>
                      <p className="eyebrow">{tx(s.category)}</p>
                      <h2>{tx(s.name)}</h2>
                      <p className="muted">{tx(s.description)}</p>
                      <div className="card-bottom">
                        <span>
                          <Clock size={16} />
                          {t("common.minutes", { n: s.duration })}
                        </span>
                        <strong>{money(s.price, currency, locale)}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {tab === "staff" && (
                <>
                  <div className="admin-card-grid">
                    {rows.map((s) => (
                      <article className="panel staff-card" key={s.id}>
                        <div className="card-top">
                          <span
                            className="avatar large"
                            style={{ background: s.color }}
                          >
                            {s.name
                              .split(" ")
                              .map((v: string) => v[0])
                              .join("")}
                          </span>
                          <span
                            className={
                              "badge " + (s.active ? "confirmed" : "cancelled")
                            }
                          >
                            {s.active
                              ? t("common.active")
                              : t("common.archived")}
                          </span>
                          <button
                            className="icon-button"
                            aria-label={t("common.edit", { name: s.name })}
                            onClick={() => openEditor(s)}
                          >
                            <Pencil size={17} />
                          </button>
                        </div>
                        <h2>{tx(s.name)}</h2>
                        <p className="muted">{tx(s.title)}</p>
                        <div className="schedule-preview">
                          {Object.entries(s.schedule).map(([d, h]: any) => (
                            <div key={d}>
                              <span>
                                {t("days." + dayKeys[Number(d) - 1])}
                              </span>
                              <strong>
                                {h.start} – {h.end}
                              </strong>
                            </div>
                          ))}
                        </div>
                        <button
                          className="button outline small"
                          onClick={() => {
                            setSelected(s);
                            setModal("timeoff");
                          }}
                        >
                          <CalendarOff size={16} /> {t("dash.addTimeOff")}
                        </button>
                      </article>
                    ))}
                  </div>
                  <section className="panel timeoff-panel">
                    <div className="panel-heading">
                      <h2>{t("dash.timeOffTitle")}</h2>
                      <span className="muted">{zone}</span>
                    </div>
                    {off.length ? (
                      off.map((o) => (
                        <div key={o.id} className="timeoff-row">
                          <div>
                            <strong>
                              {tx(
                                rows.find((s) => s.id === o.staffId)?.name ||
                                  "",
                              )}
                            </strong>
                            <p>
                              {dateTime(o.start, zone, locale)} —{" "}
                              {dateTime(o.end, zone, locale)} · {o.reason}
                            </p>
                          </div>
                          <button
                            className="button outline small"
                            onClick={() => {
                              if (confirm(t("dash.removeTimeOff")))
                                action(
                                  () =>
                                    mutate("/timeoff/" + o.id, {}, "DELETE"),
                                  t("dash.timeOffRemoved"),
                                );
                            }}
                          >
                            {t("common.remove")}
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="empty">{t("dash.noTimeOff")}</p>
                    )}
                  </section>
                </>
              )}
              {tab === "reports" && (
                <>
                  <div className="stats-grid">
                    {[
                      [
                        t("dash.reportCollected"),
                        money(
                          (overview?.month || [])
                            .filter((b: Row) => b.paymentStatus === "paid")
                            .reduce(
                              (a: number, b: Row) => a + b.price + b.tip,
                              0,
                            ),
                          currency,
                          locale,
                        ),
                      ],
                      [t("dash.reportAppts"), overview?.month.length || 0],
                      [
                        t("dash.reportCompleted"),
                        (overview?.month || []).filter(
                          (b: Row) => b.status === "completed",
                        ).length,
                      ],
                      [
                        t("dash.reportNoShows"),
                        (overview?.month || []).filter(
                          (b: Row) => b.status === "no_show",
                        ).length,
                      ],
                    ].map(([label, value]) => (
                      <div className="stat-card" key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                        <small>{t("dash.reportSub")}</small>
                      </div>
                    ))}
                  </div>
                  <section className="panel report-panel">
                    <h2>{t("dash.servicePerf")}</h2>
                    <p className="muted">{t("dash.servicePerfLead")}</p>
                    {catalog?.services.map((s) => {
                      const visits = (overview?.month || []).filter(
                        (b: Row) =>
                          b.serviceId === s.id && b.paymentStatus === "paid",
                      );
                      const value = visits.reduce(
                        (a: number, b: Row) => a + b.price,
                        0,
                      );
                      const max = Math.max(
                        1,
                        ...catalog.services.map((svc) =>
                          (overview?.month || [])
                            .filter(
                              (b: Row) =>
                                b.serviceId === svc.id &&
                                b.paymentStatus === "paid",
                            )
                            .reduce((a: number, b: Row) => a + b.price, 0),
                        ),
                      );
                      return (
                        <div className="report-row" key={s.id}>
                          <div>
                            <strong>{tx(s.name)}</strong>
                            <span>
                              {t("dash.paidVisits", {
                                n: visits.length,
                                money: money(value, currency, locale),
                              })}
                            </span>
                          </div>
                          <div className="bar-track">
                            <div style={{ width: (value / max) * 100 + "%" }} />
                          </div>
                        </div>
                      );
                    })}
                  </section>
                </>
              )}
              {tab === "outbox" && (
                <section className="panel">
                  <div className="panel-heading">
                    <h2>{t("dash.confirmEmails")}</h2>
                    <span className="muted">{t("dash.smtpNote")}</span>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{t("dash.thRecipient")}</th>
                          <th>{t("dash.thSubject")}</th>
                          <th>{t("dash.thStatus")}</th>
                          <th>{t("dash.thAttempts")}</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.id}>
                            <td>{r.to}</td>
                            <td>
                              {r.subject}
                              <small>
                                {dateTime(r.createdAt, zone, locale)}
                              </small>
                            </td>
                            <td>
                              <span
                                className={
                                  "badge " +
                                  (r.status === "sent"
                                    ? "completed"
                                    : r.status === "failed"
                                      ? "cancelled"
                                      : "confirmed")
                                }
                              >
                                {t("status." + r.status)}
                              </span>
                              {r.error && <small>{te(r.error)}</small>}
                            </td>
                            <td>{r.attempts}</td>
                            <td>
                              {r.status === "failed" && (
                                <button
                                  className="button outline small"
                                  onClick={() =>
                                    action(
                                      () =>
                                        mutate("/outbox/" + r.id + "/retry"),
                                      t("dash.messageQueued"),
                                    )
                                  }
                                >
                                  {t("common.retry")}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!rows.length && (
                      <p className="empty">{t("dash.noMessages")}</p>
                    )}
                  </div>
                </section>
              )}
              {tab === "audit" && (
                <section className="panel">
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{t("dash.thWhen")}</th>
                          <th>{t("dash.thWho")}</th>
                          <th>{t("dash.thAction")}</th>
                          <th>{t("dash.thRecord")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.id}>
                            <td>{dateTime(r.createdAt, zone, locale)}</td>
                            <td>{r.actor}</td>
                            <td>{r.action}</td>
                            <td>
                              <code>{r.entityId?.slice(0, 12)}</code>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!rows.length && (
                      <p className="empty">{t("dash.noChanges")}</p>
                    )}
                  </div>
                </section>
              )}
              {tab === "settings" && settings && (
                <div className="settings-grid">
                  <form
                    className="panel settings-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await action(
                        () => mutate("/settings", settings, "PUT"),
                        t("dash.settingsUpdated"),
                      );
                    }}
                  >
                    <h2>{t("dash.businessDetails")}</h2>
                    <p className="muted">{t("dash.businessLead")}</p>
                    <div className="form-grid">
                      {[
                        ["name", t("dash.fldName")],
                        ["address", t("dash.fldAddress")],
                        ["phone", t("dash.fldPhone")],
                        ["email", t("dash.fldEmail")],
                        ["timezone", t("dash.fldTimezone")],
                        ["instagram", t("dash.fldInstagram")],
                      ].map(([key, label]) => (
                        <label key={key}>
                          {label}
                          <input
                            value={settings[key]}
                            disabled={session.user.role !== "owner"}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                [key]: e.target.value,
                              })
                            }
                          />
                        </label>
                      ))}
                      <label>
                        {t("dash.currency")}
                        <select
                          value={settings.currency}
                          disabled={session.user.role !== "owner"}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              currency: e.target.value,
                            })
                          }
                        >
                          {["GEL", "USD", "EUR", "GBP"].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                      {[
                        ["leadMinutes", t("dash.leadMinutes")],
                        ["horizonDays", t("dash.horizonDays")],
                        ["cancelHours", t("dash.cancelHours")],
                      ].map(([key, label]) => (
                        <label key={key}>
                          {label}
                          <input
                            type="number"
                            min={0}
                            required
                            value={settings[key]}
                            disabled={session.user.role !== "owner"}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                [key]: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                      ))}
                    </div>
                    <label>
                      {t("dash.publicNotice")}
                      <textarea
                        rows={3}
                        value={settings.notice}
                        disabled={session.user.role !== "owner"}
                        onChange={(e) =>
                          setSettings({ ...settings, notice: e.target.value })
                        }
                      />
                    </label>
                    <p className="hint">{t("dash.settingsHint")}</p>
                    {session.user.role === "owner" && (
                      <button className="button dark" disabled={busy}>
                        {t("dash.saveSettings")}
                      </button>
                    )}
                  </form>
                  <form
                    className="panel settings-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = e.currentTarget;
                      const fd = new FormData(f);
                      const ok = await action(
                        () =>
                          api("/auth/password", {
                            method: "POST",
                            headers: { "x-csrf-token": session.csrf },
                            body: JSON.stringify(Object.fromEntries(fd)),
                          }),
                        t("dash.passwordChanged"),
                      );
                      if (ok) f.reset();
                    }}
                  >
                    <h2>{t("dash.yourPassword")}</h2>
                    <p className="muted">{t("dash.passwordLead")}</p>
                    <label>
                      {t("dash.currentPassword")}
                      <input
                        name="current"
                        type="password"
                        required
                        autoComplete="current-password"
                      />
                    </label>
                    <label>
                      {t("dash.newPassword")}
                      <input
                        name="password"
                        type="password"
                        required
                        minLength={12}
                        maxLength={128}
                        autoComplete="new-password"
                      />
                    </label>
                    <button className="button outline" disabled={busy}>
                      {t("dash.updatePassword")}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </main>
      </div>
      {modal === "edit" && edit && (
        <Modal
          title={t(edit.id ? "dash.editTitle" : "dash.addTitle", {
            entity: t("dash.entity." + entityKey[tab]),
          })}
          onClose={() => setModal("")}
        >
          <form onSubmit={save} className="modal-form">
            {error && <p className="error">{error}</p>}
            <div className="form-grid">
              {field("name", t("dash.name"))}
              {["customers", "users"].includes(tab) &&
                field("email", t("dash.email"), "email")}
              {tab === "customers" &&
                field("phone", t("dash.phone"), "tel", false)}
              {tab === "users" && (
                <>
                  {field("password", t("dash.tempPassword"), "password")}
                  <label>
                    {t("dash.role")}
                    <select
                      value={edit.role}
                      onChange={(e) =>
                        setEdit({ ...edit, role: e.target.value })
                      }
                    >
                      <option value="manager">{t("role.Manager")}</option>
                      <option value="owner">{t("role.Owner")}</option>
                    </select>
                  </label>
                </>
              )}
              {tab === "services" && (
                <>
                  <label>
                    {t("dash.categoryLabel")}
                    <select
                      value={edit.category}
                      onChange={(e) =>
                        setEdit({ ...edit, category: e.target.value })
                      }
                    >
                      <option value="Barber">{t("category.Barber")}</option>
                      <option value="Beauty">{t("category.Beauty")}</option>
                      <option value="Nail">{t("category.Nail")}</option>
                    </select>
                  </label>
                  <label>
                    {t("dash.durationMin")}
                    <input
                      type="number"
                      min={15}
                      max={240}
                      step={15}
                      value={edit.duration}
                      onChange={(e) =>
                        setEdit({ ...edit, duration: Number(e.target.value) })
                      }
                    />
                  </label>
                </>
              )}
              {["services", "inventory"].includes(tab) && (
                <label>
                  {t("dash.price", { currency })}
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={edit.price / 100}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        price: Math.round(Number(e.target.value) * 100),
                      })
                    }
                  />
                </label>
              )}
              {tab === "inventory" && (
                <>
                  {field("sku", t("dash.sku"))}
                  {field("quantity", t("dash.quantity"), "number")}
                  {field("threshold", t("dash.threshold"), "number")}
                </>
              )}
              {tab === "staff" && (
                <>
                  {field("title", t("dash.jobTitle"))}
                  {field("color", t("dash.calendarColor"), "color")}
                </>
              )}
            </div>
            {["services", "customers", "staff"].includes(tab) && (
              <label>
                {tab === "customers"
                  ? t("dash.internalNotes")
                  : tab === "staff"
                    ? t("dash.biography")
                    : t("dash.description")}
                <textarea
                  rows={3}
                  value={
                    edit[
                      tab === "customers"
                        ? "notes"
                        : tab === "staff"
                          ? "bio"
                          : "description"
                    ]
                  }
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      [tab === "customers"
                        ? "notes"
                        : tab === "staff"
                          ? "bio"
                          : "description"]: e.target.value,
                    })
                  }
                />
              </label>
            )}
            {tab === "customers" && (
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={edit.marketing}
                  onChange={(e) =>
                    setEdit({ ...edit, marketing: e.target.checked })
                  }
                />
                {t("dash.marketingConsent")}
              </label>
            )}
            {["services", "staff"].includes(tab) && (
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={edit.active}
                  onChange={(e) =>
                    setEdit({ ...edit, active: e.target.checked })
                  }
                />
                {t("dash.activeAvailable")}
              </label>
            )}
            {tab === "staff" && (
              <>
                <h3>{t("dash.servicesOffered")}</h3>
                <div className="service-checkboxes">
                  {catalog?.services.map((s) => (
                    <label className="check-label" key={s.id}>
                      <input
                        type="checkbox"
                        checked={edit.serviceIds.includes(s.id)}
                        onChange={(e) =>
                          setEdit({
                            ...edit,
                            serviceIds: e.target.checked
                              ? [...edit.serviceIds, s.id]
                              : edit.serviceIds.filter(
                                  (v: string) => v !== s.id,
                                ),
                          })
                        }
                      />
                      {tx(s.name)}
                    </label>
                  ))}
                </div>
                <h3>{t("dash.weeklySchedule")}</h3>
                <p className="hint">{t("dash.scheduleHint", { zone })}</p>
                {dayKeys.map((d, i) => (
                  <div className="schedule-edit" key={d}>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={!!edit.schedule[i + 1]}
                        onChange={(e) => {
                          const schedule = { ...edit.schedule };
                          if (e.target.checked)
                            schedule[i + 1] = {
                              start: "10:00",
                              end: "19:00",
                            };
                          else delete schedule[i + 1];
                          setEdit({ ...edit, schedule });
                        }}
                      />
                      {t("days." + d)}
                    </label>
                    {edit.schedule[i + 1] ? (
                      <>
                        <input
                          type="time"
                          step={900}
                          required
                          aria-label={t("dash.dayStart", {
                            d: t("days." + d),
                          })}
                          value={edit.schedule[i + 1].start}
                          onChange={(e) =>
                            setEdit({
                              ...edit,
                              schedule: {
                                ...edit.schedule,
                                [i + 1]: {
                                  ...edit.schedule[i + 1],
                                  start: e.target.value,
                                },
                              },
                            })
                          }
                        />
                        <span>{t("common.to")}</span>
                        <input
                          type="time"
                          step={900}
                          required
                          aria-label={t("dash.dayEnd", {
                            d: t("days." + d),
                          })}
                          value={edit.schedule[i + 1].end}
                          onChange={(e) =>
                            setEdit({
                              ...edit,
                              schedule: {
                                ...edit.schedule,
                                [i + 1]: {
                                  ...edit.schedule[i + 1],
                                  end: e.target.value,
                                },
                              },
                            })
                          }
                        />
                      </>
                    ) : (
                      <span className="muted">{t("common.dayOff")}</span>
                    )}
                  </div>
                ))}
              </>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="button outline"
                onClick={() => setModal("")}
              >
                {t("common.cancel")}
              </button>
              <button className="button dark" disabled={busy}>
                {busy ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === "booking" && selected && (
        <Modal title={t("dash.apptDetails")} onClose={() => setModal("")}>
          <div className="modal-form">
            {error && <p className="error">{error}</p>}
            <span className={"badge " + selected.status}>
              {t("status." + selected.status)}
            </span>
            <h2>{selected.customerName}</h2>
            <p>
              {tx(selected.serviceName)} · {tx(selected.staffName)}
            </p>
            <p>
              <strong>{dateTime(selected.start, zone, locale)}</strong> ·{" "}
              {zone}
            </p>
            <p>
              {selected.email}
              <br />
              {selected.phone}
            </p>
            <p>{selected.notes || t("dash.noNotes")}</p>
            <div className="summary-total">
              <span>{t("common.total")}</span>
              <strong>{money(selected.price, currency, locale)}</strong>
            </div>
            <p>
              {t("dash.payment", {
                status: t("status." + selected.paymentStatus),
              })}
              {selected.paymentMethod
                ? " · " + t("paymentMethod." + selected.paymentMethod)
                : ""}
            </p>
            {selected.paymentStatus === "unpaid" &&
              ["confirmed", "completed"].includes(selected.status) && (
                <form
                  className="payment-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const ok = await action(
                      () =>
                        mutate("/bookings/" + selected.id + "/payment", {
                          method: f.get("method"),
                          tip: Math.round(Number(f.get("tip")) * 100),
                        }),
                      t("dash.paymentRecorded"),
                    );
                    if (ok) setModal("");
                  }}
                >
                  <h3>{t("dash.recordPayment")}</h3>
                  <p className="hint">{t("dash.paymentHint")}</p>
                  <div className="form-grid">
                    <label>
                      {t("dash.method")}
                      <select name="method">
                        <option value="cash">{t("paymentMethod.cash")}</option>
                        <option value="card">{t("paymentMethod.card")}</option>
                        <option value="bank">{t("paymentMethod.bank")}</option>
                      </select>
                    </label>
                    <label>
                      {t("dash.tip", { currency })}
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        name="tip"
                        defaultValue={0}
                      />
                    </label>
                  </div>
                  <button className="button dark" disabled={busy}>
                    {t("dash.recordPayment")}
                  </button>
                </form>
              )}
            {selected.paymentStatus === "paid" &&
              session.user.role === "owner" && (
                <button
                  className="button outline small"
                  disabled={busy}
                  onClick={async () => {
                    if (!confirm(t("dash.refundConfirm"))) return;
                    const ok = await action(
                      () => mutate("/bookings/" + selected.id + "/refund"),
                      t("dash.refundRecorded"),
                    );
                    if (ok) setModal("");
                  }}
                >
                  {t("dash.recordRefund")}
                </button>
              )}
            {selected.status === "confirmed" && (
              <button
                className="button outline"
                onClick={() => setModal("reschedule")}
              >
                {t("dash.rescheduleAppt")}
              </button>
            )}
            {selected.status === "confirmed" && (
              <div className="booking-actions">
                {(
                  [
                    ["completed", "dash.completeVisit"],
                    ["no_show", "dash.markNoShow"],
                    ["cancelled", "dash.cancelBooking"],
                  ] as const
                ).map(([s, labelKey]) => (
                  <button
                    key={s}
                    className="button outline small"
                    disabled={busy}
                    onClick={async () => {
                      const label = t(labelKey);
                      if (!confirm(t("dash.confirmAction", { label }))) return;
                      const ok = await action(
                        () =>
                          mutate(
                            "/bookings/" + selected.id + "/status",
                            { status: s },
                            "PATCH",
                          ),
                        t("dash.apptUpdated"),
                      );
                      if (ok) setModal("");
                    }}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
      {modal === "reschedule" && selected && catalog && (
        <Modal title={t("dash.rescheduleTitle")} onClose={() => setModal("")}>
          <Reschedule
            booking={selected}
            catalog={catalog}
            error={error}
            busy={busy}
            save={async (start) => {
              const ok = await action(
                () =>
                  mutate("/bookings/" + selected.id + "/reschedule", { start }),
                t("dash.apptRescheduled"),
              );
              if (ok) setModal("");
            }}
          />
        </Modal>
      )}
      {modal === "history" && selected && (
        <Modal
          title={t("dash.visitHistory", { name: selected.name })}
          onClose={() => setModal("")}
        >
          <div className="modal-form">
            {history.length ? (
              history.map((h, i) => (
                <div className="history-item" key={i}>
                  <strong>{tx(h.serviceName)}</strong>
                  <p>
                    {dateTime(h.start, zone, locale)} ·{" "}
                    {t("status." + h.status)} ·{" "}
                    {money(h.price, currency, locale)}
                  </p>
                </div>
              ))
            ) : (
              <p>{t("dash.noApptsYet")}</p>
            )}
          </div>
        </Modal>
      )}
      {modal === "timeoff" && selected && (
        <Modal
          title={t("dash.timeOffModal", { name: tx(selected.name) })}
          onClose={() => setModal("")}
        >
          <TimeOff
            staffId={selected.id}
            zone={zone}
            error={error}
            save={async (body) => {
              const ok = await action(
                () => mutate("/timeoff", body),
                t("dash.timeOffAdded"),
              );
              if (ok) setModal("");
            }}
          />
        </Modal>
      )}
      {modal === "newBooking" && catalog && (
        <Modal title={t("dash.newApptTitle")} onClose={() => setModal("")}>
          <NewBooking
            catalog={catalog}
            save={async (body) => {
              const ok = await action(
                () => mutate("/bookings", body),
                t("dash.apptConfirmed"),
              );
              if (ok) setModal("");
            }}
            error={error}
            busy={busy}
          />
        </Modal>
      )}
    </div>
  );
}
function NewBooking({
  catalog,
  save,
  error,
  busy,
}: {
  catalog: Catalog;
  save: (b: Row) => Promise<void>;
  error: string;
  busy: boolean;
}) {
  const { t, tx, te, locale } = useI18n();
  const [service, setService] = useState("");
  const [staff, setStaff] = useState("");
  const [date, setDate] = useState(localDate(catalog.settings.timezone));
  const [slots, setSlots] = useState<Row[]>([]);
  const [start, setStart] = useState("");
  const [issue, setIssue] = useState("");
  useEffect(() => {
    setStart("");
    setSlots([]);
    if (!service || !staff) return;
    let live = true;
    api(
      `/public/availability?serviceId=${service}&staffId=${staff}&date=${date}`,
    )
      .then((r) => {
        if (live) setSlots(r);
      })
      .catch((e) => setIssue(te(e.message)));
    return () => {
      live = false;
    };
  }, [service, staff, date]);
  return (
    <form
      className="modal-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        save({
          serviceId: service,
          staffId: staff,
          start,
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          notes: f.get("notes"),
          consent: true,
          marketing: false,
        });
      }}
    >
      {(error || issue) && <p className="error">{error || issue}</p>}
      <div className="form-grid">
        <label>
          {t("dash.service")}
          <select
            required
            value={service}
            onChange={(e) => {
              setService(e.target.value);
              setStaff("");
            }}
          >
            <option value="">{t("dash.chooseService")}</option>
            {catalog.services.map((s) => (
              <option key={s.id} value={s.id}>
                {tx(s.name)} ·{" "}
                {money(s.price, catalog.settings.currency, locale)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("dash.specialist")}
          <select
            required
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
          >
            <option value="">{t("dash.chooseSpecialist")}</option>
            {catalog.staff
              .filter((s) => s.serviceIds.includes(service))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {tx(s.name)}
                </option>
              ))}
          </select>
        </label>
        <label>
          {t("dash.date")}
          <input
            type="date"
            required
            value={date}
            min={localDate(catalog.settings.timezone)}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          {t("dash.timeZone", { zone: catalog.settings.timezone })}
          <select
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
          >
            <option value="">
              {slots.length
                ? t("dash.chooseTime")
                : t("dash.noAvailableTimes")}
            </option>
            {slots.map((s) => (
              <option key={s.start} value={s.start}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("dash.customerName")}
          <input name="name" required />
        </label>
        <label>
          {t("dash.phone")}
          <input name="phone" type="tel" required minLength={6} />
        </label>
      </div>
      <label>
        {t("dash.email")}
        <input name="email" type="email" required />
      </label>
      <label>
        {t("dash.notes")}
        <textarea name="notes" rows={2} />
      </label>
      <label className="check-label">
        <input type="checkbox" required />
        {t("dash.customerConsent")}
      </label>
      <button className="button dark" disabled={busy || !start}>
        {t("dash.confirmAppt")}
      </button>
    </form>
  );
}
function TimeOff({
  staffId,
  zone,
  error,
  save,
}: {
  staffId: string;
  zone: string;
  error: string;
  save: (b: Row) => Promise<void>;
}) {
  const { t } = useI18n();
  return (
    <form
      className="modal-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        save({
          staffId,
          start: new Date(String(f.get("start"))).toISOString(),
          end: new Date(String(f.get("end"))).toISOString(),
          reason: f.get("reason"),
        });
      }}
    >
      <p className="notice">
        {t("dash.timeOffDevice", {
          device: Intl.DateTimeFormat().resolvedOptions().timeZone,
          zone,
        })}
      </p>
      {error && <p className="error">{error}</p>}
      <label>
        {t("dash.start")}
        <input name="start" type="datetime-local" required />
      </label>
      <label>
        {t("dash.end")}
        <input name="end" type="datetime-local" required />
      </label>
      <label>
        {t("dash.reason")}
        <input name="reason" required placeholder={t("dash.reasonPh")} />
      </label>
      <button className="button dark">{t("dash.blockTime")}</button>
    </form>
  );
}

function Reschedule({
  booking,
  catalog,
  error,
  busy,
  save,
}: {
  booking: Row;
  catalog: Catalog;
  error: string;
  busy: boolean;
  save: (start: string) => Promise<void>;
}) {
  const { t, tx, te, locale } = useI18n();
  const [date, setDate] = useState(localDate(catalog.settings.timezone));
  const [slots, setSlots] = useState<Row[]>([]);
  const [start, setStart] = useState("");
  const [issue, setIssue] = useState("");
  useEffect(() => {
    let live = true;
    setStart("");
    api(
      `/public/availability?serviceId=${booking.serviceId}&staffId=${booking.staffId}&date=${date}`,
    )
      .then((r) => {
        if (live) setSlots(r);
      })
      .catch((e) => setIssue(te(e.message)));
    return () => {
      live = false;
    };
  }, [booking, date]);
  return (
    <form
      className="modal-form"
      onSubmit={(e) => {
        e.preventDefault();
        save(start);
      }}
    >
      <p>
        {t("dash.withStaff", {
          service: tx(booking.serviceName),
          staff: tx(booking.staffName),
        })}
      </p>
      <p className="hint">
        {t("dash.originalKeep", {
          when: dateTime(booking.start, catalog.settings.timezone, locale),
        })}
      </p>
      {(error || issue) && <p className="error">{error || issue}</p>}
      <label>
        {t("dash.newDate")}
        <input
          type="date"
          min={localDate(catalog.settings.timezone)}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </label>
      <label>
        {t("dash.newTime", { zone: catalog.settings.timezone })}
        <select
          value={start}
          onChange={(e) => setStart(e.target.value)}
          required
        >
          <option value="">
            {slots.length
              ? t("dash.chooseATime")
              : t("dash.noAvailableTimes")}
          </option>
          {slots.map((s) => (
            <option key={s.start} value={s.start}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <button className="button dark" disabled={busy || !start}>
        {t("dash.confirmNewTime")}
      </button>
    </form>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Facebook,
  Instagram,
  MapPin,
  Menu,
  X,
} from "lucide-react";
import { api, Catalog } from "./lib";
import { LanguageSwitcher, useI18n } from "./i18n";
import BrandMark from "./BrandMark";
import { SHOWCASE_SERVICES, SHOWCASE_TEAM } from "./services";

const features = [
  {
    icon: "/icon-scissors.png",
    titleKey: "landing.featBarbers",
    descKey: "landing.featBarbersDesc",
  },
  {
    icon: "/icon-calendar.png",
    titleKey: "landing.featBooking",
    descKey: "landing.featBookingDesc",
  },
  {
    icon: "/icon-diamond.png",
    titleKey: "landing.featCare",
    descKey: "landing.featCareDesc",
  },
] as const;

export default function Home() {
  const { t, tx, te } = useI18n();
  const [data, setData] = useState<Catalog>();
  const [menu, setMenu] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    api("/public/catalog")
      .then((c: Catalog) => {
        setData(c);
        if (c.services[0]) setServiceId(c.services[0].id);
      })
      .catch((e) => console.warn(te(e.message)));
  }, [te]);

  const bookHref = useMemo(() => {
    const q = new URLSearchParams();
    if (serviceId) q.set("service", serviceId);
    if (date) q.set("date", date);
    if (time) q.set("time", time);
    const s = q.toString();
    return s ? "/book?" + s : "/book";
  }, [serviceId, date, time]);

  const address = tx(data?.settings.address || "15 Rustaveli Ave, Tbilisi");

  const catalogByName = useMemo(() => {
    const map = new Map<string, string>();
    data?.services.forEach((s) => map.set(s.name, s.id));
    return map;
  }, [data]);

  return (
    <main className="onyx">
      <header className="onyx-header">
        <BrandMark size="lg" variant="horizontal" className="onyx-logo" />
        <nav className={menu ? "open" : ""}>
          <a href="#home" className="active" onClick={() => setMenu(false)}>
            {t("landing.navHome")}
          </a>
          <a href="#services" onClick={() => setMenu(false)}>
            {t("landing.navServices")}
          </a>
          <a href="#barbers" onClick={() => setMenu(false)}>
            {t("landing.navBarbers")}
          </a>
          <a href="#contact" onClick={() => setMenu(false)}>
            {t("landing.navContact")}
          </a>
        </nav>
        <div className="onyx-header-actions">
          <LanguageSwitcher className="on-dark" />
          <Link className="onyx-btn" href="/book">
            <CalendarDays size={16} strokeWidth={2} />
            {t("landing.bookNow")}
          </Link>
          <button
            className="onyx-menu-btn"
            aria-label={t("landing.toggleNav")}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <section className="onyx-hero" id="home">
        <div className="onyx-hero-media" aria-hidden="true">
          <img src="/hero-barber.png" alt="" />
        </div>
        <div className="onyx-hero-copy">
          <p className="onyx-kicker">
            {t("landing.kicker")}
            <span />
          </p>
          <h1>
            {t("landing.heroLine1")}
            <br />
            {t("landing.heroLine2")}
          </h1>
          <p className="onyx-hero-lead">{t("landing.heroLead")}</p>
          <div className="onyx-hero-actions">
            <Link className="onyx-btn" href="/book">
              <CalendarDays size={16} strokeWidth={2} />
              {t("landing.bookNow")}
            </Link>
            <a className="onyx-btn-ghost" href="#services">
              {t("landing.ourServices")} <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      <section className="onyx-features" aria-label={t("landing.featuresLabel")}>
        {features.map((f, i) => (
          <div className="onyx-feature" key={f.titleKey}>
            {i > 0 && <span className="onyx-feature-rule" aria-hidden="true" />}
            <img src={f.icon} alt="" />
            <div>
              <h3>{t(f.titleKey)}</h3>
              <p>{t(f.descKey)}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="onyx-section" id="services">
        <div className="onyx-section-head">
          <p className="onyx-kicker">
            {t("landing.servicesKicker")}
            <span />
          </p>
          <h2>{t("landing.servicesTitle")}</h2>
          <p className="onyx-section-lead">{t("landing.servicesLead")}</p>
        </div>
        <div className="onyx-service-grid">
          {SHOWCASE_SERVICES.map((s) => {
            const sid = catalogByName.get(s.name);
            const href = sid ? "/book?service=" + sid : "/book";
            return (
              <Link href={href} className="onyx-service-card" key={s.key}>
                <img src={s.icon} alt="" />
                <h3>{t(s.titleKey)}</h3>
                <p>{t(s.descKey)}</p>
                <span className="onyx-card-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="onyx-section" id="barbers">
        <div className="onyx-section-head">
          <p className="onyx-kicker">
            {t("landing.barbersKicker")}
            <span />
          </p>
          <h2>{t("landing.barbersTitle")}</h2>
          <p className="onyx-section-lead">{t("landing.barbersLead")}</p>
        </div>
        <div className="onyx-barber-grid">
          {SHOWCASE_TEAM.map((b) => (
            <article className="onyx-barber-card" key={b.nameKey}>
              <img src={b.photo} alt={t(b.nameKey)} />
              <div className="onyx-barber-meta">
                <h3>{t(b.nameKey)}</h3>
                <p>{t(b.roleKey)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="onyx-section" id="about">
        <div className="onyx-book-panel">
          <div className="onyx-book-copy">
            <p className="onyx-kicker">
              {t("landing.bookKicker")}
              <span />
            </p>
            <h2>{t("landing.bookTitle")}</h2>
            <p>{t("landing.bookLead")}</p>
          </div>
          <form
            className="onyx-book-form"
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = bookHref;
            }}
          >
            <div className="onyx-book-fields">
              <label>
                <span>{t("landing.fieldService")}</span>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                >
                  {(data?.services || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {tx(s.name)}
                    </option>
                  ))}
                  {!data?.services?.length && (
                    <option value="">{t("landing.svcHaircut")}</option>
                  )}
                </select>
              </label>
              <label>
                <span>{t("landing.fieldDate")}</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                <span>{t("landing.fieldTime")}</span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </label>
            </div>
            <button className="onyx-btn onyx-btn-block" type="submit">
              {t("landing.bookNow")}
            </button>
          </form>
        </div>
      </section>

      <footer className="onyx-footer" id="contact">
        <div className="onyx-footer-top">
          <BrandMark
            size="lg"
            variant="horizontal"
            className="onyx-footer-logo"
          />
          <div className="onyx-footer-info">
            <div>
              <MapPin size={18} className="onyx-ico" />
              <div>
                <strong>{t("landing.location")}</strong>
                <p>{address}</p>
              </div>
            </div>
            <div>
              <CalendarDays size={18} className="onyx-ico" />
              <div>
                <strong>{t("landing.hours")}</strong>
                <p>{t("landing.hoursValue")}</p>
              </div>
            </div>
          </div>
          <div className="onyx-social">
            <a href="#" aria-label="Instagram">
              <Instagram size={18} />
            </a>
            <a href="#" aria-label="Facebook">
              <Facebook size={18} />
            </a>
            <a href="#" aria-label="TikTok">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
              >
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .56.04.82.12V9.01a6.27 6.27 0 0 0-.82-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.7a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
              </svg>
            </a>
          </div>
        </div>
        <div className="onyx-footer-bottom">
          <span>
            {t("landing.copyright", { year: new Date().getFullYear() })}
          </span>
          <div>
            <Link href="/privacy">{t("landing.privacy")}</Link>
            <span>|</span>
            <Link href="/privacy">{t("landing.terms")}</Link>
            <span>|</span>
            <a href="#contact">{t("landing.navContact")}</a>
            <span>|</span>
            <Link href="/login">{t("landing.staffSignIn")}</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

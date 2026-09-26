"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Scissors,
  CalendarDays,
  User,
  Download,
  Copy,
} from "lucide-react";
import { api, Catalog, dateTime, localDate } from "../lib";
import { LanguageSwitcher, useI18n } from "../i18n";
import BrandMark from "../BrandMark";
import { serviceIcon, staffPhoto } from "../services";

export default function Booking() {
  const { t, tx, te, locale } = useI18n();
  const [data, setData] = useState<Catalog>();
  const [step, setStep] = useState(0);
  const [serviceId, setService] = useState("");
  const [staffId, setStaff] = useState("");
  const [date, setDate] = useState(localDate());
  const [slots, setSlots] = useState<
    { start: string; end: string; label: string }[]
  >([]);
  const [start, setStart] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>();
  const [managed, setManaged] = useState<any>();
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const tkn = q.get("token");
    if (tkn) {
      setToken(tkn);
      api("/public/booking/" + tkn)
        .then(setManaged)
        .catch((e) => setError(te(e.message)));
    }
    api("/public/catalog")
      .then((d) => {
        setData(d);
        setDate(localDate(d.settings.timezone));
        if (q.get("service")) setService(q.get("service")!);
        if (q.get("staff")) setStaff(q.get("staff")!);
      })
      .catch((e) => setError(te(e.message)));
  }, [te]);
  useEffect(() => {
    if (!serviceId || !staffId) return;
    let live = true;
    setLoading(true);
    setStart("");
    setError("");
    api(
      `/public/availability?serviceId=${serviceId}&staffId=${staffId}&date=${date}`,
    )
      .then((s) => {
        if (live) setSlots(s);
      })
      .catch((e) => {
        if (live) setError(te(e.message));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [serviceId, staffId, date, te]);
  const service = data?.services.find((s) => s.id === serviceId);
  const staff = data?.staff.find((s) => s.id === staffId);
  const progress = [
    t("book.stepService"),
    t("book.stepSpecialist"),
    t("book.stepTime"),
    t("book.stepDetails"),
  ];
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const r = await api("/public/bookings", {
        method: "POST",
        body: JSON.stringify({
          serviceId,
          staffId,
          start,
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          notes: f.get("notes"),
          consent: f.get("consent") === "on",
          marketing: f.get("marketing") === "on",
        }),
      });
      setResult(r);
    } catch (e) {
      setError(te((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  function calendar() {
    const b = result || managed;
    const stamp = (v: string) =>
      new Date(v)
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    const blob = new Blob(
      [
        `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Onyx//Booking//EN\r\nBEGIN:VEVENT\r\nUID:${b.reference}@onyx\r\nDTSTAMP:${stamp(new Date().toISOString())}\r\nDTSTART:${stamp(b.start)}\r\nDTEND:${stamp(b.end)}\r\nSUMMARY:${t("book.calendarSummary")}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`,
      ],
      { type: "text/calendar" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "onyx-appointment.ics";
    a.click();
    URL.revokeObjectURL(url);
  }
  function statusLabel(status: string) {
    const key = status.replace(" ", "_") as
      | "confirmed"
      | "completed"
      | "cancelled"
      | "no_show";
    return t(`status.${key}`) || status.replace("_", " ");
  }
  return (
    <main className="booking-page onyx-book">
      <header className="booking-header">
        <BrandMark size="lg" variant="horizontal" className="booking-logo" />
        <div className="booking-header-actions">
          <LanguageSwitcher className="on-dark" />
          <Link href="/" className="onyx-btn-ghost booking-back">
            <ArrowLeft size={16} /> {t("book.backStudio")}
          </Link>
        </div>
      </header>
      {token ? (
        <div className="confirmation">
          <p className="eyebrow">{t("book.manageEyebrow")}</p>
          <h1>{t("book.manageTitle")}</h1>
          {managed ? (
            <>
              <p className={"badge " + managed.status}>
                {statusLabel(managed.status)}
              </p>
              <h2>{tx(managed.serviceName)}</h2>
              <p>
                {dateTime(managed.start, data?.settings.timezone, locale)} ·{" "}
                {tx(managed.staffName)}
              </p>
              <p>{t("book.reference", { ref: managed.reference })}</p>
              <button className="button dark" onClick={calendar}>
                <Download size={18} /> {t("book.addCalendar")}
              </button>
              {managed.status === "confirmed" && (
                <button
                  className="button outline"
                  onClick={async () => {
                    if (!confirm(t("book.cancelConfirm"))) return;
                    try {
                      await api("/public/booking/" + token + "/cancel", {
                        method: "POST",
                        body: "{}",
                      });
                      setManaged({ ...managed, status: "cancelled" });
                    } catch (e) {
                      setError(te((e as Error).message));
                    }
                  }}
                >
                  {t("book.cancelAppt")}
                </button>
              )}
              <p className="hint">{t("book.rescheduleHint")}</p>
            </>
          ) : (
            <p>{t("book.loadingAppt")}</p>
          )}
          {error && <p className="error">{error}</p>}
        </div>
      ) : result ? (
        <div className="confirmation">
          <div className="success-icon">
            <Check />
          </div>
          <p className="eyebrow">{t("book.bookedEyebrow")}</p>
          <h1>{t("book.bookedTitle")}</h1>
          <p>
            {t("book.withStaff", {
              service: tx(service?.name || ""),
              staff: tx(staff?.name || ""),
            })}
          </p>
          <h2>{dateTime(result.start, data?.settings.timezone, locale)}</h2>
          <p>
            {dateTime(result.start, data?.settings.timezone, locale)} ·{" "}
            {t("book.paySalon")}
          </p>
          <p className="reference">{result.reference}</p>
          <div className="button-row">
            <button className="button dark" onClick={calendar}>
              <Download size={18} /> {t("book.addCalendar")}
            </button>
            <button
              className="button outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    location.origin + "/book?token=" + result.token,
                  );
                  setMessage(t("book.linkCopied"));
                } catch {
                  setMessage(t("book.linkFallback"));
                }
              }}
            >
              <Copy size={18} /> {t("book.copyLink")}
            </button>
          </div>
          <p role="status">{message}</p>
          <Link
            className="text-link"
            href={"/book?token=" + result.token}
            onClick={() => location.assign("/book?token=" + result.token)}
          >
            {t("book.manageLink")} <ArrowRight size={16} />
          </Link>
          <p className="hint">
            {t("book.saveHint", { hours: data?.settings.cancelHours ?? "" })}
          </p>
        </div>
      ) : (
        <div className="booking-layout">
          <section className="booking-main">
            <p className="eyebrow">{t("book.eyebrow")}</p>
            <h1>
              {t("book.title1")} <em>{t("book.titleEm")}</em>
            </h1>
            <ol className="booking-progress">
              {progress.map((p, i) => (
                <li
                  key={p}
                  className={i === step ? "current" : i < step ? "done" : ""}
                >
                  <span>{i < step ? <Check size={15} /> : i + 1}</span>
                  <small>{p}</small>
                </li>
              ))}
            </ol>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {!data ? (
              <p>{t("book.loadingOptions")}</p>
            ) : (
              <>
                <h2>
                  {
                    [
                      t("book.stepTitle0"),
                      t("book.stepTitle1"),
                      t("book.stepTitle2"),
                      t("book.stepTitle3"),
                    ][step]
                  }
                </h2>
                {step === 0 && (
                  <div className="onyx-service-grid booking-service-grid">
                    {data.services.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={
                          "onyx-service-card" +
                          (serviceId === s.id ? " selected" : "")
                        }
                        onClick={() => {
                          setService(s.id);
                          if (
                            !data.staff
                              .find((x) => x.id === staffId)
                              ?.serviceIds.includes(s.id)
                          )
                            setStaff("");
                        }}
                      >
                        <img src={serviceIcon(s.name)} alt="" />
                        <h3>{tx(s.name)}</h3>
                        <p>{tx(s.description)}</p>
                        <span className="onyx-card-arrow" aria-hidden="true">
                          →
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {step === 1 && (
                  <div className="booking-options">
                    {data.staff
                      .filter((s) => s.serviceIds.includes(serviceId))
                      .map((s) => {
                        const photo = staffPhoto(s.name);
                        return (
                          <button
                            key={s.id}
                            className={
                              "choice " + (staffId === s.id ? "selected" : "")
                            }
                            onClick={() => setStaff(s.id)}
                          >
                            {photo ? (
                              <img
                                className="avatar avatar-photo"
                                src={photo}
                                alt=""
                              />
                            ) : (
                              <span
                                className="avatar"
                                style={{ background: s.color }}
                              >
                                {s.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </span>
                            )}
                            <div>
                              <strong>{tx(s.name)}</strong>
                              <p>{tx(s.title)}</p>
                              <span>{tx(s.bio)}</span>
                            </div>
                            <span className="radio-dot" />
                          </button>
                        );
                      })}
                    {!data.staff.some((s) =>
                      s.serviceIds.includes(serviceId),
                    ) && <p>{t("book.noSpecialists")}</p>}
                  </div>
                )}
                {step === 2 && (
                  <div>
                    <label className="date-picker">
                      {t("book.chooseDate")}
                      <input
                        type="date"
                        value={date}
                        min={localDate(data.settings.timezone)}
                        onChange={(e) => setDate(e.target.value)}
                        required
                      />
                    </label>
                    <p className="muted">
                      {t("book.timesIn", {
                        zone: data.settings.timezone,
                        duration: service?.duration ?? "",
                      })}
                    </p>
                    {loading ? (
                      <p>{t("book.checking")}</p>
                    ) : (
                      <div className="time-grid">
                        {slots.map((s) => (
                          <button
                            key={s.start}
                            className={start === s.start ? "selected" : ""}
                            onClick={() => setStart(s.start)}
                          >
                            {s.label}
                          </button>
                        ))}
                        {!slots.length && (
                          <p className="empty">{t("book.noTimes")}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {step === 3 && (
                  <form
                    id="booking-form"
                    onSubmit={submit}
                    className="details-form"
                  >
                    <div className="form-grid">
                      <label>
                        {t("book.fullName")}
                        <input
                          name="name"
                          autoComplete="name"
                          required
                          maxLength={150}
                        />
                      </label>
                      <label>
                        {t("book.phone")}
                        <input
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          required
                          minLength={6}
                          maxLength={30}
                        />
                      </label>
                    </div>
                    <label>
                      {t("book.email")}
                      <input
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                      />
                    </label>
                    <label>
                      {t("book.notesLabel")}{" "}
                      <span className="muted">{t("common.optional")}</span>
                      <textarea
                        name="notes"
                        rows={3}
                        maxLength={1000}
                        placeholder={t("book.notesPh")}
                      />
                    </label>
                    <label className="check-label">
                      <input name="consent" type="checkbox" required />
                      <span>
                        {t("book.consentBefore")}{" "}
                        <Link href="/privacy" target="_blank">
                          {t("book.consentLink")}
                        </Link>
                        {t("book.consentAfter", {
                          hours: data.settings.cancelHours,
                        })}
                      </span>
                    </label>
                    <label className="check-label">
                      <input name="marketing" type="checkbox" />
                      <span>{t("book.marketing")}</span>
                    </label>
                  </form>
                )}
                <div className="booking-navigation">
                  {step > 0 ? (
                    <button
                      className="button outline"
                      onClick={() => setStep(step - 1)}
                    >
                      <ArrowLeft size={16} /> {t("book.back")}
                    </button>
                  ) : (
                    <span />
                  )}
                  {step < 3 ? (
                    <button
                      className="button dark"
                      disabled={
                        step === 0 ? !service : step === 1 ? !staff : !start
                      }
                      onClick={() => setStep(step + 1)}
                    >
                      {t("book.continue")} <ArrowRight size={18} />
                    </button>
                  ) : (
                    <button
                      form="booking-form"
                      className="button dark"
                      disabled={busy}
                    >
                      {busy ? t("book.reserving") : t("book.confirm")}
                      <Check size={18} />
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
          <aside className="booking-summary">
            <div className="summary-image">
              <img src="/hero-barber.png" alt={t("book.imgAlt")} />
            </div>
            <div className="summary-body">
              <p className="eyebrow">{t("book.summaryEyebrow")}</p>
              <h3>{tx(data?.settings.name || "Onyx Barbers")}</h3>
              <p className="muted">
                {data?.settings.address
                  ? tx(data.settings.address)
                  : data?.settings.address}
              </p>
              <hr />
              <div className="summary-item">
                <Scissors size={18} />
                <span>
                  {service ? tx(service.name) : t("book.chooseService")}
                </span>
              </div>
              <div className="summary-item">
                <User size={18} />
                <span>
                  {staff ? tx(staff.name) : t("book.chooseSpecialist")}
                </span>
              </div>
              <div className="summary-item">
                <CalendarDays size={18} />
                <span>
                  {start
                    ? dateTime(start, data?.settings.timezone, locale)
                    : t("book.pickTime")}
                </span>
              </div>
              <div className="summary-item">
                <Clock size={18} />
                <span>
                  {service
                    ? t("common.minutesLong", { n: service.duration })
                    : t("book.timeSpent")}
                </span>
              </div>
              <p className="hint">{t("book.noOnlinePay")}</p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

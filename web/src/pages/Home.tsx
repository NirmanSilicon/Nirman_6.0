import { useTranslation } from "react-i18next";
import Icon from "../components/Icon";
import { Link } from "react-router-dom";
import Nearby from "../components/Nearby";
import Ring from "../components/Ring";
import { inr } from "../components/ui";
import { useImpact } from "../lib/impact";
import * as store from "../lib/store";

export default function Home() {
  const { t } = useTranslation();
  const imp = useImpact();
  const recent = store.history().slice(0, 3);
  const s = imp?.stats;
  const steps = [
    { k: "scan", done: (s?.scans ?? 0) > 0, n: s?.scans ?? 0 },
    { k: "route", done: (s?.reusable_flagged ?? 0) > 0 || (s?.scans ?? 0) > 0, n: s?.reusable_flagged ?? 0 },
    { k: "drop", done: (s?.dropoffs ?? 0) > 0, n: s?.dropoffs ?? 0 },
  ];
  return (
    <div className="space-y-6 p-4 md:p-8">
      <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-cream md:p-10 dot-grid">
        <svg className="orbit pointer-events-none absolute -right-16 -top-16 h-72 w-72 opacity-70" viewBox="0 0 200 200" aria-hidden>
          <circle cx="100" cy="100" r="95" fill="none" stroke="#f26a1b" strokeWidth=".6" /><circle cx="100" cy="100" r="62" fill="none" stroke="#fbe8da" strokeOpacity=".5" strokeWidth=".6" />
          <circle cx="100" cy="100" r="30" fill="#f5a623" /><circle cx="195" cy="100" r="7" fill="#f26a1b" /><circle cx="38" cy="100" r="5" fill="#fbe8da" />
        </svg>
        <p className="eyebrow !text-orange">{t("home.eyebrow")}</p>
        <h1 className="mt-2 max-w-md text-4xl md:text-6xl">{t("home.title")}</h1>
        <p className="mt-2 max-w-md text-cream/75">{t("home.lead")}</p>
        <Link to="/scan" className="btn btn-accent mt-5 inline-block !px-8 !py-4 text-base"><Icon name="scan" className="mr-2 -mt-0.5" size={20} />{t("home.cta")}</Link>
      </section>

      <section className="grid gap-4 md:grid-cols-[1fr_auto] md:items-stretch">
        <div className="card">
          <p className="eyebrow">{t("home.loop")}</p>
          <ol className="mt-3 flex items-start justify-between">
            {steps.map((st, i) => (
              <li key={st.k} className="flex flex-1 flex-col items-center text-center">
                <span className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-orange font-bold ${st.done ? "bg-orange text-white" : "text-orange"}`}>{st.done ? <Icon name="check" size={22} /> : i + 1}</span>
                <span className="display mt-1 text-sm uppercase">{t(`home.step.${st.k}`)}</span>
                <span className="text-xs text-mute">{st.n} {t(`home.unit.${st.k}`)}</span>
              </li>))}
          </ol>
          {s && s.scans > 0 && <p className="mt-3 text-center text-sm text-mute">{t("home.uncovered")}: <b className="text-ember">{inr(s.value_low, s.value_high)}</b></p>}
        </div>
        {imp && (
          <Link to="/impact" className="card flex items-center gap-4 md:min-w-72">
            <Ring progress={imp.level.progress} label={String(imp.points)} sub="pts" />
            <div><p className="eyebrow">{t("home.level")}</p><p className="display text-2xl">{imp.level.name}</p>
              <p className="text-xs text-mute">{imp.level.next_at ? t("home.toNext", { n: imp.level.next_at - imp.points }) : t("home.maxLevel")}</p>
              {(s?.streak_days ?? 0) > 1 && <p className="mt-1 text-xs font-semibold text-ember"><Icon name="flame" size={13} className="-mt-0.5 mr-1" />{s!.streak_days} {t("home.days")}</p>}</div>
          </Link>)}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <div className="mb-2 flex items-baseline justify-between"><p className="eyebrow">{t("home.recent")}</p><Link to="/history" className="text-xs font-semibold text-ember">{t("home.all")} →</Link></div>
          {!recent.length && <p className="card text-sm text-mute">{t("history.empty")}</p>}
          <div className="space-y-2">{recent.map((r) => (
            <Link key={r.scan_id} to={`/result/${r.scan_id}`} className="card flex items-center justify-between">
              <b className="text-ember">{r.value ? inr(r.value.low, r.value.high) : t("result.notSure")}</b>
              <span className="text-xs text-mute">{r.value ? t(`routes.${r.value.route}`) : ""} · {new Date(r.created_at).toLocaleDateString()}</span>
            </Link>))}</div>
        </section>
        <section>
          <div className="mb-2 flex items-baseline justify-between"><p className="eyebrow">{t("home.nearby")}</p><Link to="/map" className="text-xs font-semibold text-ember">{t("home.map")} →</Link></div>
          <Nearby limit={2} />
        </section>
      </div>
    </div>
  );
}

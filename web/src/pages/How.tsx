import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Pipeline } from "../components/ui";

export default function How() {
  const { t } = useTranslation();
  const diffs = ["value", "reuse", "route", "phone"];
  return (
    <div className="space-y-8">
      <section>
        <p className="eyebrow">{t("how.eyebrow")}</p>
        <h1 className="text-4xl md:text-5xl">{t("how.title")}</h1>
        <p className="mt-2 max-w-xl text-mute">{t("how.lead")}</p>
      </section>

      <section className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
        <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full" style={{ background: "conic-gradient(#f26a1b 0 43%, #2a2623 43% 100%)" }}>
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-paper"><b className="display text-3xl">57%</b><span className="text-[10px] text-mute">{t("how.untreated")}</span></div>
        </div>
        <div><p className="eyebrow">01 · {t("how.problem")}</p><p className="mt-1">{t("how.problemText")}</p></div>
      </section>

      <section><p className="eyebrow mb-3">02 · {t("how.pipeline")}</p><Pipeline /></section>

      <section>
        <p className="eyebrow mb-3">03 · {t("how.different")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {diffs.map((d) => (
            <div key={d} className="rounded-2xl border border-orange/70 bg-ink p-4 text-cream">
              <h2 className="text-lg uppercase text-orange">{t(`how.diff.${d}.t`)}</h2><p className="mt-1 text-sm text-cream/80">{t(`how.diff.${d}.d`)}</p>
            </div>))}
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">04 · {t("how.honest")}</p>
        <p className="mt-1 text-sm text-mute">{t("how.honestText")}</p>
        <Link to="/prices" className="mt-2 inline-block text-sm font-semibold text-ember">{t("more.prices")} →</Link>
      </section>
      <Link to="/" className="btn btn-accent inline-block">{t("how.cta")}</Link>
    </div>
  );
}

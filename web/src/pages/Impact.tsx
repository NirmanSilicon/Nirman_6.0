import { useTranslation } from "react-i18next";
import Ring from "../components/Ring";
import { inr } from "../components/ui";
import { useImpact } from "../lib/impact";
import History from "./History";

export default function Impact() {
  const { t } = useTranslation();
  const i = useImpact();
  if (!i) return <p className="p-6">{t("common.loading")}</p>;
  const s = i.stats;
  const tiles: [string, string][] = [
    [String(s.scans), t("impact.boards")], [s.scans ? inr(s.value_low, s.value_high) : "–", t("impact.value")],
    [String(s.reusable_flagged), t("impact.reusable")], [String(s.dropoffs), t("impact.dropoffs")], [String(s.streak_days), t("impact.streak")],
  ];
  return (
    <div className="space-y-8 p-4 md:p-8">
      <section className="grid items-center gap-6 rounded-3xl bg-ink p-6 text-cream md:grid-cols-[auto_1fr] dot-grid">
        <div className="mx-auto"><Ring size={160} progress={i.level.progress} label={String(i.points)} sub="points" /></div>
        <div>
          <p className="eyebrow !text-orange">{t("home.level")}</p><h1 className="text-4xl">{i.level.name}</h1>
          <p className="mt-1 text-cream/75">{i.level.next_at ? t("home.toNext", { n: i.level.next_at - i.points }) : t("home.maxLevel")}</p>
          <ol className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">{i.levels.map((l, k) => (
            <li key={l.name} className={`rounded-full px-3 py-1 ${k <= i.level.index ? "bg-orange text-white" : "bg-cream/10 text-cream/60"}`}>{l.name} · {l.at}</li>))}</ol>
        </div>
      </section>

      <section><p className="eyebrow mb-2">{t("impact.title")}</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{tiles.map(([v, l]) => <div key={l} className="card"><b className="display text-2xl text-ember">{v}</b><p className="text-xs text-mute">{l}</p></div>)}</div></section>

      <section><p className="eyebrow mb-2">{t("impact.badges")}</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{i.badges.map((b) => (
          <div key={b.id} className={`card text-center ${b.earned ? "border-orange" : "opacity-50"}`}>
            <span className="text-3xl">{b.earned ? "🏅" : "🔒"}</span><p className="display mt-1 text-lg">{b.title}</p><p className="text-xs text-mute">{b.desc}</p></div>))}</div></section>

      <section><p className="eyebrow mb-2">{t("impact.rules")}</p><p className="mb-2 text-sm text-mute">{t("impact.rulesNote")}</p>
        <div className="card divide-y divide-line !p-0">{i.rules.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-3"><b className="display w-14 text-xl text-orange">+{r.points}</b>
            <div><p className="text-sm font-semibold">{r.title}</p><p className="text-xs text-mute">{r.why}</p></div></div>))}</div></section>

      <section><History embedded /></section>
    </div>
  );
}

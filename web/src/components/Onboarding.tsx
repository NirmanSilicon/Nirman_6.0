import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Logo } from "./ui";

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const [i, setI] = useState(0);
  const slides = ["snap", "value", "route"];
  const s = slides[i];
  return (
    <div className="fixed inset-0 z-[3000] flex flex-col bg-ink text-cream dot-grid">
      <div className="flex items-center justify-between p-4">
        <Logo />
        <button className="rounded-full border border-cream/40 px-3 py-1 text-xs font-semibold" onClick={() => i18n.changeLanguage(i18n.language === "hi" ? "en" : "hi")}>{i18n.language === "hi" ? "English" : "हिन्दी"}</button>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
        <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full border-2 border-orange/70">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-amber text-5xl text-ink">{i === 0 ? "📷" : i === 1 ? "₹" : "📍"}</div>
        </div>
        <div className="text-center">
          <p className="eyebrow !text-orange">{i + 1} / 3</p>
          <h1 className="mt-1 text-4xl">{t(`onb.${s}.t`)}</h1>
          <p className="mt-2 text-cream/80">{t(`onb.${s}.d`)}</p>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 p-6">
        <button className="text-sm text-cream/70" onClick={onDone}>{t("onb.skip")}</button>
        <div className="flex gap-1.5">{slides.map((_, k) => <span key={k} className={`h-2 w-2 rounded-full ${k === i ? "bg-orange" : "bg-cream/30"}`} />)}</div>
        <button className="btn btn-accent" onClick={() => (i < 2 ? setI(i + 1) : onDone())}>{i < 2 ? t("onb.next") : t("onb.start")}</button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import * as api from "../lib/api";

export default function More() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [dev, setDev] = useState<string | undefined>();
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem("user") || "null"));
  const [err, setErr] = useState("");
  const send = () => api.otpRequest(phone).then((r) => { setSent(true); setDev(r.dev_code); setErr(""); }).catch((e) => setErr(e.message));
  const verify = () => api.otpVerify(phone, code).then((r) => {
    localStorage.setItem("token", r.token); localStorage.setItem("user", JSON.stringify(r.user)); setUser(r.user); setErr("");
  }).catch((e) => setErr(e.message));
  const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null); setSent(false); };
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">{t("more.title")}</h1>
      <Link to="/prices" className="card block font-semibold">ℹ {t("more.prices")} →</Link>
      <section className="card space-y-2">
        <h2 className="font-bold">{t("more.account")}</h2>
        {user ? (<><p>{t("more.loggedIn")} {user.phone}</p><button className="btn btn-ghost" onClick={logout}>{t("more.logout")}</button></>) : (<>
          <p className="text-sm text-zinc-500">{t("more.anon")}</p>
          <input className="w-full rounded-xl border border-zinc-300 p-3" inputMode="tel" placeholder={t("more.phone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
          {!sent ? <button className="btn btn-primary w-full" onClick={send} disabled={phone.length < 10}>{t("more.sendCode")}</button> : (<>
            <input className="w-full rounded-xl border border-zinc-300 p-3" inputMode="numeric" placeholder={t("more.code")} value={code} onChange={(e) => setCode(e.target.value)} />
            {dev && <p className="text-xs text-amber-700">dev code: {dev}</p>}
            <button className="btn btn-primary w-full" onClick={verify}>{t("more.verify")}</button></>)}
          {err && <p className="text-sm text-red-700">{err}</p>}</>)}
      </section>
      <p className="text-sm text-zinc-500">{t("more.install")}</p>
    </div>
  );
}

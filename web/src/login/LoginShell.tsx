import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { CarDropMenu, type CarItem } from "./CarDropMenu";
import "./login.css";

/* Drop order on page load: black, white, purple. */
const CARS: CarItem[] = [
  { id: "black", name: "Black sports car", body: "sports", color: "#2B2A31" },
  { id: "white", name: "White SUV", body: "suv", color: "#F4F3F8" },
  { id: "purple", name: "Purple 4x4", body: "boxy", color: "#8F73D9" },
];

/* Which car drops when a demo button is clicked (matched by the button text). */
const ROLE_CARS: [string, string][] = [
  ["municipal", "black"],
  ["field", "white"],
  ["business", "purple"],
];

/* Time between the three drops on page load, in milliseconds. */
const DROP_GAP_MS = 2200;

export function LoginShell({ children }: { children: ReactNode }): JSX.Element {
  const [car, setCar] = useState("black");
  const timers = useRef<number[]>([]);

  const stopIntro = (): void => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => {
    timers.current = [
      window.setTimeout(() => setCar("white"), DROP_GAP_MS),
      window.setTimeout(() => setCar("purple"), DROP_GAP_MS * 2),
    ];
    return stopIntro;
  }, []);

  const onFormClick = (event: MouseEvent<HTMLElement>): void => {
    const button = (event.target as HTMLElement).closest("button");
    if (!button || button.type === "submit") return;
    const label = button.textContent?.toLowerCase() ?? "";
    const match = ROLE_CARS.find(([role]) => label.includes(role));
    if (!match) return;
    stopIntro();
    setCar(match[1]);
  };

  return (
    <div className="pl-page">
      <header className="pl-head">
        <h1 className="pl-title">ParkSMART</h1>
        <p className="pl-sub">Smart parking for Bhubaneswar</p>
      </header>
      <section className="pl-form" onClickCapture={onFormClick}>
        {children}
      </section>
      <CarDropMenu items={CARS} value={car} className="pl-stage" />
    </div>
  );
}

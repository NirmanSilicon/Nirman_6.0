import { useCallback, useEffect, useState, type ReactNode } from "react";

/* Edit these if needed. */
const GIF_PATH = "/logo-intro.gif";
const BACKGROUND = "#E8D949";
const PLAY_MS = 4000; // length of the animation
const LOAD_LIMIT_MS = 5000; // skip the intro if the GIF takes longer to load
const FADE_MS = 400;
const SEEN_KEY = "parksmart_intro_seen";

function alreadySeen(): boolean {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function markSeen(): void {
  try {
    window.sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* storage blocked: nothing to save */
  }
}

/** Shows the logo animation once per visit, then the page inside it. */
export function IntroGate({ children }: { children: ReactNode }): JSX.Element {
  const [done, setDone] = useState(
    () => alreadySeen() || window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [loaded, setLoaded] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const skip = useCallback(() => setLeaving(true), []);

  useEffect(() => {
    if (done) return;
    const timer = window.setTimeout(skip, loaded ? PLAY_MS : LOAD_LIMIT_MS);
    window.addEventListener("keydown", skip);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", skip);
    };
  }, [done, loaded, skip]);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => {
      markSeen();
      setDone(true);
    }, FADE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (done) return <>{children}</>;

  return (
    <div
      onClick={skip}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: BACKGROUND,
        opacity: leaving ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        cursor: "pointer",
      }}
    >
      <img
        src={GIF_PATH}
        alt="ParkSMART, parking transformed"
        onLoad={() => setLoaded(true)}
        onError={skip}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </div>
  );
}

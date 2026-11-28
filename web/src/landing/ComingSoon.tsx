import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Zap } from "lucide-react";
import "./coming-soon.css";

export interface ComingSoonFeature {
  title: string;
  description: string;
  status?: string;
}

interface ComingSoonProps {
  features: ComingSoonFeature[];
  eyebrow?: string;
  heading?: string;
  subtext?: string;
}

const GAP = 230;
const ROT = [-3, 2, -2, 3, -2, 2];

function useNarrow(limit = 760): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${limit}px)`);
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [limit]);
  return narrow;
}

export function ComingSoon({
  features,
  eyebrow = "Upcoming Milestones",
  heading = "Coming Soon",
  subtext = "Clearly labelled enhancements rolling out across municipal clusters in future updates.",
}: ComingSoonProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const narrow = useNarrow();

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(t);
  }, []);

  const words = heading.split(" ");
  const last = words.pop();
  const mid = (features.length - 1) / 2;

  return (
    <section className="ps-cs" aria-labelledby="ps-cs-title">
      <p className="ps-cs-eyebrow">
        <Zap size={14} aria-hidden="true" /> {eyebrow}
      </p>
      <h2 id="ps-cs-title">
        {words.join(" ")} <span>{last}</span>
      </h2>
      <p className="ps-cs-sub">{subtext}</p>

      <div className={`ps-cs-stage${narrow ? " ps-cs-narrow" : ""}`}>
        {features.map((f, i) => (
          <motion.article
            key={f.title}
            className="ps-cs-card"
            style={{ zIndex: features.length - i }}
            initial={{ x: 0, y: 0, rotate: 0 }}
            animate={
              narrow
                ? { x: 0, y: 0, rotate: 0 }
                : open
                  ? { x: (i - mid) * GAP, y: (i % 2) * 14, rotate: ROT[i % ROT.length] }
                  : { x: 0, y: 0, rotate: 0 }
            }
            transition={{ type: "spring", stiffness: 70, damping: 12, delay: i * 0.15 }}
            drag={!narrow}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            whileHover={narrow ? undefined : { scale: 1.06, zIndex: 99 }}
            whileTap={narrow ? undefined : { scale: 1.1, zIndex: 99 }}
          >
            {f.status && <span className="ps-cs-status">{f.status}</span>}
            <h3>{f.title}</h3>
            <p>{f.description}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

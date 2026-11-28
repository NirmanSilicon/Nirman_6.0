import "./how-steps.css";

/* Edit the steps here. Four steps fit the row and the dotted line. */
const STEPS = [
  { title: "Find", description: "Search for parking near where you are going.", tone: "gold" },
  { title: "Check", description: "See the current status of nearby parking zones.", tone: "lavender" },
  { title: "Book", description: "Reserve a space before you arrive.", tone: "gold" },
  { title: "Park", description: "Reach your zone and park.", tone: "lavender" },
];

function Pin(): JSX.Element {
  return (
    <svg className="ps-pin" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 3a1 1 0 0 1 .117 1.993l-.117 .007v4.764l1.894 3.789a1 1 0 0 1 .1 .331l.006 .116v2a1 1 0 0 1 -.883 .993l-.117 .007h-4v4a1 1 0 0 1 -1.993 .117l-.007 -.117v-4h-4a1 1 0 0 1 -.993 -.883l-.007 -.117v-2a1 1 0 0 1 .06 -.34l.046 -.107l1.894 -3.791v-4.762a1 1 0 0 1 -.117 -1.993l.117 -.007h8z" />
    </svg>
  );
}

export function HowItWorks(): JSX.Element {
  return (
    <section className="ps-how" aria-labelledby="ps-how-title">
      <h2 id="ps-how-title">How it works</h2>
      <div className="ps-how-scroll" tabIndex={0} role="region" aria-label="Steps, scroll sideways">
        <div className="ps-how-track">
          <svg className="ps-how-line" viewBox="0 0 1000 440" preserveAspectRatio="none" aria-hidden="true">
            <path d="M125 50 C250 50 250 140 375 140 C500 140 500 50 625 50 C750 50 750 140 875 140" />
          </svg>
          <ol>
            {STEPS.map((step) => (
              <li key={step.title}>
                <article className={`ps-note ps-${step.tone}`}>
                  <Pin />
                  <div>
                    <img src={`/landing/how-${step.title.toLowerCase()}.png`} alt="" />
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

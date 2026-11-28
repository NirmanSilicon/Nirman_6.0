import { CoverflowCarousel, type CoverflowSlide } from "./CoverflowCarousel";
import "./who.css";

const role = (id: string, title: string, subtitle: string, uses: string, main: string, also: string): CoverflowSlide => ({
  src: `/landing/who-${id}.png`,
  alt: `Illustration for ${title}`,
  title,
  subtitle,
  meta: [
    { label: "Uses", value: uses },
    { label: "Main job", value: main },
    { label: "Also", value: also },
  ],
});

/* Edit the roles here. */
const ROLES: CoverflowSlide[] = [
  role("admin", "City admins", "Manage the city's parking", "Web dashboard", "Watch parking zones", "Reports and zone settings"),
  role("field", "Field operators", "Keep devices working", "Web dashboard", "Check cameras", "Maintenance tasks"),
  role("shop", "Shopkeepers", "Plan deliveries", "Web dashboard", "Book loading zones", "Delivery time slots"),
  role("driver", "Drivers", "Park with less searching", "Mobile app", "Find parking", "Reserve a space"),
];

/* The roles are listed twice so there are cards on both sides of the centre. */
const SLIDES = [...ROLES, ...ROLES];

export function WhoItsFor(): JSX.Element {
  return (
    <section className="ps-who" aria-labelledby="ps-who-title">
      <h2 id="ps-who-title">Who it is for</h2>
      <CoverflowCarousel slides={SLIDES} showCaption showNavigation label="Who ParkSMART is for" />
    </section>
  );
}

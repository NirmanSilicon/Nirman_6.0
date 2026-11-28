import { useState } from "react";
import { SqueezeCarousel, type SqueezeSlide } from "./SqueezeCarousel";
import "./showcase.css";

const slide = (id: string, title: string, description: string): SqueezeSlide & { point: string } => ({
  id,
  point: title,
  title: `${title}.`,
  description,
  image: `/landing/${id}.png`,
  imageAlt: `Illustration: ${title}`,
  action: "Try a demo",
  href: "/login",
});

/* Edit the words here. */
const SLIDES = [
  slide("map", "Live parking map", "See parking zones on a map, with their current status."),
  slide("forecast", "Busy-time predictions", "Look ahead to when zones are likely to fill up."),
  slide("loading", "Loading zone booking", "Shopkeepers reserve a time slot for deliveries."),
  slide("devices", "Camera and device checks", "Field operators follow device health and maintenance."),
  slide("reports", "Reports", "City admins review how parking zones are used."),
  slide("driver", "Driver app", "Drivers use the mobile app to find parking."),
];

export function FeatureShowcase(): JSX.Element {
  const [active, setActive] = useState(0);
  const [request, setRequest] = useState<{ index: number } | null>(null);

  return (
    <section className="ps-show" aria-labelledby="ps-show-title">
      <h2 id="ps-show-title">What ParkSMART does</h2>
      <div className="ps-show-body">
        <ol className="ps-show-points">
          {SLIDES.map((item, i) => (
            <li key={item.id}>
              <button type="button" aria-current={i === active} onClick={() => setRequest({ index: i })}>
                <span>{i + 1}</span>
                {item.point}
              </button>
            </li>
          ))}
        </ol>
        <SqueezeCarousel
          className="ps-show-carousel"
          slides={SLIDES}
          request={request}
          onIndexChange={setActive}
          label="ParkSMART features"
          accent="#1F1C28"
          accentForeground="#F5C518"
          radius={16}
          autoplay
          interval={5000}
        />
      </div>
    </section>
  );
}

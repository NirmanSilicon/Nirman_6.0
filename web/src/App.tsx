import { lazy, Suspense, useState } from "react";
import { Route, Routes } from "react-router-dom";
import Onboarding from "./components/Onboarding";
import { Layout } from "./components/ui";
import Capture from "./pages/Capture";
import Home from "./pages/Home";

const Result = lazy(() => import("./pages/Result"));
const History = lazy(() => import("./pages/History"));
const MapPage = lazy(() => import("./pages/Map"));
const Impact = lazy(() => import("./pages/Impact"));
const About = lazy(() => import("./pages/About"));
const More = lazy(() => import("./pages/More"));

export default function App() {
  const [onboarded, setOnboarded] = useState(localStorage.getItem("onboarded") === "1");
  return (
    <>
      {!onboarded && <Onboarding onDone={() => { localStorage.setItem("onboarded", "1"); setOnboarded(true); }} />}
      <Suspense fallback={<p className="p-6 text-mute">…</p>}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="scan" element={<Capture />} />
            <Route path="result/:id" element={<Result />} />
            <Route path="history" element={<History />} />
            <Route path="map" element={<MapPage />} />
            <Route path="impact" element={<Impact />} />
            <Route path="about" element={<About />} />
            <Route path="profile" element={<More />} />
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/ui";
import Capture from "./pages/Capture";
import How from "./pages/How";
import History from "./pages/History";
import More from "./pages/More";
import Prices from "./pages/Prices";
import Recyclers from "./pages/Recyclers";
import Result from "./pages/Result";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Capture />} />
        <Route path="result/:id" element={<Result />} />
        <Route path="history" element={<History />} />
        <Route path="recyclers" element={<Recyclers />} />
        <Route path="how" element={<How />} />
        <Route path="prices" element={<Prices />} />
        <Route path="more" element={<More />} />
        <Route path="*" element={<Capture />} />
      </Route>
    </Routes>
  );
}

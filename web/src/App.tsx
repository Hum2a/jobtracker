import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { BoardPage } from "./pages/BoardPage";
import { ListPage } from "./pages/ListPage";
import { DetailPage } from "./pages/DetailPage";
import { StatsPage } from "./pages/StatsPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<BoardPage />} />
        <Route path="list" element={<ListPage />} />
        <Route path="apps/:id" element={<DetailPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

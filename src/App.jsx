import { useEffect } from 'react';
import Site3D from './scene/Site3D.jsx';
import TopBar from './ui/TopBar.jsx';
import Dock from './ui/Dock.jsx';
import DetailPanel from './ui/DetailPanel.jsx';
import ActivityFeed from './ui/ActivityFeed.jsx';
import Modals from './ui/Modals.jsx';
import { ui, useUI, select } from './store/ui.js';
import { db } from './store/db.js';
import { startSim, stopSim } from './store/sim.js';

const TOUR_MS = 7000;

/** Chế độ tham quan: lần lượt chọn từng hạng mục (camera bay theo selection) */
function useTour() {
  const tour = useUI((s) => s.tour);
  useEffect(() => {
    if (!tour) return undefined;
    const ids = db.list('zones').map((z) => z.id);
    let i = Math.max(0, ids.indexOf(ui.get().selection?.id ?? '') + 1) % ids.length;
    const next = () => {
      select(ids[i % ids.length]);
      i++;
    };
    next();
    const t = setInterval(next, TOUR_MS);
    const onKey = (e) => e.key === 'Escape' && ui.set({ tour: false });
    window.addEventListener('keydown', onKey);
    return () => {
      clearInterval(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [tour]);
}

export default function App() {
  const theme = useUI((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    startSim();
    return stopSim;
  }, []);
  useTour();
  return (
    <div className="app">
      <div className="stage">
        <Site3D />
      </div>
      <TopBar />
      <Dock />
      <DetailPanel />
      <ActivityFeed />
      <Modals />
      <p className="hint">Kéo để xoay · chuột phải để di chuyển · cuộn để phóng to · bấm hạng mục, người hoặc thiết bị để xem chi tiết</p>
    </div>
  );
}

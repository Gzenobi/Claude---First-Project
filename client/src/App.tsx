import { useEffect, useRef, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./pages/Dashboard";
import { Calculate } from "./pages/Calculate";
import { CostList } from "./pages/CostList";
import { Products } from "./pages/Products";
import { Formulas } from "./pages/Formulas";
import { Components } from "./pages/Components";
import { ImportFormulas } from "./pages/ImportFormulas";
import { ImportCosts } from "./pages/ImportCosts";
import { History } from "./pages/History";
import { SettingsPage } from "./pages/Settings";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
      closeButtonRef.current?.focus();
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setSidebarOpen(false);
      };
      document.addEventListener("keydown", onKeyDown);
      wasOpenRef.current = true;
      return () => {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", onKeyDown);
      };
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      menuButtonRef.current?.focus();
    }
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} closeButtonRef={closeButtonRef} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenSidebar={() => setSidebarOpen(true)} menuButtonRef={menuButtonRef} />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calcular" element={<Calculate />} />
            <Route path="/lista" element={<CostList />} />
            <Route path="/productos" element={<Products />} />
            <Route path="/formulas" element={<Formulas />} />
            <Route path="/componentes" element={<Components />} />
            <Route path="/importar-formulas" element={<ImportFormulas />} />
            <Route path="/importar-costos" element={<ImportCosts />} />
            <Route path="/historial" element={<History />} />
            <Route path="/configuracion" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

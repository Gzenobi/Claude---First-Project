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
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
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

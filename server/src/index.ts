import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { productsRouter } from "./routes/products.js";
import { colorsRouter } from "./routes/colors.js";
import { formulasRouter } from "./routes/formulas.js";
import { componentsRouter } from "./routes/components.js";
import { calculationsRouter } from "./routes/calculations.js";
import { importsRouter } from "./routes/imports.js";
import { settingsRouter } from "./routes/settings.js";
import { searchRouter } from "./routes/search.js";
import { dashboardRouter } from "./routes/dashboard.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.use("/api/products", productsRouter);
app.use("/api/colors", colorsRouter);
app.use("/api/formulas", formulasRouter);
app.use("/api/components", componentsRouter);
app.use("/api/calculations", calculationsRouter);
app.use("/api/imports", importsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/search", searchRouter);
app.use("/api/dashboard", dashboardRouter);

// En producción, este mismo servicio sirve el build del cliente (React SPA)
// para que todo corra desde una única URL sin instalar nada en cada PC.
const clientDist = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : "Error interno del servidor.";
  res.status(500).json({ error: message });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Calculadora de Costos de Colores — API escuchando en http://localhost:${port}`);
});

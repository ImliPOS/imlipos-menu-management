import http from "node:http";
import express from "express";
import cors from "cors";
import { env, corsOrigin } from "./env.js";
import { initIO } from "./realtime/io.js";
import { shopsRouter } from "./routes/shops.js";
import { categoriesRouter } from "./routes/categories.js";
import { itemsRouter } from "./routes/items.js";
import { screensRouter } from "./routes/screens.js";
import { devicesRouter } from "./routes/devices.js";
import { mediaRouter } from "./routes/media.js";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: corsOrigin, credentials: true }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/shops", shopsRouter);
app.use("/categories", categoriesRouter);
app.use("/items", itemsRouter);
app.use("/screens", screensRouter);
app.use("/devices", devicesRouter);
app.use("/media", mediaRouter);

// Centralised error guard.
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  },
);

const server = http.createServer(app);
initIO(server);

server.listen(env.PORT, () => {
  console.log(`[imlipos-api] listening on :${env.PORT}`);
});

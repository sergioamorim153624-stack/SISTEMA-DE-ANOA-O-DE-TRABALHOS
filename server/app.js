import express from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ValidationError } from "./store.js";

export function createApp(store) {
  const app = express();
  app.disable("x-powered-by");
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    // The app is for a single trusted workspace; reject browser cross-origin writes.
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.get("origin")) {
      try {
        if (new URL(req.get("origin")).host !== req.get("host"))
          return res.status(403).json({ error: "Origem não autorizada." });
      } catch {
        return res.status(403).json({ error: "Origem inválida." });
      }
    }
    next();
  });
  app.use(express.json({ limit: "12mb" }));
  app.get("/api/health", (req, res) => res.json({ ok: true }));
  app.get("/api/state", (req, res) => res.json(store.snapshot()));
  app.post("/api/tasks", (req, res) =>
    res.status(201).json(store.create(req.body || {})),
  );
  app.patch("/api/tasks/:id", (req, res) =>
    res.json(store.updateTask(req.params.id, req.body || {})),
  );
  app.post("/api/tasks/:id/actions", (req, res) =>
    res.json(store.action(req.params.id, req.body?.action)),
  );
  app.delete("/api/tasks/:id", (req, res) => {
    store.remove(req.params.id);
    res.json({ ok: true });
  });
  app.patch("/api/services/:id", (req, res) =>
    res.json(store.updateService(req.params.id, req.body || {})),
  );
  app.put("/api/settings", (req, res) =>
    res.json(store.settings(req.body || {})),
  );
  app.get("/api/backup", (req, res) =>
    res.attachment("nexo-backup.json").json(store.backup()),
  );
  app.post("/api/backup", (req, res) => res.json(store.restore(req.body)));
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "Operação não encontrada." }),
  );
  const dist = resolve(import.meta.dirname, "../dist");
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get("/{*path}", (req, res) =>
      res.sendFile(resolve(dist, "index.html")),
    );
  }
  app.use((error, req, res, next) => {
    if (
      error instanceof ValidationError ||
      error.type === "entity.parse.failed"
    )
      return res
        .status(400)
        .json({
          error:
            error instanceof ValidationError ? error.message : "JSON inválido.",
        });
    if (error.type === "entity.too.large")
      return res
        .status(413)
        .json({ error: "Arquivo muito grande. O limite é 12 MB." });
    console.error(error);
    res
      .status(500)
      .json({ error: "Não foi possível salvar. Tente novamente." });
  });
  return app;
}

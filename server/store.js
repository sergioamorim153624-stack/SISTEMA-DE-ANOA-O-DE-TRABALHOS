import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createStore } from "../shared/domain.js";
export { DEFAULT_SERVICES, ValidationError } from "../shared/domain.js";

export function openStore(filename, clock = () => new Date()) {
  if (filename !== ":memory:")
    mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(
    "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(kind,id));",
  );
  return createStore(
    {
      put(kind, value) {
        db.prepare(
          "INSERT INTO records(kind,id,data) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data",
        ).run(kind, value.id, JSON.stringify(value));
      },
      get(kind, id) {
        const row = db
          .prepare("SELECT data FROM records WHERE kind=? AND id=?")
          .get(kind, id);
        return row ? JSON.parse(row.data) : null;
      },
      all(kind) {
        return db
          .prepare("SELECT data FROM records WHERE kind=? ORDER BY rowid")
          .all(kind)
          .map((row) => JSON.parse(row.data));
      },
      remove(kind, id) {
        db.prepare("DELETE FROM records WHERE kind=? AND id=?").run(kind, id);
      },
      exec(sql) {
        db.exec(sql);
      },
      close() {
        db.close();
      },
    },
    clock,
  );
}

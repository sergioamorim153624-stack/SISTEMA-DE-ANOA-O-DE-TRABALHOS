import { createStore } from "../shared/domain.js";

export const STORAGE_KEY = "nexo.workspace.v1";

// Use the same business rules as the SQLite server. Each call reloads the
// committed state so tabs never keep a stale in-memory copy of the workspace.
export function createBrowserApi(
  storage,
  clock = () => new Date(),
  locks = typeof window === "undefined" ? null : globalThis.navigator?.locks,
) {
  function execute(path, { method = "GET", body = {} } = {}) {
    let raw;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      throw new Error(
        "O navegador bloqueou o armazenamento. Permita os dados deste site para usar o Nexo.",
      );
    }
    let records = new Map();
    if (raw !== null) {
      try {
        const data = JSON.parse(raw);
        if (
          data.format !== "nexo-browser" ||
          data.version !== 1 ||
          !Array.isArray(data.records)
        )
          throw new Error();
        for (const row of data.records) {
          if (
            !Array.isArray(row) ||
            row.length !== 3 ||
            typeof row[0] !== "string" ||
            typeof row[1] !== "string" ||
            !row[2] ||
            row[1] !== row[2].id
          )
            throw new Error();
          records.set(`${row[0]}\0${row[1]}`, row);
        }
        if (!records.has("meta\0initialized")) throw new Error();
      } catch {
        throw new Error(
          "Os dados locais não puderam ser lidos. Eles foram preservados; não limpe os dados do site. Use uma cópia de backup em outro navegador.",
        );
      }
    }
    let transaction;
    const clone = (value) => (value == null ? null : structuredClone(value));
    const store = createStore(
      {
        put(kind, value) {
          records.set(`${kind}\0${value.id}`, [kind, value.id, clone(value)]);
        },
        get(kind, id) {
          return clone(records.get(`${kind}\0${id}`)?.[2]);
        },
        all(kind) {
          return [...records.values()]
            .filter((row) => row[0] === kind)
            .map((row) => clone(row[2]));
        },
        remove(kind, id) {
          records.delete(`${kind}\0${id}`);
        },
        exec(sql) {
          if (sql === "BEGIN") transaction = structuredClone(records);
          else if (sql === "COMMIT") transaction = null;
          else if (sql === "ROLLBACK" && transaction) {
            records = transaction;
            transaction = null;
          }
        },
        close() {},
      },
      clock,
    );
    let result;
    const taskMatch = path.match(/^\/tasks\/([^/]+)(\/actions)?$/);
    const serviceMatch = path.match(/^\/services\/([^/]+)$/);
    if (method === "GET" && path === "/state") result = store.snapshot();
    else if (method === "GET" && path === "/health") result = { ok: true };
    else if (method === "GET" && path === "/backup") result = store.backup();
    else if (method === "POST" && path === "/backup")
      result = store.restore(body);
    else if (method === "POST" && path === "/tasks")
      result = store.create(body);
    else if (method === "PUT" && path === "/settings")
      result = store.settings(body);
    else if (taskMatch && method === "POST" && taskMatch[2])
      result = store.action(taskMatch[1], body.action);
    else if (taskMatch && method === "PATCH" && !taskMatch[2])
      result = store.updateTask(taskMatch[1], body);
    else if (taskMatch && method === "DELETE" && !taskMatch[2]) {
      store.remove(taskMatch[1]);
      result = { ok: true };
    } else if (serviceMatch && method === "PATCH")
      result = store.updateService(serviceMatch[1], body);
    else throw new Error("Operação não encontrada.");
    if (raw === null || method !== "GET") {
      try {
        storage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            format: "nexo-browser",
            version: 1,
            records: [...records.values()],
          }),
        );
      } catch {
        throw new Error(
          "Não foi possível salvar: o armazenamento do navegador está cheio ou bloqueado. Exporte um backup antes de liberar espaço.",
        );
      }
    }
    return clone(result);
  }
  return (path, options) =>
    locks
      ? locks.request("nexo-workspace", () => execute(path, options))
      : Promise.resolve().then(() => execute(path, options));
}

let instance;
export function browserApi(path, options) {
  if (!instance) {
    let storage;
    try {
      storage = globalThis.localStorage;
    } catch {
      throw new Error(
        "Permita o armazenamento deste site no navegador para usar o aplicativo.",
      );
    }
    instance = createBrowserApi(storage);
  }
  return instance(path, options);
}

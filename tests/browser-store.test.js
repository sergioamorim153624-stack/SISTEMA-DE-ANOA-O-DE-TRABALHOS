import test from "node:test";
import assert from "node:assert/strict";
import { createBrowserApi, STORAGE_KEY } from "../src/browser-api.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
}

test("versão sem servidor preserva o ciclo completo e compartilha regras com SQLite", async () => {
  const storage = memoryStorage();
  let time = new Date("2026-10-19T12:00:00Z");
  let api = createBrowserApi(storage, () => time);
  assert.equal((await api("/state")).services.length, 11);
  const task = await api("/tasks", {
    method: "POST",
    body: { serviceId: "site-medium", title: "Página de vendas" },
  });
  time = new Date("2026-10-19T14:00:00Z");
  const start = await api(`/tasks/${task.id}/actions`, {
    method: "POST",
    body: { action: "start" },
  });
  assert.equal(start.dueAt, "2026-10-19T17:00:00.000Z");
  await assert.rejects(
    api(`/tasks/${task.id}/actions`, {
      method: "POST",
      body: { action: "deliver" },
    }),
  );
  for (const action of ["complete", "deliver", "pay"])
    await api(`/tasks/${task.id}/actions`, {
      method: "POST",
      body: { action },
    });
  api = createBrowserApi(storage);
  const state = await api("/state");
  assert.equal(state.tasks[0].status, "delivered");
  assert.ok(state.tasks[0].paidAt);
  assert.equal(state.tasks[0].events.length, 5);
  const backup = await api("/backup");
  const target = createBrowserApi(memoryStorage());
  assert.deepEqual(await target("/backup", { method: "POST", body: backup }), {
    imported: 1,
    skipped: 0,
  });
  assert.deepEqual(await target("/state"), state);
});

test("chamadas recarregam os dados de outras abas e preservam contratos", async () => {
  const storage = memoryStorage();
  const tab1 = createBrowserApi(storage),
    tab2 = createBrowserApi(storage);
  await tab1("/state");
  await tab2("/tasks", {
    method: "POST",
    body: { serviceId: "site-simple", title: "Primeira aba" },
  });
  await tab1("/tasks", {
    method: "POST",
    body: { serviceId: "site-medium", title: "Segunda aba" },
  });
  await tab1("/services/site-simple", {
    method: "PATCH",
    body: { price: 3500, hours: 3 },
  });
  assert.equal((await tab2("/state")).tasks.length, 2);
  assert.equal(
    (await tab2("/state")).tasks.find((t) => t.title === "Primeira aba").service
      .price,
    2000,
  );
});

test("falha de gravação e dados ilegíveis nunca são substituídos por dados vazios", async () => {
  const storage = memoryStorage();
  const api = createBrowserApi(storage);
  await api("/state");
  const before = storage.getItem(STORAGE_KEY);
  const original = storage.setItem;
  storage.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  await assert.rejects(
    api("/tasks", {
      method: "POST",
      body: { serviceId: "site-simple", title: "Sem espaço" },
    }),
    /armazenamento/,
  );
  assert.equal(storage.getItem(STORAGE_KEY), before);
  storage.setItem = original;
  storage.setItem(STORAGE_KEY, "invalid JSON");
  await assert.rejects(api("/state"), /preservados/);
  assert.equal(storage.getItem(STORAGE_KEY), "invalid JSON");
});

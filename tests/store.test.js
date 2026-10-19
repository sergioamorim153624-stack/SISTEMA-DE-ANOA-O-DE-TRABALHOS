import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore, ValidationError } from "../server/store.js";
import { createApp } from "../server/app.js";

test("catálogo contém preços e prazos solicitados para sites e vídeos", () => {
  const store = openStore(":memory:");
  const services = store.snapshot().services;
  assert.equal(services.length, 11);
  assert.deepEqual(
    services
      .filter((s) => s.category === "Sites")
      .map((s) => [s.price, s.hours]),
    [
      [2000, 1],
      [5000, 3],
      [8000, 24],
    ],
  );
  assert.deepEqual(
    services
      .filter((s) => s.category === "Criativos")
      .map((s) => [s.price, s.hours]),
    [
      [5000, 48],
      [8000, 96],
      [3000, 24],
      [5000, 72],
    ],
  );
  assert.deepEqual(
    services
      .filter((s) => s.category === "Conteúdos")
      .map((s) => [s.price, s.hours]),
    [
      [4000, 48],
      [6000, 96],
      [3000, 24],
      [5000, 72],
    ],
  );
  assert.equal(store.snapshot().tasks.length, 0);
  store.close();
});

test("início real calcula prazo e preserva horários distintos de conclusão, entrega e pagamento", () => {
  let time = new Date("2026-10-19T10:00:00Z");
  const store = openStore(":memory:", () => time);
  const task = store.create({
    serviceId: "site-medium",
    title: "Página de vendas",
    notes: "Atualizar CTA",
  });
  assert.equal(task.status, "pending");
  assert.equal(task.dueAt, null);
  time = new Date("2026-10-20T14:00:00Z");
  const started = store.action(task.id, "start");
  assert.equal(started.startedAt, "2026-10-20T14:00:00.000Z");
  assert.equal(started.dueAt, "2026-10-20T17:00:00.000Z");
  assert.throws(() => store.action(task.id, "start"), ValidationError);
  assert.throws(() => store.action(task.id, "deliver"), ValidationError);
  time = new Date("2026-10-20T16:00:00Z");
  assert.equal(
    store.action(task.id, "complete").completedAt,
    time.toISOString(),
  );
  time = new Date("2026-10-20T16:30:00Z");
  const delivered = store.action(task.id, "deliver");
  assert.equal(delivered.deliveredAt, time.toISOString());
  assert.equal(delivered.completedAt, "2026-10-20T16:00:00.000Z");
  time = new Date("2026-10-21T09:00:00Z");
  assert.equal(store.action(task.id, "pay").paidAt, time.toISOString());
  assert.equal(store.action(task.id, "unpay").paidAt, null);
  assert.deepEqual(
    store.action(task.id, "pay").events.map((e) => e.label),
    [
      "Serviço criado",
      "Execução iniciada",
      "Trabalho finalizado",
      "Entregue ao cliente",
      "Pagamento recebido",
      "Pagamento desmarcado",
      "Pagamento recebido",
    ],
  );
  assert.throws(() => store.remove(task.id), ValidationError);
  store.close();
});

test("dias são corridos e alteração do catálogo não muda contratos existentes", () => {
  const store = openStore(":memory:", () => new Date("2026-10-23T14:00:00Z"));
  const task = store.create({
    serviceId: "creative-video-simple",
    title: "Criativo",
    startNow: true,
  });
  assert.equal(task.dueAt, "2026-10-25T14:00:00.000Z");
  store.updateService("creative-video-simple", { price: 12000, hours: 72 });
  const old = store.snapshot().tasks[0];
  assert.equal(old.service.price, 5000);
  assert.equal(old.service.hours, 48);
  const next = store.create({
    serviceId: "creative-video-simple",
    title: "Novo criativo",
    startNow: true,
  });
  assert.equal(next.service.price, 12000);
  assert.equal(next.dueAt, "2026-10-26T14:00:00.000Z");
  assert.throws(
    () => store.updateService("site-simple", { price: -1, hours: 1 }),
    ValidationError,
  );
  assert.throws(
    () => store.updateService("site-simple", { price: 2000, hours: 0 }),
    ValidationError,
  );
  store.close();
});

test("SQLite persiste tarefas, catálogo e cliente após reabertura", () => {
  const dir = mkdtempSync(join(tmpdir(), "nexo-test-")),
    file = join(dir, "test.sqlite");
  let store = openStore(file);
  const task = store.create({
    serviceId: "site-simple",
    title: "Correção do menu",
  });
  store.settings({
    name: "Cliente de teste",
    contact: "contato@exemplo.com",
    timezone: "America/Cuiaba",
  });
  store.close();
  store = openStore(file);
  assert.equal(store.snapshot().tasks[0].id, task.id);
  assert.equal(store.snapshot().settings.name, "Cliente de teste");
  assert.equal(store.snapshot().services.length, 11);
  store.close();
  rmSync(dir, { recursive: true });
});

test("backup restaura banco vazio e mescla sem sobrescrever serviços existentes", () => {
  const source = openStore(":memory:");
  source.settings({
    name: "Cliente original",
    contact: "",
    timezone: "America/Sao_Paulo",
  });
  source.updateService("site-simple", { price: 2500, hours: 2 });
  const task = source.create({
    serviceId: "site-simple",
    title: "Importado",
    startNow: true,
  });
  const backup = source.backup();
  const target = openStore(":memory:");
  assert.deepEqual(target.restore(backup), { imported: 1, skipped: 0 });
  assert.deepEqual(target.snapshot(), source.snapshot());
  target.updateTask(task.id, { title: "Atualizado", notes: "Novo briefing" });
  assert.deepEqual(target.restore(backup), { imported: 0, skipped: 1 });
  assert.equal(target.snapshot().tasks[0].title, "Atualizado");
  assert.equal(
    target.snapshot().services.find((s) => s.id === "site-simple").price,
    2500,
  );
  source.close();
  target.close();
});

test("backup inválido é rejeitado integralmente, sem perda dos dados", () => {
  const store = openStore(":memory:");
  store.create({ serviceId: "site-simple", title: "Preservar" });
  const backup = store.backup(),
    before = store.snapshot();
  backup.tasks.push({
    ...backup.tasks[0],
    id: "new",
    status: "running",
    startedAt: null,
  });
  assert.throws(() => store.restore(backup), ValidationError);
  assert.deepEqual(store.snapshot(), before);
  const malformed = store.backup();
  malformed.tasks = [null];
  assert.throws(() => store.restore(malformed), ValidationError);
  const invalidTime = store.backup();
  invalidTime.tasks[0].dueAt = "2030-01-01T00:00:00Z";
  assert.throws(() => store.restore(invalidTime), ValidationError);
  assert.throws(
    () => store.create({ serviceId: "site-simple", title: " " }),
    ValidationError,
  );
  assert.throws(
    () =>
      store.settings({
        name: "Cliente",
        contact: "",
        timezone: "invalid/zone",
      }),
    ValidationError,
  );
  store.close();
});

test("API executa fluxo completo, retorna erros de validação e rejeita escrita de outra origem", async (t) => {
  const store = openStore(":memory:");
  const server = createApp(store).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    store.close();
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const send = (path, method = "GET", body, extra = {}) =>
    fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", ...extra },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  const health = await send("/health");
  assert.deepEqual(await health.json(), { ok: true });
  assert.equal((await send("/tasks", "POST", {})).status, 400);
  assert.equal(
    (
      await send(
        "/tasks",
        "POST",
        { serviceId: "site-simple", title: "Invalid" },
        { Origin: "https://example.com" },
      )
    ).status,
    403,
  );
  const response = await send("/tasks", "POST", {
    serviceId: "site-simple",
    title: "API test",
  });
  assert.equal(response.status, 201);
  const task = await response.json();
  assert.equal(
    (await send(`/tasks/${task.id}/actions`, "POST", { action: "pay" })).status,
    400,
  );
  for (const action of ["start", "complete", "deliver", "pay"])
    assert.equal(
      (await send(`/tasks/${task.id}/actions`, "POST", { action })).status,
      200,
    );
  assert.equal((await send(`/tasks/${task.id}`, "DELETE")).status, 400);
  const final = await (await send("/state")).json();
  assert.equal(final.tasks[0].status, "delivered");
  assert.ok(final.tasks[0].paidAt);
  const backup = await send("/backup");
  assert.match(backup.headers.get("content-disposition"), /attachment/);
  assert.equal((await backup.json()).format, "nexo-backup");
  const pending = await (
    await send("/tasks", "POST", {
      serviceId: "site-simple",
      title: "Removível",
    })
  ).json();
  assert.equal((await send(`/tasks/${pending.id}`, "DELETE")).status, 200);
  assert.equal((await send("/not-found")).status, 404);
});

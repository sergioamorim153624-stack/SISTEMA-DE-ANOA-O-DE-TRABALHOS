export const DEFAULT_SERVICES = [
  ["creative-video-simple", "Criativos", "Vídeo + edição", "Simples", 5000, 48],
  [
    "creative-video-complex",
    "Criativos",
    "Vídeo + edição",
    "Complexa",
    8000,
    96,
  ],
  ["creative-edit-simple", "Criativos", "Somente edição", "Simples", 3000, 24],
  [
    "creative-edit-complex",
    "Criativos",
    "Somente edição",
    "Complexa",
    5000,
    72,
  ],
  ["content-video-simple", "Conteúdos", "Vídeo + edição", "Simples", 4000, 48],
  [
    "content-video-complex",
    "Conteúdos",
    "Vídeo + edição",
    "Complexa",
    6000,
    96,
  ],
  ["content-edit-simple", "Conteúdos", "Somente edição", "Simples", 3000, 24],
  ["content-edit-complex", "Conteúdos", "Somente edição", "Complexa", 5000, 72],
  ["site-simple", "Sites", "Alteração de site", "Simples", 2000, 1],
  ["site-medium", "Sites", "Alteração de site", "Mediana", 5000, 3],
  ["site-hard", "Sites", "Alteração de site", "Difícil", 8000, 24],
].map(([id, category, name, level, price, hours]) => ({
  id,
  category,
  name,
  level,
  price,
  hours,
}));

export class ValidationError extends Error {}
const fail = (message) => {
  throw new ValidationError(message);
};
const text = (value, name, max = 200, required = true) => {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    fail(`${name}: informe um texto válido de até ${max} caracteres.`);
  return value.trim();
};
const int = (value, name, min, max) => {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    fail(`${name}: valor inválido.`);
  return value;
};
const iso = (value, name, nullable = false) => {
  if (nullable && value === null) return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
    fail(`${name}: data inválida.`);
  return new Date(value).toISOString();
};
const makeEvent = (label, at) => ({
  id: globalThis.crypto.randomUUID(),
  label,
  at,
});

export function createStore(adapter, clock = () => new Date()) {
  const { put, get, all, exec, remove, close } = adapter;
  if (!get("meta", "initialized")) {
    exec("BEGIN");
    try {
      DEFAULT_SERVICES.forEach((service) => put("service", service));
      put("settings", {
        id: "client",
        name: "Meu cliente",
        contact: "",
        timezone: "America/Cuiaba",
      });
      put("meta", { id: "initialized" });
      exec("COMMIT");
    } catch (err) {
      exec("ROLLBACK");
      throw err;
    }
  }
  const now = () => clock().toISOString();
  const snapshot = () => ({
    services: all("service"),
    tasks: all("task").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    settings: get("settings", "client"),
  });
  const requiredTask = (id) =>
    get("task", id) || fail("Serviço não encontrado. Atualize a página.");
  function validateService(input) {
    if (!input || typeof input !== "object" || Array.isArray(input))
      fail("Serviço inválido.");
    return {
      id: text(input.id, "Identificador", 100),
      category: text(input.category, "Categoria", 80),
      name: text(input.name, "Serviço", 100),
      level: text(input.level, "Complexidade", 50),
      price: int(input.price, "Preço em centavos", 0, 100000000),
      hours: int(input.hours, "Prazo em horas", 1, 8760),
    };
  }
  function validateSettings(input) {
    if (!input || typeof input !== "object" || Array.isArray(input))
      fail("Configurações inválidas.");
    const timezone = text(input.timezone, "Fuso horário", 80);
    try {
      new Intl.DateTimeFormat("pt-BR", { timeZone: timezone }).format();
    } catch {
      fail("Fuso horário inválido.");
    }
    return {
      id: "client",
      name: text(input.name, "Nome do cliente", 100),
      contact: text(input.contact, "Contato", 200, false),
      timezone,
    };
  }
  function validateTask(input) {
    if (!input || typeof input !== "object" || Array.isArray(input))
      fail("Tarefa inválida.");
    const status = input.status;
    if (!["pending", "running", "completed", "delivered"].includes(status))
      fail("Status de tarefa inválido.");
    const task = {
      id: text(input.id, "Identificador", 100),
      title: text(input.title, "Título", 140),
      notes: text(input.notes, "Observações", 5000, false),
      service: validateService(input.service || {}),
      status,
      createdAt: iso(input.createdAt, "Criação"),
      startedAt: iso(input.startedAt, "Início", true),
      dueAt: iso(input.dueAt, "Prazo", true),
      completedAt: iso(input.completedAt, "Conclusão", true),
      deliveredAt: iso(input.deliveredAt, "Entrega", true),
      paidAt: iso(input.paidAt, "Pagamento", true),
    };
    if (
      (status === "pending") !== !task.startedAt ||
      !!task.dueAt !== !!task.startedAt
    )
      fail("Início incompatível com o status.");
    if (
      ["completed", "delivered"].includes(status) !== !!task.completedAt ||
      (status === "delivered") !== !!task.deliveredAt
    )
      fail("Datas incompatíveis com o status.");
    if (
      task.startedAt &&
      (task.startedAt < task.createdAt ||
        task.dueAt !==
          new Date(
            Date.parse(task.startedAt) + task.service.hours * 3600000,
          ).toISOString())
    )
      fail("Prazo ou início inconsistente.");
    if (task.completedAt && task.completedAt < task.startedAt)
      fail("Conclusão anterior ao início.");
    if (task.deliveredAt && task.deliveredAt < task.completedAt)
      fail("Entrega anterior à conclusão.");
    if (task.paidAt && !task.deliveredAt) fail("Pagamento sem entrega.");
    if (!Array.isArray(input.events) || input.events.length > 10000)
      fail("Histórico inválido.");
    task.events = input.events.map((event) => {
      if (!event || typeof event !== "object") fail("Evento inválido.");
      return {
        id: text(event.id, "Evento", 100),
        label: text(event.label, "Evento", 300),
        at: iso(event.at, "Evento"),
      };
    });
    return task;
  }
  return {
    snapshot,
    create(input) {
      const service = get("service", text(input.serviceId, "Serviço", 100));
      if (!service) fail("Selecione um serviço disponível.");
      const at = now();
      const task = {
        id: globalThis.crypto.randomUUID(),
        title: text(input.title, "Título", 140),
        notes: text(input.notes ?? "", "Observações", 5000, false),
        service,
        status: "pending",
        createdAt: at,
        startedAt: null,
        dueAt: null,
        completedAt: null,
        deliveredAt: null,
        paidAt: null,
        events: [makeEvent("Serviço criado", at)],
      };
      if (input.startNow === true) {
        task.status = "running";
        task.startedAt = at;
        task.dueAt = new Date(
          Date.parse(at) + service.hours * 3600000,
        ).toISOString();
        task.events.push(makeEvent("Execução iniciada", at));
      }
      put("task", task);
      return task;
    },
    updateTask(id, input) {
      const task = requiredTask(id);
      const title = text(input.title, "Título", 140);
      const notes = text(input.notes, "Observações", 5000, false);
      if (title !== task.title || notes !== task.notes) {
        task.title = title;
        task.notes = notes;
        task.events.push(makeEvent("Detalhes atualizados", now()));
        put("task", task);
      }
      return task;
    },
    action(id, action) {
      const task = requiredTask(id),
        at = now();
      if (action === "start" && task.status === "pending") {
        task.status = "running";
        task.startedAt = at;
        task.dueAt = new Date(
          Date.parse(at) + task.service.hours * 3600000,
        ).toISOString();
        task.events.push(makeEvent("Execução iniciada", at));
      } else if (action === "complete" && task.status === "running") {
        task.status = "completed";
        task.completedAt = at;
        task.events.push(makeEvent("Trabalho finalizado", at));
      } else if (action === "deliver" && task.status === "completed") {
        task.status = "delivered";
        task.deliveredAt = at;
        task.events.push(makeEvent("Entregue ao cliente", at));
      } else if (
        action === "pay" &&
        task.status === "delivered" &&
        !task.paidAt
      ) {
        task.paidAt = at;
        task.events.push(makeEvent("Pagamento recebido", at));
      } else if (action === "unpay" && task.paidAt) {
        task.paidAt = null;
        task.events.push(makeEvent("Pagamento desmarcado", at));
      } else fail("Essa ação não está disponível para o status atual.");
      put("task", task);
      return task;
    },
    remove(id) {
      const task = requiredTask(id);
      if (task.status !== "pending")
        fail("Somente serviços ainda não iniciados podem ser excluídos.");
      remove("task", id);
    },
    updateService(id, input) {
      const current = get("service", id);
      if (!current) fail("Serviço não encontrado.");
      const service = validateService({
        ...current,
        price: input.price,
        hours: input.hours,
      });
      put("service", service);
      return service;
    },
    settings(input) {
      const settings = validateSettings(input);
      put("settings", settings);
      return settings;
    },
    backup() {
      return {
        format: "nexo-backup",
        version: 1,
        exportedAt: now(),
        ...snapshot(),
      };
    },
    restore(input) {
      if (
        !input ||
        input.format !== "nexo-backup" ||
        input.version !== 1 ||
        !Array.isArray(input.tasks) ||
        input.tasks.length > 20000 ||
        !Array.isArray(input.services) ||
        input.services.length > 200
      )
        fail("Selecione um backup válido do Nexo (versão 1).");
      const tasks = input.tasks.map(validateTask),
        services = input.services.map(validateService),
        settings = validateSettings(input.settings || {});
      if (
        new Set(tasks.map((t) => t.id)).size !== tasks.length ||
        new Set(services.map((s) => s.id)).size !== services.length
      )
        fail("Backup com identificadores duplicados.");
      let imported = 0;
      const empty = all("task").length === 0;
      exec("BEGIN");
      try {
        for (const task of tasks)
          if (!get("task", task.id)) {
            put("task", task);
            imported++;
          }
        // Existing records always win: importing a backup never rewinds work.
        for (const service of services)
          if (empty || !get("service", service.id)) put("service", service);
        if (empty) put("settings", settings);
        exec("COMMIT");
      } catch (err) {
        exec("ROLLBACK");
        throw err;
      }
      return { imported, skipped: tasks.length - imported };
    },
    close() {
      close();
    },
  };
}

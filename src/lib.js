export const standalone = import.meta.env?.MODE === "standalone";
export const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value / 100,
  );
export const duration = (hours) =>
  hours >= 24 && hours % 24 === 0
    ? `${hours / 24} ${hours === 24 ? "dia" : "dias"}`
    : `${hours} ${hours === 1 ? "hora" : "horas"}`;
export const labels = {
  pending: "A iniciar",
  running: "Em andamento",
  completed: "Finalizado",
  delivered: "Entregue",
};
export function date(value, timezone, time = true) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}
export function isLate(task, now = Date.now()) {
  return task.status === "running" && Date.parse(task.dueAt) < now;
}
export function remaining(task, now = Date.now()) {
  if (!task.dueAt) return "Prazo começa ao iniciar";
  if (task.status === "completed" || task.status === "delivered")
    return Date.parse(task.completedAt) <= Date.parse(task.dueAt)
      ? "Finalizado no prazo"
      : "Finalizado após o prazo";
  const diff = Date.parse(task.dueAt) - now,
    minutes = Math.ceil(Math.abs(diff) / 60000);
  const time =
    minutes < 60
      ? `${Math.max(1, minutes)} min`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}h ${minutes % 60}min`
        : `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
  return diff < 0 ? `${time} de atraso` : `${time} restantes`;
}
export async function api(path, options = {}) {
  if (standalone) {
    const { browserApi } = await import("./browser-api.js");
    return browserApi(path, options);
  }
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      body.error || "Não foi possível conectar ao servidor. Tente novamente.",
    );
  return body;
}
export function download(content, type, name) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportCsv(tasks, timezone) {
  // Neutralize spreadsheet formulas in user-supplied text.
  const cell = (value) => {
    let v = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(v)) v = `'${v}`;
    return `"${v.replaceAll('"', '""')}"`;
  };
  const rows = [
    [
      "Trabalho",
      "Categoria",
      "Serviço",
      "Complexidade",
      "Valor (R$)",
      "Prazo (horas)",
      "Status",
      "Criado em",
      "Iniciado em",
      "Previsão de entrega",
      "Finalizado em",
      "Entregue em",
      "Pagamento recebido em",
      "Observações",
    ],
    ...tasks.map((t) => [
      t.title,
      t.service.category,
      t.service.name,
      t.service.level,
      (t.service.price / 100).toFixed(2).replace(".", ","),
      t.service.hours,
      labels[t.status],
      ...[
        t.createdAt,
        t.startedAt,
        t.dueAt,
        t.completedAt,
        t.deliveredAt,
        t.paidAt,
      ].map((d) => (d ? date(d, timezone) : "")),
      t.notes,
    ]),
  ];
  download(
    "\uFEFF" + rows.map((row) => row.map(cell).join(";")).join("\r\n"),
    "text/csv;charset=utf-8",
    "nexo-servicos.csv",
  );
}

import { test, expect } from "@playwright/test";

test("ciclo completo: cliente, serviço, prazo, entrega, pagamento, exportação e persistência", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/nexo-dashboard-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page.getByLabel("Nome do cliente").fill("Cliente de teste");
  await page.getByRole("button", { name: "Salvar configurações" }).click();
  await expect(page.getByRole("status")).toContainText("Configurações salvas");
  await page
    .getByRole("button", { name: "Meus serviços", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Novo serviço", exact: true })
    .first()
    .click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("button", { name: "Sites", exact: true }).click();
  await modal.getByRole("radio").filter({ hasText: "Mediana" }).click();
  await expect(modal.locator(".service-summary")).toContainText("R$ 50,00");
  await expect(modal.locator(".service-summary")).toContainText("3 horas");
  await modal
    .getByLabel("Título do serviço")
    .fill("Atualizar página de vendas");
  await modal
    .getByLabel("Briefing e observações")
    .fill("Alterar o banner e o botão principal.");
  await modal
    .getByRole("button", { name: "Criar serviço", exact: true })
    .click();
  await expect(
    modal.getByRole("heading", { name: "Atualizar página de vendas" }),
  ).toBeVisible();
  await expect(modal).toContainText("Definida ao iniciar o serviço");
  await page.screenshot({
    path: "/tmp/nexo-service-detail.png",
    fullPage: true,
  });
  await modal
    .getByRole("button", { name: "Iniciar serviço", exact: true })
    .click();
  await expect(
    modal.getByRole("button", { name: "Finalizar trabalho" }),
  ).toBeVisible();
  const task = (await (await page.request.get("/api/state")).json()).tasks[0];
  expect(Date.parse(task.dueAt) - Date.parse(task.startedAt)).toBe(3 * 3600000);
  await modal.getByRole("button", { name: "Finalizar trabalho" }).click();
  await modal
    .getByRole("button", { name: "Registrar entrega", exact: true })
    .click();
  await expect(modal).toContainText("Entregue ao cliente");
  await modal.getByRole("button", { name: "Recebi o pagamento" }).click();
  await expect(modal).toContainText("Pagamento recebido");
  await modal
    .getByLabel("Briefing e observações")
    .fill("Entregue e aprovado pelo cliente.");
  await modal.getByRole("button", { name: "Salvar anotações" }).click();
  await expect(page.getByRole("status")).toContainText("Anotações salvas");
  await modal.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Atualizar página de vendas",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Financeiro", exact: true }).click();
  await expect(page.locator(".finance-stats")).toContainText("R$ 50,00");
  await expect(page.getByText("Pago", { exact: true })).toBeVisible();
  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar relatório" }).click();
  expect((await csvPromise).suggestedFilename()).toBe("nexo-servicos.csv");
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  const backupPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar backup" }).click();
  expect((await backupPromise).suggestedFilename()).toMatch(
    /^nexo-backup-.*\.json$/,
  );
  const backup = await (await page.request.get("/api/backup")).json();
  expect(backup.tasks[0].notes).toBe("Entregue e aprovado pelo cliente.");
  expect(backup.tasks[0].status).toBe("delivered");
  expect(backup.tasks[0].paidAt).toBeTruthy();
  expect(errors).toEqual([]);
});

test("catálogo pode mudar sem alterar contratos; busca e exclusão de rascunho funcionam", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1365, height: 1000 });
  await page.goto("/#catalog");
  await page
    .getByRole("button", {
      name: "Editar Sites, Alteração de site, Simples",
      exact: true,
    })
    .click();
  const edit = page.getByRole("dialog");
  await edit.getByLabel("Valor do serviço").fill("25");
  await edit.getByLabel("Prazo (horas corridas)").fill("2");
  await edit.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(edit).not.toBeVisible();
  const card = page
    .locator(".catalog-card")
    .filter({
      has: page.getByRole("button", {
        name: "Editar Sites, Alteração de site, Simples",
        exact: true,
      }),
    });
  await expect(card).toContainText("R$ 25,00");
  await card
    .getByRole("button", { name: "Criar serviço", exact: true })
    .click();
  const modal = page.getByRole("dialog");
  await modal.getByLabel("Título do serviço").fill("Ajuste do rodapé");
  await modal
    .getByRole("button", { name: "Criar serviço", exact: true })
    .click();
  await expect(modal.locator(".detail-values")).toContainText("R$ 25,00");
  await expect(modal.locator(".detail-values")).toContainText("2 horas");
  await modal.getByRole("button", { name: "Fechar", exact: true }).click();
  await page
    .getByRole("button", { name: "Meus serviços", exact: true })
    .click();
  await page.getByLabel("Buscar serviços").fill("rodapé");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Ajuste do rodapé", exact: true })
    .click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Excluir serviço não iniciado" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText("Nenhum serviço encontrado")).toBeVisible();
});

test("layout móvel permite navegar e criar serviço sem ultrapassar a tela", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBeTruthy();
  await page.screenshot({
    path: "/tmp/nexo-dashboard-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Abrir navegação" }).click();
  await page
    .getByRole("button", { name: "Meus serviços", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Novo serviço", exact: true })
    .first()
    .click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("radio").first().click();
  await modal.getByLabel("Título do serviço").fill("Vídeo da campanha");
  await modal.getByLabel("Iniciar assim que criar").check();
  await modal.getByRole("button", { name: "Criar e iniciar serviço" }).click();
  await expect(
    modal.getByRole("heading", { name: "Vídeo da campanha", exact: true }),
  ).toBeVisible();
  await expect(
    modal.getByRole("button", { name: "Finalizar trabalho" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBeTruthy();
  await page.screenshot({
    path: "/tmp/nexo-service-mobile.png",
    fullPage: true,
  });
});

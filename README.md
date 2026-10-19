# Nexo · Gestão de serviços

Sistema para organizar serviços de um cliente, com catálogo de preços, prazos automáticos, execução, entregas, histórico e recebimentos. Interface em português com tema azul escuro e layout para computador e celular.

## Abrir pela internet, sem contratar hospedagem

O projeto também tem uma versão estática para **GitHub Pages**, que não depende de uma API ou servidor Node. Ela mantém todas as funcionalidades de serviços, execução, prazos, histórico, financeiro, CSV e backup. As regras de negócio são as mesmas da versão SQLite.

**Nessa versão, os dados ficam somente no navegador usado para acessar o aplicativo.** Eles não são enviados ao GitHub, não aparecem para outras pessoas que abrem a página e não sincronizam entre computadores. Faça backups JSON em Configurações antes de limpar os dados do site ou trocar de navegador. Para migrar dados da versão do servidor, exporte o backup JSON nela e importe na versão publicada.

O workflow `.github/workflows/pages.yml` compila e publica a página quando a branch `main` é atualizada. Se o GitHub exigir habilitação manual, abra **Settings → Pages → Build and deployment → Source → GitHub Actions** e execute novamente o workflow **Publicar Nexo no GitHub Pages** na aba Actions. Habilitar ou publicar este ambiente do Codex não cria um site público.

Para gerar a versão estática localmente:

```bash
npm ci --cache /tmp/nexo-npm-cache
npm run build:standalone
npm run test:standalone
```

O arquivo `standalone/index.html` contém a aplicação inteira, incluindo estilos, ícones e fontes. Pode ser servido por qualquer hospedagem estática. Nenhuma chave de API ou senha é necessária, pois nessa modalidade não há um banco de dados público compartilhado.

### Cópia para baixar

Uma cópia compilada da aplicação completa está em `downloads/Nexo.zip`, com `Nexo.html` e orientações de uso. Extraia o ZIP e abra o HTML no seu navegador, mantendo o arquivo na mesma pasta. Não precisa de Node.js, terminal ou servidor. Para gerar uma nova cópia a partir do código atual, execute `npm run release:html`. O arquivo não contém registros de clientes ou serviços realizados. Ao usá-lo no navegador, mantenha backups JSON dos seus dados. A implantação online continua sendo feita pelo GitHub Pages, sem depender dessa cópia.

### Publicar com subdomínio gratuito pelo Netlify Drop

O pacote `downloads/Nexo-site.zip` contém a versão estática completa com `index.html` na raiz, pronta para hospedagem. Gere uma cópia atualizada com `npm run release:site`.

1. Baixe e extraia `Nexo-site.zip` em uma pasta.
2. Entre na sua conta do Netlify e abra <https://app.netlify.com/drop>.
3. Arraste a pasta que contém `index.html` para a área de publicação.
4. O Netlify fornece um endereço HTTPS com subdomínio gerado, como `nome-aleatorio.netlify.app`. Use o endereço que a plataforma informar após concluir a publicação para compartilhar o aplicativo. Esse nome é um exemplo, não um endereço já publicado.

Não precisa executar o workflow do GitHub Actions para essa publicação manual. A conta e o envio do pacote são feitos no Netlify; nenhum acesso a essa hospedagem é fornecido automaticamente pela conexão GitHub do Codex.

**Compartilhar o aplicativo não compartilha os registros.** Cada navegador guarda os seus próprios dados, sem login ou sincronização entre pessoas. Se várias pessoas precisarem trabalhar nos mesmos serviços do mesmo cliente, será necessário disponibilizar a versão com servidor, banco persistente e autenticação. Para levar seus dados para um novo endereço, exporte um backup JSON na versão anterior e importe em Configurações no novo site. O pacote publicado não inclui seus registros locais.

## Executar

Requer **Node.js 22.13+** (recomendado: Node.js 24 LTS) e npm. O SQLite é nativo do Node e não precisa de outro serviço.

```bash
npm ci --cache /tmp/nexo-npm-cache
npm run dev
```

O Vite inicia na porta **5173** e encaminha `/api` para a API na porta **3001**. Use a aplicação pela porta do Vite durante o desenvolvimento. Os dois processos são iniciados juntos e encerrados com Ctrl+C.

Para executar a versão compilada:

```bash
npm run build
npm start
```

A aplicação completa é servida pela API na porta **3001**. `PORT` altera a porta em produção. `DATA_FILE` define um caminho alternativo para o banco SQLite. Não há serviços externos, chaves de API ou variáveis obrigatórias. Fontes são instaladas pelo npm e servidas junto da aplicação.

## Como usar

1. Em **Configurações**, informe o nome do cliente e o fuso horário (padrão: Cuiabá).
2. Clique em **Novo serviço**, selecione a categoria, o tipo e a complexidade; valor e prazo aparecem automaticamente.
3. Dê um título e, se quiser, adicione briefing, links e observações. Crie como “A iniciar” ou marque “Iniciar assim que criar”.
4. Em **Iniciar serviço**, o horário real é registrado e a previsão é calculada a partir desse momento. **Dias são corridos e equivalem a 24 horas**, inclusive fins de semana.
5. Use **Finalizar trabalho** para registrar a conclusão e **Registrar entrega** depois de enviar o trabalho ao cliente. Os horários são independentes.
6. Depois da entrega, clique em **Recebi o pagamento**. O painel financeiro considera serviços entregues e separa recebidos e pendentes. O período financeiro usa a data da entrega, não a data do pagamento.
7. O histórico guarda criação, início, conclusão, entrega, alterações nas anotações e mudanças de pagamento. Serviços iniciados não podem ser excluídos.

O valor e o prazo são copiados do catálogo ao criar cada tarefa. Ajustes futuros no catálogo **não alteram os contratos já registrados**. Os números do painel são calculados a partir dos seus serviços reais; não há dados de exemplo.

## Catálogo inicial

| Categoria | Serviço           | Complexidade | Valor |   Prazo |
| --------- | ----------------- | ------------ | ----: | ------: |
| Criativos | Vídeo + edição    | Simples      | R$ 50 |  2 dias |
| Criativos | Vídeo + edição    | Complexa     | R$ 80 |  4 dias |
| Criativos | Somente edição    | Simples      | R$ 30 |   1 dia |
| Criativos | Somente edição    | Complexa     | R$ 50 |  3 dias |
| Conteúdos | Vídeo + edição    | Simples      | R$ 40 |  2 dias |
| Conteúdos | Vídeo + edição    | Complexa     | R$ 60 |  4 dias |
| Conteúdos | Somente edição    | Simples      | R$ 30 |   1 dia |
| Conteúdos | Somente edição    | Complexa     | R$ 50 |  3 dias |
| Sites     | Alteração de site | Simples      | R$ 20 |  1 hora |
| Sites     | Alteração de site | Mediana      | R$ 50 | 3 horas |
| Sites     | Alteração de site | Difícil      | R$ 80 |   1 dia |

Os itens “mesmo caso” da anotação foram interpretados como os mesmos prazos dos criativos e os mesmos valores de “somente edição”. Tudo pode ser ajustado em **Catálogo de serviços**.

## Persistência e backup

O banco fica em `data/nexo.sqlite`, ignorado pelo Git. Ele é compartilhado pelos navegadores que usam este mesmo servidor e persiste ao reiniciar o aplicativo. Não apague `data/` para atualizar o código. Em hospedagem, mantenha esse diretório em um volume persistente. Processos de teste usam bancos separados.

Em **Configurações → Exportar backup**, baixe um arquivo JSON com tarefas, eventos, catálogo e dados do cliente. Ao importar um arquivo, a validação ocorre antes da transação; serviços com identificador já existente são preservados. Em um banco sem tarefas, o catálogo e as configurações do backup também são restaurados; em um banco com tarefas, só serviços novos são incorporados. A exportação CSV em **Meus serviços** respeita os filtros; no **Financeiro**, respeita o período de entrega e o filtro de pagamento.

Este aplicativo atende um espaço privado de um único usuário/cliente. Não inclui contas ou autenticação. Para hospedagem pública, disponibilize-o atrás de controle de acesso (por exemplo, autenticação do provedor) e HTTPS.

## Verificação

```bash
npm test
npm run build
npm run test:e2e
npm run test:standalone
```

Os testes Node verificam cálculo de prazos, transições, contratos preservados, persistência SQLite, integridade de backup, API e armazenamento no navegador. Os testes de navegador da versão de servidor usam uma base temporária e executam o ciclo completo em computador e celular. O teste da página estática também verifica o fluxo completo, recarregamento, importação de backup e ausência de chamadas de API. Instale o Chromium do Playwright com `npx playwright install chromium` ou defina `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` para um Chromium já instalado. Neste ambiente, `/usr/bin/chromium` é usado automaticamente quando disponível.

import React, { useState, useEffect, useRef, useId } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  Layers3,
  CircleDollarSign,
  SlidersHorizontal,
  Settings,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Search,
  Clock3,
  Check,
  CheckCheck,
  Play,
  X,
  Video,
  Clapperboard,
  Globe2,
  Download,
  Upload,
  CalendarDays,
  Wallet,
  TrendingUp,
  FileText,
  AlertCircle,
  Menu,
  LoaderCircle,
  Pencil,
  Trash2,
  Save,
  BriefcaseBusiness,
  FolderOpen,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import {
  api,
  money,
  duration,
  date,
  labels,
  isLate,
  remaining,
  exportCsv,
  download,
  standalone,
} from "./lib";
import "./styles.css";

const navigation = [
  ["home", "Visão geral", LayoutDashboard],
  ["tasks", "Meus serviços", Layers3],
  ["finance", "Financeiro", CircleDollarSign],
  ["catalog", "Catálogo de serviços", SlidersHorizontal],
  ["settings", "Configurações", Settings],
];
const categoryIcon = (category) =>
  category === "Sites"
    ? Globe2
    : category === "Conteúdos"
      ? Video
      : Clapperboard;
function ServiceIcon({ category, small = false }) {
  const Icon = categoryIcon(category);
  return (
    <span
      className={`service-icon ${category === "Sites" ? "teal" : category === "Conteúdos" ? "purple" : "blue"} ${small ? "small" : ""}`}
    >
      <Icon size={small ? 17 : 21} />
    </span>
  );
}
function Badge({ task }) {
  const late = isLate(task);
  return (
    <span className={`badge ${late ? "late" : task.status}`}>
      <span />
      {late ? "Em atraso" : labels[task.status]}
    </span>
  );
}
function Empty({ title, text, action, icon: Icon = FolderOpen }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={28} strokeWidth={1.5} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function Button({ children, className = "", busy, ...props }) {
  return (
    <button
      className={`button ${className}`}
      {...props}
      disabled={props.disabled || busy}
    >
      {busy ? <LoaderCircle className="spin" size={17} /> : null}
      {children}
    </button>
  );
}

function Modal({ title, subtitle, onClose, children, drawer = false }) {
  const ref = useRef(null),
    titleId = useId(),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = document.getElementById("app-shell");
    root?.setAttribute("inert", "");
    ref.current?.focus();
    function key(event) {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab") return;
      const items = ref.current.querySelectorAll(
        "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
      );
      const first = items[0],
        last = items[items.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === ref.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === ref.current)
      ) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = scroll;
      root?.removeAttribute("inert");
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return createPortal(
    <div
      className={`modal-backdrop ${drawer ? "drawer-backdrop" : ""}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`modal ${drawer ? "drawer" : ""}`}
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <X size={21} />
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}

function App() {
  const [state, setState] = useState(null),
    [error, setError] = useState(""),
    [page, setPage] = useState(() =>
      navigation.some((n) => n[0] === location.hash.slice(1))
        ? location.hash.slice(1)
        : "home",
    );
  const [newTask, setNewTask] = useState(null),
    [selected, setSelected] = useState(null),
    [toast, setToast] = useState(null),
    [mobileOpen, setMobileOpen] = useState(false),
    [now, setNow] = useState(Date.now());
  const toastTimer = useRef(null);
  const notify = (message, bad = false) => {
    clearTimeout(toastTimer.current);
    setToast({ message, bad });
    toastTimer.current = setTimeout(() => setToast(null), 5500);
  };
  async function refresh() {
    const data = await api("/state");
    setState(data);
    setError("");
    return data;
  }
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    const tick = setInterval(() => setNow(Date.now()), 30000);
    const update = () => {
      if (!document.hidden) refresh().catch(() => {});
    };
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    const sync = setInterval(update, 30000);
    const hash = () => {
      const next = location.hash.slice(1);
      if (navigation.some((n) => n[0] === next)) setPage(next);
    };
    window.addEventListener("hashchange", hash);
    return () => {
      clearInterval(tick);
      clearInterval(sync);
      clearTimeout(toastTimer.current);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("hashchange", hash);
    };
  }, []);
  const navigate = (p) => {
    setPage(p);
    location.hash = p;
    setMobileOpen(false);
    window.scrollTo(0, 0);
  };
  const mutate = async (path, method, body, message) => {
    const result = await api(path, { method, body });
    try {
      await refresh();
    } catch {
      notify(
        "Alteração salva. Atualize a página para sincronizar a lista.",
        true,
      );
      return result;
    }
    if (message) notify(message);
    return result;
  };
  if (!state)
    return (
      <div className="boot">
        <div className="logo-mark">n</div>
        <h1>
          Nexo<span>.</span>
        </h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <Button onClick={() => refresh().catch((e) => setError(e.message))}>
              Tentar novamente
            </Button>
          </>
        ) : (
          <p>
            <LoaderCircle size={17} className="spin" /> Preparando seu espaço…
          </p>
        )}
      </div>
    );
  const { tasks, services, settings } = state;
  const timezone = settings.timezone;
  const running = tasks.filter((t) => t.status === "running").length;
  const currentTask = tasks.find((t) => t.id === selected);
  const titles = {
    home: [
      "Visão geral",
      "Seu trabalho organizado. Cada entrega no lugar certo.",
    ],
    tasks: [
      "Meus serviços",
      "Do primeiro clique à entrega, acompanhe cada trabalho.",
    ],
    finance: ["Financeiro", "Clareza sobre o valor do seu trabalho."],
    catalog: [
      "Catálogo de serviços",
      "Valores e prazos definidos para simplificar sua rotina.",
    ],
    settings: ["Configurações", "Deixe o seu espaço com a sua cara."],
  };
  return (
    <>
      <div id="app-shell" className="app-shell">
        <button
          className={`mobile-shade ${mobileOpen ? "visible" : ""}`}
          aria-label="Fechar navegação"
          onClick={() => setMobileOpen(false)}
        />
        <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
          <a className="brand" href="#home" onClick={() => navigate("home")}>
            <span className="logo-mark">n</span>
            <span>
              nexo<span className="brand-dot">.</span>
            </span>
          </a>
          <div className="workspace-label">SEU ESPAÇO DE TRABALHO</div>
          <div className="client-card">
            <div className="client-avatar">
              {settings.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <strong>{settings.name}</strong>
              <span>Cliente exclusivo</span>
            </div>
            <button
              className="icon-button"
              aria-label="Editar cliente"
              onClick={() => navigate("settings")}
            >
              <ChevronDown size={16} />
            </button>
          </div>
          <div className="nav-label">PRINCIPAL</div>
          <nav aria-label="Navegação principal">
            {navigation.map(([id, label, Icon], index) => (
              <React.Fragment key={id}>
                {index === 3 && (
                  <div className="nav-label manage-label">GERENCIAR</div>
                )}
                <button
                  onClick={() => navigate(id)}
                  className={`nav-item ${page === id ? "active" : ""}`}
                  aria-current={page === id ? "page" : undefined}
                >
                  <Icon size={19} />
                  <span>{label}</span>
                  {id === "tasks" && running > 0 && (
                    <span className="nav-count">{running}</span>
                  )}
                </button>
              </React.Fragment>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="tip-icon">
              <Sparkles size={18} />
            </div>
            <strong>
              Menos anotações.
              <br />
              Mais entregas.
            </strong>
            <p>Um espaço para focar no que você faz de melhor.</p>
            <div className="storage-label">
              <span />
              {standalone
                ? "Dados salvos neste navegador"
                : "Dados salvos neste servidor"}
            </div>
          </div>
          <div className="sidebar-footer">
            <span className="avatar">EU</span>
            <div>
              <strong>Meu espaço</strong>
              <small>Gestão de serviços</small>
            </div>
            <span className="version">v1.0</span>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="icon-button mobile-menu"
                aria-label="Abrir navegação"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={22} />
              </button>
              <span className="desktop-label">Meu espaço</span>
              <ChevronRight size={14} className="desktop-label" />
              <strong>{titles[page][0]}</strong>
            </div>
            <div className="topbar-right">
              <span className="today">
                <CalendarDays size={15} />
                {new Intl.DateTimeFormat("pt-BR", {
                  timeZone: timezone,
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }).format(now)}
              </span>
              <span className="topbar-divider" />
              <span className="avatar small-avatar">EU</span>
            </div>
          </header>
          <main>
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  PAINEL DE TRABALHO <span />
                </div>
                <h1>{titles[page][0]}</h1>
                <p>{titles[page][1]}</p>
              </div>
              {page !== "settings" && (
                <Button className="primary" onClick={() => setNewTask({})}>
                  <Plus size={18} /> Novo serviço
                </Button>
              )}
            </div>
            {page === "home" && (
              <Dashboard
                tasks={tasks}
                timezone={timezone}
                now={now}
                open={setSelected}
                create={() => setNewTask({})}
                navigate={navigate}
              />
            )}
            {page === "tasks" && (
              <TaskList
                tasks={tasks}
                timezone={timezone}
                open={setSelected}
                create={() => setNewTask({})}
              />
            )}
            {page === "finance" && (
              <Finance tasks={tasks} timezone={timezone} open={setSelected} />
            )}
            {page === "catalog" && (
              <Catalog
                services={services}
                mutate={mutate}
                notify={notify}
                create={(id) => setNewTask({ serviceId: id })}
              />
            )}
            {page === "settings" && (
              <SettingsPanel
                settings={settings}
                tasks={tasks}
                mutate={mutate}
                notify={notify}
                refresh={refresh}
              />
            )}
            <footer className="page-footer">
              <span>
                Nexo <span className="muted">/</span> Cada trabalho conta.
              </span>
              <span>
                <ShieldCheck size={13} /> Seu trabalho, registrado.
              </span>
            </footer>
          </main>
        </div>
      </div>
      {newTask && (
        <CreateTask
          services={services}
          timezone={timezone}
          initial={newTask}
          onClose={() => setNewTask(null)}
          onSubmit={async (data) => {
            const task = await mutate(
              "/tasks",
              "POST",
              data,
              "Serviço criado com sucesso.",
            );
            setNewTask(null);
            setSelected(task.id);
          }}
        />
      )}
      {currentTask && (
        <TaskDetail
          key={currentTask.id}
          task={currentTask}
          timezone={timezone}
          onClose={() => setSelected(null)}
          mutate={mutate}
          notify={notify}
        />
      )}
      {toast && (
        <div
          className={`toast ${toast.bad ? "error" : ""}`}
          role={toast.bad ? "alert" : "status"}
        >
          {toast.bad ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="icon-button"
            aria-label="Dispensar aviso"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </>
  );
}

function StatCard({ label, value, description, icon: Icon, color, note }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${color || ""}`}>
          <Icon size={18} />
        </span>
      </div>
      <strong className="stat-value">{value}</strong>
      <div className="stat-description">
        {note && <span className="stat-dot" />} {description}
      </div>
    </article>
  );
}
function Dashboard({ tasks, timezone, now, open, create, navigate }) {
  const active = tasks.filter((t) => t.status === "running"),
    delivered = tasks.filter((t) => t.status === "delivered"),
    paid = tasks.filter((t) => t.paidAt),
    late = active.filter((t) => isLate(t, now));
  const priority = [...active].sort((a, b) =>
    a.dueAt.localeCompare(b.dueAt),
  )[0];
  const progress = priority
    ? Math.min(
        100,
        Math.max(
          0,
          ((now - Date.parse(priority.startedAt)) /
            (Date.parse(priority.dueAt) - Date.parse(priority.startedAt))) *
            100,
        ),
      )
    : 0;
  return (
    <>
      <div className="welcome-banner">
        <div>
          <span className="mini-label">
            <span /> TUDO SOB CONTROLE
          </span>
          <h2>
            Seu talento merece
            <br />
            uma rotina mais leve<span>.</span>
          </h2>
          <p>
            Organize seus serviços, acompanhe os prazos
            <br className="desktop-label" /> e tenha cada entrega registrada.
          </p>
          <button className="text-button" onClick={create}>
            Vamos criar seu próximo serviço <ArrowRight size={16} />
          </button>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="art-grid" />
          <div className="art-card back-card">
            <span />
            <span />
            <span />
          </div>
          <div className="art-card front-card">
            <div className="art-check">
              <Check size={26} />
            </div>
            <div className="art-line long" />
            <div className="art-line" />
            <div className="art-progress">
              <i />
            </div>
            <div className="art-card-bottom">
              <span>Mais foco. Mais resultado.</span>
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div className="floating-spark">
            <Sparkles size={20} />
          </div>
        </div>
      </div>
      <div className="stats-grid">
        <StatCard
          label="Em andamento"
          value={active.length.toString().padStart(2, "0")}
          description={
            late.length
              ? `${late.length} ${late.length === 1 ? "serviço em atraso" : "serviços em atraso"}`
              : "Seu próximo resultado está aqui"
          }
          icon={Layers3}
          color="blue"
        />
        <StatCard
          label="Serviços entregues"
          value={delivered.length.toString().padStart(2, "0")}
          description="Trabalhos que viraram resultado"
          icon={CheckCheck}
          color="teal"
        />
        <StatCard
          label="Total recebido"
          value={money(paid.reduce((n, t) => n + t.service.price, 0))}
          description={`${paid.length} ${paid.length === 1 ? "serviço pago" : "serviços pagos"}`}
          icon={Wallet}
          color="purple"
        />
        <StatCard
          label="A receber"
          value={money(
            delivered
              .filter((t) => !t.paidAt)
              .reduce((n, t) => n + t.service.price, 0),
          )}
          description="Entregas aguardando pagamento"
          icon={Clock3}
          color="amber"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <h2>
                Serviços recentes{" "}
                <span className="count-chip">{tasks.length}</span>
              </h2>
              <p>Um olhar rápido sobre seus últimos trabalhos.</p>
            </div>
            <button
              className="text-button muted-button"
              onClick={() => navigate("tasks")}
            >
              Ver todos <ArrowUpRight size={16} />
            </button>
          </div>
          {tasks.length ? (
            <TasksTable
              tasks={tasks.slice(0, 5)}
              timezone={timezone}
              open={open}
              compact
            />
          ) : (
            <Empty
              title="Seu próximo trabalho começa aqui"
              text="Escolha um serviço. O valor e o prazo já ficam prontos para você."
              action={
                <Button className="secondary" onClick={create}>
                  <Plus size={16} /> Criar primeiro serviço
                </Button>
              }
            />
          )}
        </section>
        <section className="panel priority-panel">
          <div className="panel-heading">
            <div>
              <h2>De olho no prazo</h2>
              <p>O próximo trabalho para entregar.</p>
            </div>
            <span className="icon-outline">
              <Clock3 size={18} />
            </span>
          </div>
          {priority ? (
            <div className="priority-content">
              <Badge task={priority} />
              <h3>{priority.title}</h3>
              <p>
                {priority.service.category} · {priority.service.name}
              </p>
              <div className="deadline-block">
                <span>PREVISÃO DE ENTREGA</span>
                <strong>{date(priority.dueAt, timezone)}</strong>
              </div>
              <div className="progress-track">
                <div
                  className={isLate(priority) ? "overdue-progress" : ""}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div
                className={`time-left ${isLate(priority) ? "danger-text" : ""}`}
              >
                {remaining(priority, now)}
              </div>
              <Button
                className="secondary full"
                onClick={() => open(priority.id)}
              >
                Abrir serviço <ArrowUpRight size={16} />
              </Button>
            </div>
          ) : (
            <div className="deadline-empty">
              <div className="deadline-drawing">
                <Clock3 size={39} strokeWidth={1} />
                <span>
                  <Check size={12} />
                </span>
              </div>
              <h3>Uma coisa de cada vez.</h3>
              <p>
                Quando você iniciar um serviço,
                <br />o prazo aparecerá por aqui.
              </p>
              <span className="subtle-tag">Pronto para o próximo passo</span>
            </div>
          )}
        </section>
      </div>
      <div className="dashboard-lower">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Seu trabalho em números</h2>
              <p>Valor das entregas nos últimos 6 meses.</p>
            </div>
            <span className="subtle-tag">Entregues</span>
          </div>
          <RevenueChart tasks={tasks} timezone={timezone} />
        </section>
        <section className="panel category-panel">
          <div className="panel-heading">
            <div>
              <h2>Frentes de trabalho</h2>
              <p>Cada especialidade tem seu espaço.</p>
            </div>
          </div>
          {["Criativos", "Conteúdos", "Sites"].map((category) => {
            const items = tasks.filter((t) => t.service.category === category);
            return (
              <div className="category-row" key={category}>
                <ServiceIcon category={category} small />
                <div>
                  <strong>{category}</strong>
                  <small>
                    {items.length}{" "}
                    {items.length === 1
                      ? "serviço registrado"
                      : "serviços registrados"}
                  </small>
                </div>
                <span>
                  {money(items.reduce((n, t) => n + t.service.price, 0))}
                </span>
              </div>
            );
          })}
          <p className="category-footnote">
            Valores contratados, incluindo serviços a iniciar.
          </p>
        </section>
      </div>
    </>
  );
}

function TasksTable({ tasks, timezone, open, compact = false }) {
  return (
    <div className="table-scroll">
      <table className={`tasks-table ${compact ? "compact-table" : ""}`}>
        <thead>
          <tr>
            <th>Serviço</th>
            <th>Status</th>
            {!compact && <th>Data de criação</th>}
            <th>Prazo</th>
            <th className="align-right">Valor</th>
            <th>
              <span className="sr-only">Detalhes</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>
                <div className="service-cell">
                  <ServiceIcon category={task.service.category} small />
                  <div>
                    <button
                      className="table-title"
                      onClick={() => open(task.id)}
                    >
                      {task.title}
                    </button>
                    <small>
                      {task.service.category} · {task.service.level}
                    </small>
                  </div>
                </div>
              </td>
              <td>
                <Badge task={task} />
              </td>
              {!compact && (
                <td className="table-date">
                  {date(task.createdAt, timezone, false)}
                </td>
              )}
              <td>
                <div
                  className={`table-deadline ${isLate(task) ? "danger-text" : ""}`}
                >
                  {task.dueAt
                    ? date(task.dueAt, timezone, false)
                    : "Não iniciado"}
                  <small>
                    {task.dueAt
                      ? new Intl.DateTimeFormat("pt-BR", {
                          timeZone: timezone,
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(task.dueAt))
                      : duration(task.service.hours)}
                  </small>
                </div>
              </td>
              <td className="table-money">
                {money(task.service.price)}
                {task.paidAt && (
                  <small className="paid-mark">
                    <Check size={11} /> Pago
                  </small>
                )}
              </td>
              <td>
                <button
                  className="icon-button"
                  onClick={() => open(task.id)}
                  aria-label={`Abrir ${task.title}`}
                >
                  <ArrowUpRight size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function TaskList({ tasks, timezone, open, create }) {
  const [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [sort, setSort] = useState("newest");
  const [limit, setLimit] = useState(15);
  const filters = [
    ["all", "Todos"],
    ["pending", "A iniciar"],
    ["running", "Em andamento"],
    ["completed", "Finalizados"],
    ["delivered", "Entregues"],
    ["late", "Em atraso"],
  ];
  const matches = (task) =>
    (filter === "all" ||
      (filter === "late" ? isLate(task) : task.status === filter)) &&
    (category === "all" || task.service.category === category) &&
    `${task.title} ${task.service.name} ${task.notes}`
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR"));
  const filtered = tasks
    .filter(matches)
    .sort((a, b) =>
      sort === "oldest"
        ? a.createdAt.localeCompare(b.createdAt)
        : sort === "due"
          ? (a.dueAt || "9999").localeCompare(b.dueAt || "9999")
          : b.createdAt.localeCompare(a.createdAt),
    );
  useEffect(() => setLimit(15), [filter, search, category, sort]);
  return (
    <section className="panel">
      <div className="filter-tabs" role="group" aria-label="Filtrar por status">
        {filters.map(([key, label]) => (
          <button
            aria-pressed={filter === key}
            className={filter === key ? "selected" : ""}
            key={key}
            onClick={() => setFilter(key)}
          >
            {label}
            <span>
              {
                tasks.filter(
                  (t) =>
                    key === "all" ||
                    (key === "late" ? isLate(t) : t.status === key),
                ).length
              }
            </span>
          </button>
        ))}
      </div>
      <div className="table-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            placeholder="Buscar um serviço…"
            aria-label="Buscar serviços"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="toolbar-selects">
          <select
            aria-label="Categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">Todas as categorias</option>
            {["Criativos", "Conteúdos", "Sites"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Ordenação"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigos</option>
            <option value="due">Prazo mais próximo</option>
          </select>
          <button
            className="icon-button export-button"
            aria-label="Exportar serviços filtrados em CSV"
            onClick={() => exportCsv(filtered, timezone)}
          >
            <Download size={18} />
          </button>
        </div>
      </div>
      {filtered.length ? (
        <>
          <TasksTable
            tasks={filtered.slice(0, limit)}
            timezone={timezone}
            open={open}
          />
          <div className="table-footer">
            <span>
              Exibindo {Math.min(limit, filtered.length)} de {filtered.length}{" "}
              serviços
            </span>
            {limit < filtered.length && (
              <Button
                className="secondary"
                onClick={() => setLimit((n) => n + 15)}
              >
                Carregar mais
              </Button>
            )}
          </div>
        </>
      ) : (
        <Empty
          title={
            tasks.length
              ? "Nenhum serviço encontrado"
              : "Tudo pronto para seu primeiro serviço"
          }
          text={
            tasks.length
              ? "Experimente outra busca ou ajuste os filtros."
              : "Cadastre um trabalho e acompanhe cada etapa até a entrega."
          }
          action={
            tasks.length ? (
              <Button
                className="secondary"
                onClick={() => {
                  setFilter("all");
                  setSearch("");
                  setCategory("all");
                }}
              >
                Limpar filtros
              </Button>
            ) : (
              <Button className="primary" onClick={create}>
                <Plus size={17} /> Novo serviço
              </Button>
            )
          }
        />
      )}
    </section>
  );
}

function RevenueChart({ tasks, timezone }) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year").value),
    month = Number(parts.find((p) => p.type === "month").value);
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 6 + i, 15));
    return {
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("pt-BR", {
        month: "short",
        timeZone: "UTC",
      })
        .format(d)
        .replace(".", ""),
      amount: 0,
    };
  });
  tasks
    .filter((t) => t.deliveredAt)
    .forEach((t) => {
      const p = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
      }).formatToParts(new Date(t.deliveredAt));
      const key = `${p.find((a) => a.type === "year").value}-${p.find((a) => a.type === "month").value}`;
      const found = months.find((m) => m.key === key);
      if (found) found.amount += t.service.price;
    });
  const max = Math.max(10000, ...months.map((m) => m.amount)),
    total = months.reduce((n, m) => n + m.amount, 0);
  return (
    <div className="revenue-chart">
      <div className="chart-summary">
        <strong>{money(total)}</strong>
        <span>em entregas no período</span>
      </div>
      <div
        className="chart-plot"
        role="img"
        aria-label={`Entregas por mês: ${months.map((m) => `${m.label}: ${money(m.amount)}`).join("; ")}`}
      >
        <div className="chart-y">
          <span>{money(max)}</span>
          <span>{money(max / 2)}</span>
          <span>R$ 0</span>
        </div>
        <div className="chart-bars">
          <div className="chart-grid">
            <i />
            <i />
            <i />
          </div>
          {months.map((m, i) => (
            <div className="chart-column" key={m.key}>
              <div className="bar-container">
                <div
                  title={`${m.label}: ${money(m.amount)}`}
                  className={`chart-bar ${i === 5 ? "current" : ""}`}
                  style={{
                    height: `${(m.amount / max) * 100}%`,
                    minHeight: m.amount ? "4px" : "2px",
                  }}
                >
                  {m.amount > 0 && <span>{money(m.amount)}</span>}
                </div>
              </div>
              <span>{m.label}</span>
            </div>
          ))}
        </div>
      </div>
      {!total && (
        <p className="chart-footnote">
          Suas entregas vão dar forma a este gráfico.
        </p>
      )}
    </div>
  );
}
function Finance({ tasks, timezone, open }) {
  const [month, setMonth] = useState("all"),
    [payment, setPayment] = useState("all");
  const keyFor = (value) => {
    const p = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
    }).formatToParts(new Date(value));
    return `${p.find((a) => a.type === "year").value}-${p.find((a) => a.type === "month").value}`;
  };
  const delivered = tasks.filter((t) => t.deliveredAt),
    months = [...new Set(delivered.map((t) => keyFor(t.deliveredAt)))]
      .sort()
      .reverse();
  const selected = delivered.filter(
      (t) => month === "all" || keyFor(t.deliveredAt) === month,
    ),
    paid = selected.filter((t) => t.paidAt),
    unpaid = selected.filter((t) => !t.paidAt);
  const rows = selected.filter(
    (t) => payment === "all" || (payment === "paid" ? !!t.paidAt : !t.paidAt),
  );
  return (
    <>
      <div className="finance-toolbar">
        <span>
          <CalendarDays size={16} /> Período de entrega
        </span>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          aria-label="Período financeiro"
        >
          <option value="all">Todo o período</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {new Intl.DateTimeFormat("pt-BR", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(`${m}-15T12:00:00Z`))}
            </option>
          ))}
        </select>
        <Button className="secondary" onClick={() => exportCsv(rows, timezone)}>
          <Download size={16} /> Exportar relatório
        </Button>
      </div>
      <div className="stats-grid finance-stats">
        <StatCard
          label="Valor entregue"
          value={money(selected.reduce((n, t) => n + t.service.price, 0))}
          description={`${selected.length} serviços no período selecionado`}
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          label="Recebido dessas entregas"
          value={money(paid.reduce((n, t) => n + t.service.price, 0))}
          description={`${paid.length} pagamentos confirmados`}
          icon={Wallet}
          color="teal"
        />
        <StatCard
          label="A receber dessas entregas"
          value={money(unpaid.reduce((n, t) => n + t.service.price, 0))}
          description={`${unpaid.length} pagamentos pendentes`}
          icon={Clock3}
          color="amber"
        />
      </div>
      <section className="panel finance-chart">
        <div className="panel-heading">
          <div>
            <h2>Evolução das entregas</h2>
            <p>Valores entregues por mês, independentemente do pagamento.</p>
          </div>
          <span className="subtle-tag">Últimos 6 meses</span>
        </div>
        <RevenueChart tasks={tasks} timezone={timezone} />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Controle de recebimentos</h2>
            <p>Abra uma entrega para registrar o pagamento.</p>
          </div>
          <select
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
            aria-label="Filtrar pagamentos"
          >
            <option value="all">Todos os pagamentos</option>
            <option value="paid">Recebidos</option>
            <option value="unpaid">A receber</option>
          </select>
        </div>
        {rows.length ? (
          <TasksTable tasks={rows} timezone={timezone} open={open} />
        ) : (
          <Empty
            icon={Wallet}
            title="Nenhum recebimento por aqui"
            text="Ao entregar um serviço, ele aparece aqui para você acompanhar o pagamento."
          />
        )}
      </section>
    </>
  );
}

function Catalog({ services, mutate, notify, create }) {
  const [category, setCategory] = useState("all"),
    [edit, setEdit] = useState(null),
    [price, setPrice] = useState(""),
    [hours, setHours] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const openEdit = (service) => {
    setEdit(service);
    setPrice((service.price / 100).toFixed(2));
    setHours(String(service.hours));
    setError("");
  };
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await mutate(
        `/services/${edit.id}`,
        "PATCH",
        {
          price: Math.round(Number(price.replace(",", ".")) * 100),
          hours: Number(hours),
        },
        "Catálogo atualizado. Serviços já criados mantêm os valores originais.",
      );
      setEdit(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="info-callout">
        <span className="icon-outline">
          <FileText size={19} />
        </span>
        <div>
          <strong>Uma base pronta para cada novo trabalho.</strong>
          <p>
            O valor e o prazo são preenchidos ao escolher o serviço. Alterações
            no catálogo valem apenas para novos registros.
          </p>
        </div>
      </div>
      <div className="catalog-filters">
        {[
          ["all", "Todos os serviços"],
          ["Criativos", "Criativos"],
          ["Conteúdos", "Conteúdos"],
          ["Sites", "Sites"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`filter-pill ${category === id ? "active" : ""}`}
            onClick={() => setCategory(id)}
            aria-pressed={category === id}
          >
            {label}
            <span>
              {services.filter((s) => id === "all" || s.category === id).length}
            </span>
          </button>
        ))}
      </div>
      <div className="catalog-grid">
        {services
          .filter((s) => category === "all" || s.category === category)
          .map((service) => (
            <article className="panel catalog-card" key={service.id}>
              <div className="catalog-card-top">
                <ServiceIcon category={service.category} />
                <span className="category-name">{service.category}</span>
                <button
                  className="icon-button"
                  aria-label={`Editar ${service.category}, ${service.name}, ${service.level}`}
                  onClick={() => openEdit(service)}
                >
                  <Pencil size={16} />
                </button>
              </div>
              <h2>{service.name}</h2>
              <span
                className={`level level-${service.level === "Simples" ? "simple" : service.level === "Mediana" ? "medium" : "hard"}`}
              >
                {service.level}
              </span>
              <div className="catalog-value">
                <strong>{money(service.price)}</strong>
                <span>por serviço</span>
              </div>
              <div className="catalog-card-bottom">
                <span>
                  <Clock3 size={15} />
                  {duration(service.hours)} de prazo
                </span>
                <button
                  className="text-button"
                  onClick={() => create(service.id)}
                >
                  Criar serviço <ArrowUpRight size={16} />
                </button>
              </div>
            </article>
          ))}
      </div>
      <div className="catalog-notes">
        <h3>Sobre os prazos e valores</h3>
        <p>
          O prazo começa ao clicar em “Iniciar serviço”. Os dias são corridos: 1
          dia equivale a 24 horas, incluindo fins de semana.
        </p>
        <p>
          Valores da anotação: criativos com vídeo + edição, R$ 50 / R$ 80 (2 /
          4 dias); somente edição, R$ 30 / R$ 50 (1 / 3 dias). Conteúdos com
          vídeo + edição, R$ 40 / R$ 60 (2 / 4 dias); somente edição, R$ 30 / R$
          50 (1 / 3 dias), conforme “mesmo caso”. Todos podem ser ajustados
          acima.
        </p>
      </div>
      {edit && (
        <Modal
          title="Editar serviço do catálogo"
          subtitle={`${edit.category} · ${edit.name} · ${edit.level}`}
          onClose={() => !busy && setEdit(null)}
        >
          <form onSubmit={save} className="modal-form">
            <div className="form-grid">
              <label>
                Valor do serviço (R$)
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
              <label>
                Prazo (horas corridas)
                <input
                  type="number"
                  min="1"
                  max="8760"
                  required
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </label>
            </div>
            <p className="form-help">
              Serviços já registrados preservam o preço e o prazo contratados.
            </p>
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <Button
                type="button"
                className="secondary"
                onClick={() => setEdit(null)}
                disabled={busy}
              >
                Cancelar
              </Button>
              <Button className="primary" busy={busy}>
                <Save size={16} /> Salvar alterações
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function SettingsPanel({ settings, tasks, mutate, notify, refresh }) {
  const [name, setName] = useState(settings.name),
    [contact, setContact] = useState(settings.contact),
    [timezone, setTimezone] = useState(settings.timezone),
    [busy, setBusy] = useState(false),
    [importing, setImporting] = useState(false),
    [error, setError] = useState("");
  const fileRef = useRef(null);
  useEffect(() => {
    setName(settings.name);
    setContact(settings.contact);
    setTimezone(settings.timezone);
  }, [settings.name, settings.contact, settings.timezone]);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await mutate(
        "/settings",
        "PUT",
        { name, contact, timezone },
        "Configurações salvas.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function backup() {
    try {
      const data = await api("/backup");
      download(
        JSON.stringify(data, null, 2),
        "application/json",
        `nexo-backup-${new Date().toISOString().slice(0, 10)}.json`,
      );
      notify("Backup exportado. Guarde o arquivo em um lugar seguro.");
    } catch (e) {
      notify(e.message, true);
    }
  }
  async function restore(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      if (file.size > 12 * 1024 * 1024)
        throw new Error("O backup deve ter no máximo 12 MB.");
      let data;
      try {
        data = JSON.parse(await file.text());
      } catch {
        throw new Error("Não foi possível ler o arquivo JSON.");
      }
      if (data?.format !== "nexo-backup" || !Array.isArray(data.tasks))
        throw new Error("Selecione um backup JSON exportado pelo Nexo.");
      if (
        !window.confirm(
          `Importar backup com ${data.tasks.length} serviços? Registros existentes serão preservados. Em uma instalação vazia, o catálogo e as configurações também serão restaurados.`,
        )
      )
        return;
      const result = await api("/backup", { method: "POST", body: data });
      await refresh();
      notify(
        `${result.imported} serviços importados. ${result.skipped} já existentes foram preservados.`,
      );
    } catch (e) {
      notify(e.message, true);
    } finally {
      setImporting(false);
    }
  }
  return (
    <div className="settings-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Seu cliente</h2>
            <p>Este espaço é dedicado a um único cliente.</p>
          </div>
          <BriefcaseBusiness size={21} className="muted" />
        </div>
        <form className="settings-form" onSubmit={save}>
          <label>
            Nome do cliente
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="Nome da empresa ou cliente"
            />
          </label>
          <label>
            Contato <span className="optional">opcional</span>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              maxLength={200}
              placeholder="E-mail ou telefone"
            />
          </label>
          <label>
            Fuso horário dos registros
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {[
                ["America/Cuiaba", "Cuiabá (MT)"],
                ["America/Sao_Paulo", "Brasília, São Paulo (DF / SP)"],
                ["America/Manaus", "Manaus (AM)"],
                ["America/Rio_Branco", "Rio Branco (AC)"],
                ["America/Noronha", "Fernando de Noronha (PE)"],
                ["Europe/Lisbon", "Lisboa (Portugal)"],
                ["UTC", "UTC"],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
              {![
                "America/Cuiaba",
                "America/Sao_Paulo",
                "America/Manaus",
                "America/Rio_Branco",
                "America/Noronha",
                "Europe/Lisbon",
                "UTC",
              ].includes(timezone) && <option>{timezone}</option>}
            </select>
          </label>
          <p className="form-help">
            As datas usam este fuso horário em todas as telas e relatórios. Os
            prazos são calculados em horas corridas.
          </p>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <Button className="primary" busy={busy}>
            <Save size={16} /> Salvar configurações
          </Button>
        </form>
      </section>
      <div>
        <section className="panel backup-panel">
          <div className="panel-heading">
            <div>
              <h2>Seus dados, com você</h2>
              <p>Faça uma cópia periódica dos seus registros.</p>
            </div>
            <ShieldCheck size={21} className="muted" />
          </div>
          <div className="backup-content">
            <div className="backup-stat">
              <span className="icon-outline">
                <Layers3 size={20} />
              </span>
              <div>
                <strong>{tasks.length} serviços registrados</strong>
                <span>
                  {standalone
                    ? "Dados salvos somente neste navegador"
                    : "Banco de dados salvo no servidor"}
                </span>
              </div>
              <span className="green-dot" />
            </div>
            <p>
              O backup JSON inclui serviços, histórico, catálogo e
              configurações. Ao importar, serviços já existentes são mantidos.
              Em uma instalação vazia, o catálogo e as configurações também são
              restaurados.
            </p>
            <div className="backup-actions">
              <Button className="secondary" onClick={backup}>
                <Download size={16} /> Exportar backup
              </Button>
              <Button
                className="ghost"
                busy={importing}
                onClick={() => fileRef.current.click()}
              >
                <Upload size={16} /> Importar backup
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={restore}
              />
            </div>
            <div className="backup-note">
              <AlertCircle size={16} />
              <span>
                {standalone
                  ? "Os registros ficam neste navegador e não são enviados ao GitHub. Exporte backups antes de limpar os dados do site ou trocar de navegador/dispositivo. Não há sincronização automática."
                  : "Baixe o backup antes de trocar de servidor. Não há sincronização automática entre instalações."}
              </span>
            </div>
          </div>
        </section>
        <section className="about-panel">
          <span className="logo-mark">n</span>
          <div>
            <h3>
              Nexo<span>.</span>
            </h3>
            <p>
              Um espaço para organizar seu trabalho.
              <br />
              Versão 1.0 · Valores em reais (BRL)
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function CreateTask({ services, timezone, initial, onClose, onSubmit }) {
  const initialService = services.find((s) => s.id === initial.serviceId);
  const [category, setCategory] = useState(
      initialService?.category || "Criativos",
    ),
    [serviceId, setServiceId] = useState(initialService?.id || ""),
    [title, setTitle] = useState(""),
    [notes, setNotes] = useState(""),
    [startNow, setStartNow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const service = services.find((s) => s.id === serviceId);
  const dirty = !!(title.trim() || notes.trim() || serviceId);
  const close = () => {
    if (
      !busy &&
      (!dirty || window.confirm("Descartar este serviço ainda não salvo?"))
    )
      onClose();
  };
  async function submit(e) {
    e.preventDefault();
    if (!service) {
      setError("Escolha um serviço para continuar.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit({ title, notes, serviceId, startNow });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Um novo trabalho começa aqui"
      subtitle="Escolha o serviço. A gente cuida dos valores e dos prazos."
      onClose={close}
    >
      <form onSubmit={submit} className="create-form">
        <div className="form-section-label">
          <span>01</span> ESCOLHA O SERVIÇO
        </div>
        <div className="service-tabs" role="group" aria-label="Tipo de serviço">
          {["Criativos", "Conteúdos", "Sites"].map((c) => {
            const Icon = categoryIcon(c);
            return (
              <button
                type="button"
                className={category === c ? "selected" : ""}
                aria-pressed={category === c}
                key={c}
                onClick={() => {
                  setCategory(c);
                  setServiceId("");
                }}
              >
                <Icon size={17} />
                {c}
              </button>
            );
          })}
        </div>
        <div
          className="service-options"
          role="radiogroup"
          aria-label="Serviço e complexidade"
        >
          {services
            .filter((s) => s.category === category)
            .map((s) => (
              <button
                type="button"
                role="radio"
                aria-checked={serviceId === s.id}
                key={s.id}
                className={`service-option ${serviceId === s.id ? "selected" : ""}`}
                onClick={() => setServiceId(s.id)}
              >
                <div>
                  <span className="radio-dot">
                    {serviceId === s.id && <span />}
                  </span>
                  <strong>{s.name}</strong>
                </div>
                <span className="option-level">{s.level}</span>
                <div className="option-bottom">
                  <span>{money(s.price)}</span>
                  <span>
                    <Clock3 size={13} />
                    {duration(s.hours)}
                  </span>
                </div>
              </button>
            ))}
        </div>
        <div className="form-section-label">
          <span>02</span> DETALHES DO TRABALHO
        </div>
        <label>
          Título do serviço
          <input
            required
            maxLength={140}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Criativo para a campanha de novembro"
          />
        </label>
        <label>
          Briefing e observações <span className="optional">opcional</span>
          <textarea
            rows={3}
            maxLength={5000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Referências, orientações do cliente, links e tudo que você precisa lembrar…"
          />
        </label>
        <label className="start-checkbox">
          <input
            type="checkbox"
            checked={startNow}
            onChange={(e) => setStartNow(e.target.checked)}
          />
          <span>
            <strong>Iniciar assim que criar</strong>
            <small>O prazo começa a contar imediatamente.</small>
          </span>
          <Play size={18} />
        </label>
        {service && (
          <div className="service-summary">
            <div>
              <span>VALOR DO SERVIÇO</span>
              <strong>{money(service.price)}</strong>
            </div>
            <div>
              <span>PRAZO DE ENTREGA</span>
              <strong>{duration(service.hours)}</strong>
              <small>
                {startNow
                  ? `Previsão: ${date(new Date(Date.now() + service.hours * 3600000), timezone)}`
                  : "Contado a partir do início"}
              </small>
            </div>
          </div>
        )}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button
            type="button"
            className="secondary"
            onClick={close}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button className="primary" busy={busy}>
            <Plus size={16} />
            {startNow ? "Criar e iniciar serviço" : "Criar serviço"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function TaskDetail({ task, timezone, onClose, mutate, notify }) {
  const [title, setTitle] = useState(task.title),
    [notes, setNotes] = useState(task.notes),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const dirty = title !== task.title || notes !== task.notes;
  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes);
  }, [task.title, task.notes]);
  const close = () => {
    if (
      !busy &&
      (!dirty || window.confirm("Descartar as alterações não salvas?"))
    )
      onClose();
  };
  async function action(value) {
    setBusy(true);
    setError("");
    try {
      await mutate(
        `/tasks/${task.id}/actions`,
        "POST",
        { action: value },
        {
          start: "Serviço iniciado. O prazo já está contando.",
          complete:
            "Trabalho finalizado. Registre a entrega ao cliente quando ela acontecer.",
          deliver: "Entrega registrada com sucesso.",
          pay: "Pagamento registrado.",
          unpay: "Pagamento desmarcado.",
        }[value],
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await mutate(
        `/tasks/${task.id}`,
        "PATCH",
        { title, notes },
        "Anotações salvas.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      !window.confirm(
        `Excluir o serviço “${task.title}”? Essa ação não pode ser desfeita.`,
      )
    )
      return;
    setBusy(true);
    try {
      await mutate(
        `/tasks/${task.id}`,
        "DELETE",
        undefined,
        "Serviço excluído.",
      );
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  const steps = [
    ["Criado", task.createdAt],
    ["Iniciado", task.startedAt],
    ["Finalizado", task.completedAt],
    ["Entregue", task.deliveredAt],
  ];
  const actionMap = {
    pending: ["start", "Iniciar serviço", Play],
    running: ["complete", "Finalizar trabalho", Check],
    completed: ["deliver", "Registrar entrega", CheckCheck],
  };
  const next = actionMap[task.status],
    NextIcon = next?.[2];
  return (
    <Modal
      title="Detalhes do serviço"
      subtitle={`Criado em ${date(task.createdAt, timezone)}`}
      onClose={close}
      drawer
    >
      <div className="detail-body">
        <div className="detail-status">
          <Badge task={task} />
          {task.paidAt && (
            <span className="paid-label">
              <CheckCircle2 size={14} />
              Pagamento recebido
            </span>
          )}
        </div>
        <div className="detail-title">
          <ServiceIcon category={task.service.category} />
          <div>
            <h2>{task.title}</h2>
            <p>
              {task.service.category} · {task.service.name} ·{" "}
              {task.service.level}
            </p>
          </div>
        </div>
        <div className="detail-values">
          <div>
            <span>Valor contratado</span>
            <strong>{money(task.service.price)}</strong>
          </div>
          <div>
            <span>Prazo do serviço</span>
            <strong>{duration(task.service.hours)}</strong>
          </div>
        </div>
        <div
          className={`detail-deadline ${isLate(task) ? "late-deadline" : ""}`}
        >
          <Clock3 size={20} />
          <div>
            <span>Previsão de entrega</span>
            <strong>
              {task.dueAt
                ? date(task.dueAt, timezone)
                : "Definida ao iniciar o serviço"}
            </strong>
            <small>{remaining(task)}</small>
          </div>
        </div>
        <div className="steps">
          {steps.map(([label, value], i) => (
            <div key={label} className={value ? "done" : ""}>
              <span className="step-circle">
                {value ? <Check size={14} /> : <span>{i + 1}</span>}
              </span>
              <strong>{label}</strong>
              <small>{value ? date(value, timezone, false) : "Pendente"}</small>
            </div>
          ))}
        </div>
        {next && (
          <>
            <Button
              className={`primary full detail-action ${task.status === "completed" ? "delivery-button" : ""}`}
              busy={busy}
              onClick={() => action(next[0])}
            >
              <NextIcon size={18} />
              {next[1]}
            </Button>
            <p className="action-help">
              {task.status === "pending"
                ? "O horário de início e a previsão de entrega serão registrados automaticamente."
                : task.status === "running"
                  ? "Registra a conclusão do trabalho. A entrega ao cliente é registrada separadamente."
                  : "Clique depois de enviar o trabalho ao cliente. A data e o horário serão registrados."}
            </p>
          </>
        )}
        {task.status === "delivered" && (
          <div className="payment-box">
            <div>
              <CircleDollarSign size={21} />
              <div>
                <strong>
                  {task.paidAt ? "Pagamento recebido" : "Aguardando pagamento"}
                </strong>
                <small>
                  {task.paidAt
                    ? date(task.paidAt, timezone)
                    : `${money(task.service.price)} a receber do cliente`}
                </small>
              </div>
            </div>
            <Button
              className={task.paidAt ? "ghost" : "secondary"}
              busy={busy}
              onClick={() => {
                if (
                  !task.paidAt ||
                  window.confirm(
                    "Desmarcar este pagamento? O histórico será preservado.",
                  )
                )
                  action(task.paidAt ? "unpay" : "pay");
              }}
            >
              {task.paidAt ? "Desmarcar" : "Recebi o pagamento"}
            </Button>
          </div>
        )}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={save} className="detail-notes">
          <h3>
            <FileText size={17} /> Anotações do trabalho
          </h3>
          <label>
            Título
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
              required
            />
          </label>
          <label>
            Briefing e observações
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={5000}
              placeholder="Adicione observações, links ou detalhes da entrega…"
            />
          </label>
          <Button className="secondary" disabled={!dirty} busy={busy}>
            <Save size={15} /> Salvar anotações
          </Button>
        </form>
        <section className="timeline-section">
          <h3>
            <Clock3 size={17} /> Histórico do serviço
          </h3>
          <p>
            Horários registrados automaticamente ·{" "}
            {timezone.replace("America/", "").replace("_", " ")}
          </p>
          <ol className="timeline">
            {[...task.events].reverse().map((event, i) => (
              <li key={event.id}>
                <span className={`timeline-dot ${i === 0 ? "latest" : ""}`} />
                <strong>{event.label}</strong>
                <time dateTime={event.at}>{date(event.at, timezone)}</time>
              </li>
            ))}
          </ol>
        </section>
        {task.status === "pending" && (
          <button className="delete-button" onClick={remove} disabled={busy}>
            <Trash2 size={15} /> Excluir serviço não iniciado
          </button>
        )}
      </div>
    </Modal>
  );
}

createRoot(document.getElementById("root")).render(<App />);

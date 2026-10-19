import { resolve } from "node:path";
import { openStore } from "./store.js";
import { createApp } from "./app.js";

const store = openStore(
  process.env.DATA_FILE || resolve(import.meta.dirname, "../data/nexo.sqlite"),
);
const port = Number(process.env.PORT || 3001);
const server = createApp(store).listen(port, "0.0.0.0", () =>
  console.log(`Nexo disponível na porta ${port}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(() => {
      store.close();
      process.exit(0);
    }),
  );

import React from "react";
import { createRoot } from "react-dom/client";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { App } from "./App";
import { createIndexedDbPersister } from "./query/indexedDbPersister";
import { queryClient } from "./query/queryClient";
import "./styles.css";

const sevenDays = 7 * 24 * 60 * 60 * 1000;
const persister = createIndexedDbPersister();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        buster: "world-cup-board-v1",
        maxAge: sevenDays,
        persister,
      }}
    >
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>,
);

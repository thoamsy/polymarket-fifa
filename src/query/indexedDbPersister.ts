import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

const DB_NAME = "polymarket-fifa-query-cache";
const STORE_NAME = "query-cache";
const CACHE_KEY = "world-cup-board-v1";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!("indexedDB" in globalThis)) {
      reject(new Error("IndexedDB is not available."));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open IndexedDB."));
  });
}

async function withStore<T>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = callback(transaction.objectStore(STORE_NAME));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    };
  });
}

export function createIndexedDbPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await withStore("readwrite", (store) => store.put(client, CACHE_KEY));
    },
    restoreClient: async () => {
      return withStore<PersistedClient | undefined>("readonly", (store) => store.get(CACHE_KEY));
    },
    removeClient: async () => {
      await withStore("readwrite", (store) => store.delete(CACHE_KEY));
    },
  };
}

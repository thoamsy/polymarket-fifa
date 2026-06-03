import { QueryClient } from "@tanstack/react-query";

const sevenDays = 7 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: sevenDays,
      networkMode: "offlineFirst",
      retry: 1,
      staleTime: 60 * 1000,
    },
  },
});

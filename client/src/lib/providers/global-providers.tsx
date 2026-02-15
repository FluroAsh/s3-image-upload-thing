"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { NuqsAdapter } from "nuqs/adapters/next/app";

type GlobalProvidersProps = {
  children: React.ReactNode;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
    },
  },
});

export const GlobalProviders = ({ children }: GlobalProvidersProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        {process.env.NODE_ENV !== "production" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
        {children}
      </NuqsAdapter>
    </QueryClientProvider>
  );
};

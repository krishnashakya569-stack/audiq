"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ThemeProvider } from "@/features/settings/ThemeProvider";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const [client] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

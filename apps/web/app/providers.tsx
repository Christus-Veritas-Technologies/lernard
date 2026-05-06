"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { Toaster } from "sonner";

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: 1,
                        staleTime: 30_000,
                    },
                    mutations: {
                        retry: 0,
                    },
                },
            }),
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <Toaster
                closeButton
                position="top-right"
                richColors
                toastOptions={{
                    classNames: {
                        toast: "rounded-3xl border border-border bg-surface text-text-primary shadow-[0_20px_60px_-28px_rgba(30,42,84,0.35)]",
                        title: "text-sm font-semibold",
                        description: "text-sm text-text-secondary",
                        actionButton:
                            "rounded-full bg-primary-500 px-3 py-2 text-sm font-semibold text-white",
                        cancelButton:
                            "rounded-full border border-border bg-background px-3 py-2 text-sm font-semibold text-text-primary",
                    },
                }}
            />
        </QueryClientProvider>
    );
}